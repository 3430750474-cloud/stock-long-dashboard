'use strict';

const CORS = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type'
};

const cache = new Map();
function cacheGet(key, ttl){
  const c = cache.get(key);
  if(c && Date.now()-c.t < ttl) return c.v;
  return null;
}
function cacheSet(key, v, ttl){
  cache.set(key, { t:Date.now(), v });
  if(cache.size > 4000){
    for(const [k,c] of cache){
      if(Date.now()-c.t > 15*60*1000) cache.delete(k);
    }
  }
}

function respond(data, status){
  status = status || 200;
  return {
    statusCode:status,
    headers:Object.assign({
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store'
    }, CORS),
    body:JSON.stringify(data)
  };
}

async function get(url, headers, timeout){
  timeout = timeout || 12000;
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeout);
  try{
    const u = new URL(url);
    const r = await fetch(url, {
      headers:Object.assign({
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':'*/*',
        'Referer':u.origin+'/'
      }, headers||{}),
      signal:controller.signal
    });
    const body = await r.arrayBuffer();
    return { status:r.status, body };
  }finally{
    clearTimeout(timer);
  }
}

async function runConcurrent(items, limit, fn){
  const out = new Array(items.length);
  let idx = 0;
  async function worker(){
    while(idx < items.length){
      const cur = idx++;
      out[cur] = await fn(items[cur]);
    }
  }
  const workers = [];
  const n = Math.min(limit, items.length);
  for(let i=0;i<n;i++) workers.push(worker());
  await Promise.all(workers);
  return out;
}

function symOf(code){
  return (code.startsWith('6')||code.startsWith('68')||code.startsWith('90')) ? 'sh' : 'sz';
}

function parseTx(s){
  if(!s) return null;
  const a = s.split('~');
  return {
    name:a[1], code:a[2], price:+a[3], prev:+a[4], open:+a[5], volume:+a[6],
    change:+a[31], pct:+a[32], high:+a[33], low:+a[34], amount_wan:+a[37],
    turnover:+a[38], pe:+a[39], float_cap_yi:+a[44], total_cap_yi:+a[45], pb:+a[46], vol_ratio:+a[49]
  };
}

async function fetchPool(mode){
  const key = 'pool:'+mode;
  const cached = cacheGet(key, 5*60*1000);
  if(cached) return cached;
  const out = [];
  const pages = [1,2,3,4,5,6,7,8];
  const rows = await runConcurrent(pages, 4, async page=>{
    const url = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page='+page+'&num=80&sort=amount&asc=0&node=hs_a&symbol=&_s_r_a=page';
    try{
      const r = await get(url, {}, 8000);
      if(r.status!==200) return [];
      return JSON.parse(new TextDecoder().decode(r.body)) || [];
    }catch(e){ return []; }
  });
  rows.forEach(arr=>{
    if(!Array.isArray(arr)) return;
    arr.forEach(x=>{
      const price = +x.trade;
      if(!x.code || !price || /ST|退/.test(x.name||'')) return;
      if(price > 100) return;
      out.push({ code:x.code, name:x.name, price, amount:x.amount||0 });
    });
  });
  const seen = new Set();
  const res = out.filter(s=>{
    if(seen.has(s.code)) return false;
    seen.add(s.code);
    return true;
  }).sort((a,b)=>(b.amount||0)-(a.amount||0)).slice(0, 80);
  cacheSet(key, res, 5*60*1000);
  return res;
}

async function fetchQuotes(syms){
  if(!syms.length) return {};
  const key = 'quote:'+[...new Set(syms)].sort().join(',');
  const cached = cacheGet(key, 10*1000);
  if(cached) return cached;
  const url = 'https://qt.gtimg.cn/q='+syms.join(',')+'&_='+Date.now();
  const out = {};
  try{
    const r = await get(url, {}, 10000);
    if(r.status===200){
      const text = new TextDecoder('gbk').decode(r.body);
      const re = /v_([^=]+)="([^"]*)"/g;
      let m;
      while((m=re.exec(text))){
        const q = parseTx(m[2]);
        if(q) out[m[1]] = q;
      }
    }
  }catch(e){}
  cacheSet(key, out, 10*1000);
  return out;
}

async function fetchKline(code){
  const key = 'kline:'+code;
  const cached = cacheGet(key, 10*60*1000);
  if(cached) return cached;
  const sym = symOf(code);
  try{
    const url = 'https://ifzq.gtimg.cn/appstock/app/fqkline/get?param='+sym+code+',day,,,120,qfq';
    const r = await get(url, { Referer:'https://gu.qq.com/' }, 10000);
    if(r.status===200){
      const data = JSON.parse(new TextDecoder().decode(r.body));
      const d = (((data||{}).data||{})[sym+code])||{};
      const raw = d['qfqday'] || d['day'] || [];
      if(raw.length){
        const rows = raw.map(x=>({ date:x[0], open:+x[1], close:+x[2], high:+x[3], low:+x[4], volume:+x[5] }));
        cacheSet(key, rows, 10*60*1000);
        return rows;
      }
    }
  }catch(e){}
  try{
    const url = 'https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol='+sym+code+'&scale=240&ma=no&datalen=120';
    const r = await get(url, {}, 10000);
    if(r.status===200){
      const arr = JSON.parse(new TextDecoder().decode(r.body));
      if(Array.isArray(arr) && arr.length){
        const rows = arr.map(x=>({ date:x.day, open:+x.open, close:+x.close, high:+x.high, low:+x.low, volume:+x.volume/100 }));
        cacheSet(key, rows, 10*60*1000);
        return rows;
      }
    }
  }catch(e){}
  return [];
}

async function fetchQuality(code){
  const key = 'quality:'+code;
  const cached = cacheGet(key, 2*60*60*1000);
  if(cached) return cached;
  const scode = code.startsWith('6') ? code+'.SH' : code+'.SZ';
  const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECUCODE%3D%22'+scode+'%22)&pageNumber=1&pageSize=2&sortTypes=-1&sortColumns=REPORT_DATE';
  try{
    const r = await get(url, {}, 10000);
    if(r.status===200){
      const data = JSON.parse(new TextDecoder().decode(r.body));
      const rows = (((data||{}).result||{}).data)||[];
      const it = rows[0]||{};
      const out = { ok:!!it.PARENTNETPROFIT, profit:it.PARENTNETPROFIT, roe:it.ROEJQ, debt:it.ZCFZL, profitGrowth:it.PARENTNETPROFITTZ, revGrowth:it.TOTALOPERATEREVETZ };
      cacheSet(key, out, 2*60*60*1000);
      return out;
    }
  }catch(e){}
  return { ok:false };
}

async function fetchSearch(q){
  const key = 'search:'+q.toLowerCase();
  const cached = cacheGet(key, 60*1000);
  if(cached) return cached;
  const url = 'https://searchapi.eastmoney.com/api/suggest/get?input='+encodeURIComponent(q)+'&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10';
  const out = [];
  try{
    const r = await get(url, {}, 8000);
    if(r.status===200){
      const data = JSON.parse(new TextDecoder().decode(r.body));
      const rows = (((data||{}).QuotationCodeTable||{}).Data)||[];
      rows.forEach(x=>{
        const code = String(x.Code||'');
        const name = String(x.Name||'');
        const type = String(x.SecurityTypeName||x.SecurityType||'');
        if(!code || !name || !/^\d{6}$/.test(code)) return;
        if(/指数|基金|债券|期货|港股|美股/.test(type)) return;
        const mkt = String(x.MktNum||'');
        out.push({ code, name, market:mkt==='1'?'sh':(mkt==='0'?'sz':symOf(code)) });
      });
    }
  }catch(e){}
  if(!out.length && /^\d{6}$/.test(q)) out.push({ code:q, name:'', market:symOf(q) });
  const res = out.slice(0, 8);
  cacheSet(key, res, 60*1000);
  return res;
}

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS'){
    return { statusCode:204, headers:CORS, body:'' };
  }
  const url = new URL(event.rawUrl);
  let p = url.pathname.replace(/^\/\.netlify\/functions/, '');
  if(!p.startsWith('/')) p = '/' + p;
  try{
    if(p==='/api/pool'){
      const mode = url.searchParams.get('mode') || 'lt100';
      return respond(await fetchPool(mode));
    }
    if(p==='/api/quote'){
      const codes = (url.searchParams.get('codes')||'').split(',').filter(Boolean);
      return respond(await fetchQuotes(codes));
    }
    if(p==='/api/kline'){
      const code = url.searchParams.get('code') || '';
      if(!/^\d{6}$/.test(code)) return respond({ error:'bad code' }, 400);
      return respond(await fetchKline(code));
    }
    if(p==='/api/klineBatch'){
      const codes = (url.searchParams.get('codes')||'').split(',').filter(c=>/^\d{6}$/.test(c)).slice(0,12);
      const out = {};
      await runConcurrent(codes, 5, async code=>{ out[code] = await fetchKline(code); });
      return respond(out);
    }
    if(p==='/api/quality'){
      const code = url.searchParams.get('code') || '';
      if(!/^\d{6}$/.test(code)) return respond({ error:'bad code' }, 400);
      return respond(await fetchQuality(code));
    }
    if(p==='/api/qualityBatch'){
      const codes = (url.searchParams.get('codes')||'').split(',').filter(c=>/^\d{6}$/.test(c)).slice(0,12);
      const out = {};
      await runConcurrent(codes, 5, async code=>{ out[code] = await fetchQuality(code); });
      return respond(out);
    }
    if(p==='/api/search'){
      const q = (url.searchParams.get('q')||'').trim().slice(0,20);
      return respond(await fetchSearch(q));
    }
    return respond({ error:'not found' }, 404);
  }catch(e){
    return respond({ error:e.message }, 500);
  }
};
