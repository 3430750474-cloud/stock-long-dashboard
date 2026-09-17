const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'short', 'data');
const LIMIT = 160;
const KLINES = 140;

function get(url, timeout){
  return fetch(url, { signal: AbortSignal.timeout(timeout || 15000) });
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
  await Promise.all(Array.from({length:Math.min(limit, items.length)}, worker));
  return out;
}

function dedupe(list){
  const seen = new Set();
  return list.filter(x=>{
    if(seen.has(x.code)) return false;
    seen.add(x.code);
    return true;
  }).sort((a,b)=>(b.amount||0)-(a.amount||0));
}

async function fetchEastmoneyPool(){
  const rows = await runConcurrent([1,2,3,4,5,6], 4, async pn=>{
    const url = 'https://push2.eastmoney.com/api/qt/clist/get?pn='+pn+'&pz=100&po=1&np=1&fltt=2&invt=2&fid=f6'+
      '&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048'+
      '&fields=f2,f3,f5,f6,f12,f14&ut=bd1d9ddb04089700cf9c27f6f7426281';
    try{
      const r = await get(url, 12000);
      if(!r.ok) return [];
      const d = await r.json();
      return (((d||{}).data||{}).diff) || [];
    }catch(e){ return []; }
  });
  const out = [];
  rows.flat().forEach(x=>{
    const code = String(x.f12||'');
    const name = String(x.f14||'');
    const price = +x.f2;
    if(!/^\d{6}$/.test(code) || !price || /ST|退/.test(name)) return;
    out.push({ code, name, price, amount:+x.f6||0 });
  });
  return dedupe(out);
}

async function fetchSinaPool(){
  const rows = await runConcurrent([1,2,3,4,5,6,7,8], 4, async page=>{
    const url = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page='+page+'&num=80&sort=amount&asc=0&node=hs_a&symbol=&_s_r_a=page';
    try{
      const r = await get(url, 12000);
      if(!r.ok) return [];
      return await r.json();
    }catch(e){ return []; }
  });
  const out = [];
  rows.flat().forEach(x=>{
    const price = +x.trade || +x.settlement;
    if(!x.code || !price || /ST|退/.test(x.name||'')) return;
    out.push({ code:x.code, name:x.name, price, amount:+x.amount||0 });
  });
  return dedupe(out);
}

function buildModes(pool){
  return {
    updated:new Date().toISOString(),
    lt100:pool.filter(x=>x.price<=100).slice(0,LIMIT),
    lt10:pool.filter(x=>x.price<=10).slice(0,LIMIT),
    all:pool.slice(0,LIMIT)
  };
}

function symOf(code){
  return (code.startsWith('6')||code.startsWith('68')||code.startsWith('90')) ? 'sh' : 'sz';
}

async function fetchKline(code){
  const sym = symOf(code);
  try{
    const url = 'https://ifzq.gtimg.cn/appstock/app/fqkline/get?param='+sym+code+',day,,,'+KLINES+',qfq';
    const r = await get(url, 12000);
    if(r.ok){
      const data = await r.json();
      const d = (((data||{}).data||{})[sym+code]) || {};
      const raw = d.qfqday || d.day || [];
      if(raw.length) return raw.map(x=>[x[0],+x[1],+x[2],+x[3],+x[4],+x[5]]);
    }
  }catch(e){}
  try{
    const url = 'https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol='+sym+code+'&scale=240&ma=no&datalen='+KLINES;
    const r = await get(url, 12000);
    if(r.ok){
      const arr = await r.json();
      if(Array.isArray(arr) && arr.length) return arr.map(x=>[x.day,+x.open,+x.close,+x.high,+x.low,+x.volume/100]);
    }
  }catch(e){}
  return [];
}

async function main(){
  console.log('fetch pool...');
  let pool = await fetchEastmoneyPool();
  if(pool.length < 80) pool = await fetchSinaPool();
  if(pool.length < 80) throw new Error('候选池获取失败');
  const modes = buildModes(pool);
  const codes = [...new Set([...modes.lt100,...modes.lt10,...modes.all].map(x=>x.code))].slice(0,320);
  console.log('pool', pool.length, 'codes', codes.length);
  console.log('fetch klines...');
  const rows = await runConcurrent(codes, 20, fetchKline);
  const klines = {};
  codes.forEach((code,i)=>{ if(rows[i] && rows[i].length) klines[code]=rows[i]; });
  console.log('klines', Object.keys(klines).length, '/', codes.length);
  const valid = new Set(Object.entries(klines).filter(([,v])=>v.length>=30).map(([code])=>code));
  const filteredModes = {
    updated:modes.updated,
    lt100:modes.lt100.filter(x=>valid.has(x.code)),
    lt10:modes.lt10.filter(x=>valid.has(x.code)),
    all:modes.all.filter(x=>valid.has(x.code))
  };
  fs.mkdirSync(OUT_DIR, { recursive:true });
  fs.writeFileSync(path.join(OUT_DIR,'pool.json'), JSON.stringify(filteredModes));
  fs.writeFileSync(path.join(OUT_DIR,'klines.json'), JSON.stringify({ updated:new Date().toISOString(), rows:klines }));
  console.log('written', OUT_DIR);
}

main().catch(e=>{ console.error('FATAL', e.message); process.exit(1); });
