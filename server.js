'use strict';
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8745);
const MIME = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png'
};

function get(url, headers, timeout){
  timeout = timeout || 12000;
  return new Promise((resolve,reject)=>{
    let u;
    try{ u = new URL(url); }catch(e){ return reject(e); }
    const lib = u.protocol==='https:' ? https : http;
    const req = lib.get(u, {
      headers: Object.assign({
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':'*/*',
        'Referer': u.protocol+'//'+u.host+'/'
      }, headers||{}),
      timeout
    }, res=>{
      const chunks=[];
      res.on('data', c=>chunks.push(c));
      res.on('end', ()=>resolve({ status:res.statusCode, headers:res.headers, body:Buffer.concat(chunks) }));
    });
    req.on('timeout', ()=>{ req.destroy(new Error('timeout')); });
    req.on('error', reject);
  });
}

const cache = new Map();
function cacheGet(key, ttl){
  const c = cache.get(key);
  if(c && Date.now()-c.t < ttl) return c.v;
  return null;
}
function cacheSet(key, v){
  cache.set(key, { t:Date.now(), v });
  if(cache.size>3000){
    for(const [k,c] of cache){
      if(Date.now()-c.t>15*60*1000) cache.delete(k);
    }
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

function isTradingNow(){
  const d = new Date();
  if(d.getDay()===0 || d.getDay()===6) return false;
  const m = d.getHours()*60 + d.getMinutes();
  return (m>=540 && m<=720) || (m>=780 && m<=930);
}

function symOf(code){
  return (code.startsWith('6')||code.startsWith('68')||code.startsWith('90')) ? 'sh' : 'sz';
}

async function fetchPool(mode){
  const key = 'pool:'+mode;
  const cached = cacheGet(key, 300000);
  if(cached) return cached;
  if(mode==='lt100'){
    const fast = await fetchEastmoneyPool(100, 220);
    if(fast.length){
      cacheSet(key, fast);
      return fast;
    }
  }
  const out = [];
  const num = 80;
  const maxPages = mode==='lt10' ? 24 : (mode==='lt100' ? 60 : 12);
  const sort = (mode==='lt10'||mode==='lt100') ? 'trade' : 'amount';
  const asc = (mode==='lt10'||mode==='lt100') ? 1 : 0;
  const maxPrice = mode==='lt100' ? 100 : (mode==='lt10' ? 10 : Infinity);
  async function getPage(page){
    const url = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page='+page+'&num='+num+'&sort='+sort+'&asc='+asc+'&node=hs_a&symbol=&_s_r_a=page';
    try{
      const r = await get(url, {}, 5000);
      if(r.status!==200) return [];
      const arr = JSON.parse(r.body.toString('utf8'));
      return Array.isArray(arr) ? arr : [];
    }catch(e){ return []; }
  }
  for(let start=1; start<=maxPages; start+=12){
    const batch=[];
    for(let page=start; page<Math.min(start+12, maxPages+1); page++) batch.push(getPage(page));
    const pages = await Promise.all(batch);
    let emptyCount = 0;
    pages.forEach(arr=>{
      if(!arr.length){ emptyCount++; return; }
      arr.forEach(x=>{
        const price = +x.trade;
        if(!x.code || !price || /ST|退/.test(x.name||'')) return;
        if(price>=maxPrice) return;
        out.push({ code:x.code, name:x.name, price, amount:x.amount||0 });
      });
    });
    if(emptyCount>=3) break;
  }
  const seen = new Set();
  const uniq = out.filter(s=>{
    if(seen.has(s.code)) return false;
    seen.add(s.code);
    return true;
  });
  const res = uniq.sort((a,b)=>(b.amount||0)-(a.amount||0)).slice(0,160);
  cacheSet(key,res);
  return res;
}

async function fetchEastmoneyPool(maxPrice, limit){
  const out = [];
  const pz = 100;
  const pages = 9;
  for(let pn=1; pn<=pages; pn++){
    const url = 'https://push2.eastmoney.com/api/qt/clist/get?pn='+pn+'&pz='+pz+'&po=1&np=1&fltt=2&invt=2&fid=f6'+
      '&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048'+
      '&fields=f2,f3,f5,f6,f12,f14&ut=bd1d9ddb04089700cf9c27f6f7426281';
    let arr = [];
    try{
      const r = await get(url, { Referer:'https://quote.eastmoney.com/' }, 6000);
      if(r.status!==200) break;
      const data = JSON.parse(r.body.toString('utf8'));
      arr = (((data||{}).data||{}).diff) || [];
    }catch(e){ break; }
    if(!arr.length) break;
    arr.forEach(x=>{
      const price = +x.f2;
      const code = String(x.f12||'');
      const name = String(x.f14||'');
      if(!code || !price || /ST|退/.test(name)) return;
      if(price > maxPrice) return;
      out.push({ code, name, price, amount:+x.f6||0, pct:+x.f3||0 });
    });
    if(out.length >= limit*3) break;
  }
  const seen = new Set();
  return out.filter(s=>{
    if(seen.has(s.code)) return false;
    seen.add(s.code);
    return true;
  }).sort((a,b)=>(b.amount||0)-(a.amount||0)).slice(0, limit);
}

async function fetchSearch(q){
  const key = 'search:'+q.toLowerCase();
  const cached = cacheGet(key, 60000);
  if(cached) return cached;
  const out = [];
  try{
    const url = 'https://searchapi.eastmoney.com/api/suggest/get?input='+encodeURIComponent(q)+'&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10';
    const r = await get(url, { Referer:'https://quote.eastmoney.com/' }, 6000);
    if(r.status===200){
      const data = JSON.parse(r.body.toString('utf8'));
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
  if(!out.length && /^\d{6}$/.test(q)){
    out.push({ code:q, name:'', market:symOf(q) });
  }
  cacheSet(key, out.slice(0, 8));
  return out.slice(0, 8);
}

async function fetchKline(code){
  const key = 'kline:'+code;
  const cached = cacheGet(key, isTradingNow() ? 120000 : 15*60*1000);
  if(cached) return cached;
  const sym = symOf(code);
  try{
    const url = 'https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol='+sym+code+'&scale=240&ma=no&datalen=160';
    const r = await get(url);
    if(r.status===200){
      const arr = JSON.parse(r.body.toString('utf8'));
      if(arr && arr.length){
        const rows = arr.map(x=>({ date:x.day, open:+x.open, close:+x.close, high:+x.high, low:+x.low, volume:+x.volume/100 }));
        cacheSet(key,rows);
        return rows;
      }
    }
  }catch(e){}
  try{
    const url = 'https://ifzq.gtimg.cn/appstock/app/fqkline/get?param='+sym+code+',day,,,160,qfq';
    const r = await get(url, { Referer:'https://gu.qq.com/' });
    if(r.status===200){
      const data = JSON.parse(r.body.toString('utf8'));
      const d = (((data||{}).data||{})[sym+code])||{};
      const raw = d['qfqday'] || d['day'] || [];
      if(raw.length){
        const rows = raw.map(x=>({ date:x[0], open:+x[1], close:+x[2], high:+x[3], low:+x[4], volume:+x[5] }));
        cacheSet(key,rows);
        return rows;
      }
    }
  }catch(e){}
  return [];
}

async function fetchQuotes(syms){
  const key = 'quote:'+syms.join(',');
  const cached = cacheGet(key, 10000);
  if(cached) return cached;
  const url = 'https://qt.gtimg.cn/q='+syms.join(',')+'&_='+Date.now();
  const out = {};
  try{
    const r = await get(url, { Referer:'https://gu.qq.com/' });
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
  cacheSet(key,out);
  return out;
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

async function fetchQuality(code){
  const key = 'qual:'+code;
  const cached = cacheGet(key, 2*60*60*1000);
  if(cached) return cached;
  const scode = code.startsWith('6') ? code+'.SH' : code+'.SZ';
  const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECUCODE%3D%22'+scode+'%22)&pageNumber=1&pageSize=2&sortTypes=-1&sortColumns=REPORT_DATE';
  try{
    const r = await get(url);
    if(r.status===200){
      const data = JSON.parse(r.body.toString('utf8'));
      const rows = (((data||{}).result||{}).data)||[];
      const it = rows[0]||{};
      const d = { ok:!!it.PARENTNETPROFIT, profit:it.PARENTNETPROFIT, roe:it.ROEJQ, debt:it.ZCFZL, profitGrowth:it.PARENTNETPROFITTZ, revGrowth:it.TOTALOPERATEREVETZ };
      cacheSet(key,d);
      return d;
    }
  }catch(e){}
  return { ok:false };
}

function sendJson(res, obj, status){
  status = status || 200;
  res.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'Access-Control-Allow-Origin':'*'
  });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req,res)=>{
  try{
    const u = new URL(req.url, 'http://localhost:'+PORT);
    const p = u.pathname;
    if(p.startsWith('/api/')){
      if(p==='/api/pool'){
        const mode = u.searchParams.get('mode') || 'lt10';
        sendJson(res, await fetchPool(mode));
        return;
      }
      if(p==='/api/search'){
        const q = (u.searchParams.get('q')||'').trim().slice(0,20);
        sendJson(res, await fetchSearch(q));
        return;
      }
      if(p==='/api/kline'){
        const code = u.searchParams.get('code') || '';
        if(!/^\d{6}$/.test(code)){ sendJson(res, { error:'bad code' }, 400); return; }
        sendJson(res, await fetchKline(code));
        return;
      }
      if(p==='/api/klineBatch'){
        const codes = (u.searchParams.get('codes')||'').split(',').filter(c=>/^\d{6}$/.test(c)).slice(0,300);
        const out = {};
        await runConcurrent(codes, 10, async code=>{
          out[code] = await fetchKline(code);
        });
        sendJson(res, out);
        return;
      }
      if(p==='/api/quote'){
        const codes = (u.searchParams.get('codes')||'').split(',').filter(Boolean);
        sendJson(res, await fetchQuotes(codes));
        return;
      }
      if(p==='/api/quality'){
        const code = u.searchParams.get('code') || '';
        if(!/^\d{6}$/.test(code)){ sendJson(res, { error:'bad code' }, 400); return; }
        sendJson(res, await fetchQuality(code));
        return;
      }
      if(p==='/api/qualityBatch'){
        const codes = (u.searchParams.get('codes')||'').split(',').filter(c=>/^\d{6}$/.test(c)).slice(0,300);
        const out = {};
        await runConcurrent(codes, 8, async code=>{
          out[code] = await fetchQuality(code);
        });
        sendJson(res, out);
        return;
      }
      sendJson(res, { error:'not found' }, 404);
      return;
    }
    let file;
    if(p==='/' || p==='/index.html') file = '实时短线选股看板.html';
    else if(p==='/long' || p==='/long/') file = '中长期量化看板.html';
    else file = decodeURIComponent(p.slice(1));
    const fp = path.resolve(ROOT, file);
    if(fp !== ROOT && !fp.startsWith(ROOT + path.sep)){
      res.writeHead(403, { 'Content-Type':'text/plain; charset=utf-8' });
      res.end('forbidden');
      return;
    }
    fs.readFile(fp, (err, data)=>{
      if(err){
        res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' });
        res.end('not found');
        return;
      }
      const ext = path.extname(fp).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  }catch(e){
    sendJson(res, { error:e.message }, 500);
  }
});

server.listen(PORT, ()=>{
  console.log('实时短线选股看板: http://localhost:'+PORT);
});
