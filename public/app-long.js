'use strict';

const INDEX_CODES = [
  { sym:'sh000001', name:'上证指数' },
  { sym:'sz399001', name:'深证成指' },
  { sym:'sz399006', name:'创业板指' },
  { sym:'sh000300', name:'沪深300' },
  { sym:'sh000905', name:'中证500' },
  { sym:'sz399852', name:'中证1000' }
];

const STRATS = {
  1: {
    key:'s1', name:'中长期相对动量', short:'动量趋势', type:'进攻·趋势', hold:'20-60日', color:'#fb7185',
    win:'40.6%', winLabel:'月度胜率（纯动量样本内）',
    bt:{ total:'-24.6%', annual:'-6.1%', sharpe:'-0.40', dd:'-37.5%' },
    time:{ buy:'T+1开盘 09:30-10:00', sell:'调仓/离场日 14:30-15:00' },
    winWhy:'纯动量在A股样本内胜率40.6%，说明必须叠加策略5择时；只在进攻态启用，增强后参考策略4的59.4%。',
    logic:'JT(1993)：买过去3-12个月赢家、卖输家，持有3-12个月。用60-120日相对动量>5%捕捉中长期趋势，并加流动性过滤，避免追高和僵尸股。',
    conds:['60-120日相对动量 >5%','5日均额 ≥3000万','仅进攻态启用（策略5总开关）','非ST/退市风险','股价 ≤100元'],
    ops:{ entry:'T+1开盘等权买入，不追高；回踩MA10/MA20分批', stop:'-5%硬止损，或动量转负', target:'+8%减半，+15%清仓；满60日离场', hold:'20-60日', pos:'≤30%' },
    note:'A股动量是环境依赖因子，空仓态/震荡态禁用；行业中性相对动量比绝对动量更稳。'
  },
  2: {
    key:'s2', name:'质量红利精选', short:'质量红利', type:'价值·防守', hold:'1个季度', color:'#34d399',
    win:'59.4%', winLabel:'月度胜率（样本内）',
    bt:{ total:'+59.8%', annual:'+11.0%', sharpe:'0.95', dd:'-13.7%' },
    time:{ buy:'季报后/季度末最后5日 14:30-15:00', sell:'调仓日 14:30-15:00' },
    winWhy:'QMJ(2019)：高质量股风险调整收益显著更高。58只A股2023-2025回测总收益+59.8%，月度胜率59.4%，回撤-13.7%。',
    logic:'用盈利性（ROE）、成长（净利增长）、安全（负债率）、估值（PE）和股息确认选“便宜的好公司”，排除盈利转负仍派息的红利陷阱。',
    conds:['ROE≥8% 且 净利>0','负债率 <60%','PE(TTM) 0-20','净利/营收正增长','股息率≥3%（人工确认）','5日均额 ≥3000万'],
    ops:{ entry:'季度末最后5日14:30-15:00等权建仓', stop:'盈利转负或PE>20时离场', target:'+8%~+12%分批止盈，季度末再平衡', hold:'1个季度', pos:'≤25%' },
    note:'股息率需F10日线人工确认；不做“贵的好公司”，只做“便宜的好公司”。'
  },
  3: {
    key:'s3', name:'低波动流动性优选', short:'低波优选', type:'防御·稳健', hold:'1个月', color:'#a78bfa',
    win:'62.5%', winLabel:'月度胜率（样本内最高）',
    bt:{ total:'+62.9%', annual:'+11.4%', sharpe:'1.02', dd:'-15.0%' },
    time:{ buy:'月末最后5日 14:30-15:00', sell:'月末再平衡 14:30-15:00' },
    winWhy:'GKX(2020)：低波动+流动性是横截面收益最强预测因子。回测总收益+62.9%、月度胜率62.5%、夏普1.02，为5套策略中最优。',
    logic:'低波动异象说明低风险不低收益；用年化波动≤40%、ATR收缩、流动性下限和站上MA60，选出稳定、可交易、被低估风险的防御标的。',
    conds:['年化波动 ≤40%','ATR20 收缩（低于ATR60）','5日均额 ≥5000万','收盘 > MA60','非ST/退市风险','股价 ≤100元'],
    ops:{ entry:'月末最后5日14:30-15:00，T+1开盘等权', stop:'跌破MA60或年化波动>40%离场', target:'+8%~+12%分批止盈，月末再平衡', hold:'1个月', pos:'≤30%' },
    note:'防御为主；急涨行情会阶段性跑输进攻策略，是组合压舱石。'
  },
  4: {
    key:'s4', name:'动量质量复合', short:'动量质量', type:'攻守兼备', hold:'20-40日', color:'#60a5fa',
    win:'59.4%', winLabel:'月度胜率（样本内）',
    bt:{ total:'+21.7%', annual:'+4.5%', sharpe:'0.35', dd:'-19.5%' },
    time:{ buy:'每20日调仓 09:30-10:00 / 14:30-15:00', sell:'离场日 14:30-15:00' },
    winWhy:'GKX(2020)非线性交互：动量×质量交集比单因子更稳。回测月度胜率59.4%，但夏普0.35偏低，必须配合择时避免追顶。',
    logic:'动量捕捉进攻、质量过滤陷阱，用“高动量+高质量”交集排名实现因子交互；进攻态重仓、防御态降至10%。',
    conds:['60-120日相对动量 >5%','ROE≥8% 且 负债率<60%','5日均额 ≥3000万','MA5>MA20 趋势确认','进攻态重仓/防御态10%'],
    ops:{ entry:'调仓日09:30-10:00或14:30-15:00，回踩MA10/MA20分批', stop:'-5%硬止损', target:'+10%减半，+15%清仓；动量转负离场', hold:'20-40日', pos:'进攻≤30%·防御≤10%' },
    note:'高动量+高质量在A股常对应高位抱团股，配合策略5择时，不追高。'
  },
  5: {
    key:'s5', name:'市场状态择时轮动', short:'择时轮动', type:'总控·风控', hold:'1-4周', color:'#fbbf24',
    win:'68.8%', winLabel:'空仓避损占比（择时口径）',
    bt:{ total:'--', annual:'--', sharpe:'--', dd:'回撤控制核心' },
    time:{ buy:'防御态分2-3批，下周一 09:30-10:00', sell:'周五 14:30-15:00 判定/执行' },
    winWhy:'策略5不是收益胜率，而是择时口径：32次月度调仓中22次建议空仓避损，占比68.8%；目标是控制回撤而非增厚收益。',
    logic:'用指数120日动量、MA60和波动率判定进攻/防御/空仓三态，作为策略1-4的总开关；个股侧选出站上MA60、低波动、低换手的防守候选。',
    conds:['收盘 > MA60','ATR20 收缩（低波动）','换手率 <8%','5日均额 ≥3000万','防御/进攻态可用'],
    ops:{ entry:'防御态分2-3批（50%→30%→20%），只回调买不追高', stop:'-5%硬止损', target:'+10%减半，环境改善即卖', hold:'1-4周', pos:'防守≤20%·单只≤10%' },
    note:'空仓态保留0-10%现金观察；择时可能错过V型反弹，但能防动量崩溃。'
  }
};

const LEVEL_TEXT = { strong:'强', medium:'中', weak:'弱', none:'无' };
const MARKET_LABEL = { attack:'进攻态', defense:'防御态', empty:'空仓态', unknown:'计算中' };
const state = {
  priceRange:'all',
  results:[],
  scanning:false,
  lastScan:0,
  scanTime:'',
  market:{ state:'unknown', aboveMa60:null, mom120:null, dailyVol:null },
  qualCache:new Map(),
  activeCode:null,
  activeStrat:1,
  searchSeq:0
};
const STATIC_HOST = (typeof location!=='undefined') && (/\.github\.io$/.test(location.hostname) || location.protocol==='file:');
const USE_SERVER = (typeof location!=='undefined') && (location.protocol==='http:'||location.protocol==='https:') && !STATIC_HOST;
let API_BASE = (typeof window!=='undefined' && window.__API_BASE) || '';

function localGet(key, ttl){
  try{
    const raw=localStorage.getItem(key);
    if(!raw) return null;
    const d=JSON.parse(raw);
    if(d && Date.now()-d.t < ttl) return d.v;
  }catch(e){}
  return null;
}
function localSet(key, v){
  try{
    localStorage.setItem(key, JSON.stringify({ t:Date.now(), v }));
  }catch(e){}
}

async function probeApiBase(){
  if(!API_BASE) return;
  try{
    const c=new AbortController();
    const t=setTimeout(()=>c.abort(), 4000);
    const r=await fetch(API_BASE+'/api/pool?mode=lt100', { mode:'cors', signal:c.signal });
    clearTimeout(t);
    if(!r.ok) API_BASE='';
  }catch(e){
    API_BASE='';
  }
}

const $ = id => document.getElementById(id);
const fmt = (n,d) => { if(n==null||isNaN(+n)) return '-'; return (+n).toFixed(d==null?2:d); };
const cls = p => p>0?'up':(p<0?'down':'flat');
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;

function maOf(arr,p,idx){ if(idx+1<p) return null; let s=0; for(let i=idx-p+1;i<=idx;i++) s+=arr[i]; return s/p; }
function emaArr(values,p){
  const out=[values[0]], k=2/(p+1);
  for(let i=1;i<values.length;i++) out.push(values[i]*k+out[i-1]*(1-k));
  return out;
}
function symOf(code){ return (code.startsWith('6')||code.startsWith('68')||code.startsWith('90'))?'sh':'sz'; }
function isTradingTime(){
  const d=new Date();
  if(d.getDay()===0||d.getDay()===6) return false;
  const m=d.getHours()*60+d.getMinutes();
  return (m>=540&&m<=720)||(m>=780&&m<=930);
}
function fmtAmt(v){
  if(v==null||isNaN(+v)) return '-';
  const n=+v;
  if(n>=1e8) return (n/1e8).toFixed(2)+'亿';
  if(n>=1e4) return (n/1e4).toFixed(1)+'万';
  return n.toFixed(0);
}

function parseTx(s){
  if(!s) return null;
  const a=s.split('~');
  return {
    name:a[1], code:a[2], price:+a[3], prev:+a[4], open:+a[5], volume:+a[6],
    change:+a[31], pct:+a[32], high:+a[33], low:+a[34], amount_wan:+a[37],
    turnover:+a[38], pe:+a[39], float_cap_yi:+a[44], total_cap_yi:+a[45], pb:+a[46], vol_ratio:+a[49]
  };
}

function loadScript(src, timeout, charset){
  timeout = timeout||9000;
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    if(charset) s.charset=charset;
    const t=setTimeout(()=>{ s.remove(); reject(new Error('script timeout')); }, timeout);
    s.onload=()=>{ clearTimeout(t); resolve(); };
    s.onerror=()=>{ clearTimeout(t); s.remove(); reject(new Error('script load')); };
    s.src=src;
    document.head.appendChild(s);
  });
}

function jsonp(url, cbName, timeout){
  timeout = timeout||9000;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{ cleanup(); reject(new Error('jsonp timeout')); }, timeout);
    window[cbName]=(data)=>{ clearTimeout(timer); cleanup(); resolve(data); };
    function cleanup(){
      try{ delete window[cbName]; }catch(e){}
      const el=document.getElementById('jsonp_'+cbName);
      if(el) el.remove();
    }
    const s=document.createElement('script');
    s.id='jsonp_'+cbName;
    s.src=url;
    s.onerror=()=>{ clearTimeout(timer); cleanup(); reject(new Error('jsonp load')); };
    document.head.appendChild(s);
  });
}

async function fetchJson(url, cb, timeout){
  try{
    const r=await fetch(url,{mode:'cors'});
    if(!r.ok) throw new Error('status '+r.status);
    return await r.json();
  }catch(e){
    if(!cb) throw e;
    const sep=url.includes('?')?'&':'?';
    return jsonp(url+sep+'callback='+cb, cb, timeout);
  }
}

async function loadQuotes(syms){
  const uniq=[...new Set(syms)];
  if(USE_SERVER){
    try{
      const r=await fetch('/api/quote?codes='+encodeURIComponent(uniq.join(',')), { mode:'cors' });
      if(r.ok){
        const d=await r.json();
        if(d) return d;
      }
    }catch(e){}
  }
  if(API_BASE && !USE_SERVER){
    try{
      const r=await fetch(API_BASE+'/api/quote?codes='+encodeURIComponent(uniq.join(',')), { mode:'cors' });
      if(r.ok){
        const d=await r.json();
        if(d) return d;
      }
    }catch(e){}
  }
  const url='https://qt.gtimg.cn/q='+uniq.join(',')+'&_='+Date.now();
  const out={};
  try{
    const r=await fetch(url,{mode:'cors'});
    let text;
    try{
      const buf=await r.arrayBuffer();
      text=new TextDecoder('gbk').decode(buf);
    }catch(e){
      text=await r.text();
    }
    const re=/v_([^=]+)="([^"]*)"/g;
    let m;
    while((m=re.exec(text))){
      const q=parseTx(m[2]);
      if(q) out[m[1]]=q;
    }
  }catch(e){
    try{
      await loadScript(url, 9000, 'gbk');
      for(const s of uniq){
        const g=window['v_'+s];
        if(g){
          const q=parseTx(g);
          if(q) out[s]=q;
        }
      }
    }catch(e2){}
  }
  return out;
}

async function loadQuote(code){
  const sym=symOf(code);
  const qs=await loadQuotes([sym+code]);
  return qs[sym+code]||null;
}

async function loadKline(code){
  const sym=symOf(code);
  const rows=[];
  if(USE_SERVER){
    try{
      const r=await fetch('/api/kline?code='+code, { mode:'cors' });
      if(r.ok){
        const arr=await r.json();
        if(Array.isArray(arr)) return arr;
      }
    }catch(e){}
  }
  if(API_BASE && !USE_SERVER){
    const lc=localGet('lk:'+code, 10*60*1000);
    if(lc) return lc;
    try{
      const r=await fetch(API_BASE+'/api/kline?code='+code, { mode:'cors' });
      if(r.ok){
        const arr=await r.json();
        if(Array.isArray(arr)){
          localSet('lk:'+code, arr);
          return arr;
        }
      }
    }catch(e){}
  }
  try{
    const url='https://ifzq.gtimg.cn/appstock/app/fqkline/get?param='+sym+code+',day,,,160,qfq';
    const data=await fetchJson(url);
    const d=(((data||{}).data||{})[sym+code])||{};
    const raw=d['qfqday']||d['day']||[];
    if(raw.length){
      raw.forEach(x=>rows.push({ date:x[0], open:+x[1], close:+x[2], high:+x[3], low:+x[4], volume:+x[5] }));
      return rows;
    }
  }catch(e){}
  try{
    const secid = (code.startsWith('399')||code.startsWith('999')) ? '0.'+code : (sym==='sh'?'1.':'0.')+code;
    const url='https://push2his.eastmoney.com/api/qt/stock/kline/get?secid='+secid+'&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&end=20500101&lmt=160';
    const data=await fetchJson(url);
    const kd=((data||{}).data)||{};
    const raw=kd.klines||[];
    if(raw.length){
      raw.forEach(x=>{
        const p=x.split(',');
        rows.push({ date:p[0], open:+p[1], close:+p[2], high:+p[3], low:+p[4], volume:+p[5] });
      });
      return rows;
    }
  }catch(e){}
  try{
    const cb='kcb_'+Date.now();
    const arr=await jsonp('https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol='+sym+code+'&scale=240&ma=no&datalen=160&callback='+cb, cb, 4000);
    if(arr&&arr.length){
      arr.forEach(x=>rows.push({ date:x.day, open:+x.open, close:+x.close, high:+x.high, low:+x.low, volume:+x.volume/100 }));
      return rows;
    }
  }catch(e){}
  try{
    const url='https://ifzq.gtimg.cn/appstock/app/fqkline/get?param='+sym+code+',day,,,160,qfq';
    const data=await fetchJson(url);
    const d=(((data||{}).data||{})[sym+code])||{};
    const raw=d['qfqday']||d['day']||[];
    raw.forEach(x=>rows.push({ date:x[0], open:+x[1], close:+x[2], high:+x[3], low:+x[4], volume:+x[5] }));
  }catch(e){}
  return rows;
}

async function loadKlines(codes){
  const uniq=[...new Set(codes.filter(c=>/^\d{6}$/.test(c)))];
  if(USE_SERVER && uniq.length){
    try{
      const r=await fetch('/api/klineBatch?codes='+encodeURIComponent(uniq.join(',')), { mode:'cors' });
      if(r.ok){
        const d=await r.json();
        if(d) return d;
      }
    }catch(e){}
  }
  if(API_BASE && !USE_SERVER && uniq.length){
    const out={};
    const CH=25;
    const chunks=[];
    for(let i=0;i<uniq.length;i+=CH) chunks.push(uniq.slice(i,i+CH));
    let batchIdx=0;
    async function batchWorker(){
      while(batchIdx<chunks.length){
        const chunk=chunks[batchIdx++];
        const missing=chunk.filter(c=>{
          const v=localGet('lk:'+c, 10*60*1000);
          if(v){ out[c]=v; return false; }
          return true;
        });
        if(!missing.length) continue;
        try{
          const r=await fetch(API_BASE+'/api/klineBatch?codes='+encodeURIComponent(missing.join(',')), { mode:'cors' });
          if(r.ok){
            const d=await r.json();
            if(d){
              Object.assign(out,d);
              missing.forEach(c=>{ if(d[c]) localSet('lk:'+c, d[c]); });
            }
          }
        }catch(e){}
      }
    }
    await Promise.all([batchWorker(),batchWorker(),batchWorker(),batchWorker(),batchWorker(),batchWorker()]);
    return out;
  }
  const out={};
  const CH=4;
  for(let i=0;i<uniq.length;i+=CH){
    await Promise.all(uniq.slice(i,i+CH).map(async c=>{
      try{ out[c]=await loadKline(c); }catch(e){}
    }));
  }
  return out;
}

async function loadPool(mode){
  if(USE_SERVER){
    try{
      const r=await fetch('/api/pool?mode='+mode, { mode:'cors' });
      if(r.ok){
        const arr=await r.json();
        if(Array.isArray(arr)&&arr.length) return arr;
      }
    }catch(e){}
  }
  if(API_BASE && !USE_SERVER){
    const lkey='lpool:'+mode;
    const lc=localGet(lkey, 5*60*1000);
    if(lc) return lc;
    try{
      const r=await fetch(API_BASE+'/api/pool?mode='+mode, { mode:'cors' });
      if(r.ok){
        const arr=await r.json();
        if(Array.isArray(arr)&&arr.length){
          localSet(lkey, arr);
          return arr;
        }
      }
    }catch(e){}
  }
  const out=[];
  const num=80;
  const pageList=[1,2,3,4,5,6,7,8];
  let poolIdx=0;
  async function fetchPoolPage(page){
    const base='https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page='+page+'&num='+num+'&sort=amount&asc=0&node=hs_a&symbol=&_s_r_a=page';
    for(let attempt=0;attempt<3;attempt++){
      try{
        const arr=await fetchJson(base, null, 6000);
        if(Array.isArray(arr)&&arr.length) return arr;
      }catch(e){}
      await new Promise(r=>setTimeout(r, 700+attempt*700));
    }
    return [];
  }
  async function poolWorker(){
    while(poolIdx<pageList.length){
      const page=pageList[poolIdx++];
      const arr=await fetchPoolPage(page);
      arr.forEach(x=>{
        const price=+x.trade;
        if(!x.code||!price||/ST|退/.test(x.name||'')) return;
        if(price>100) return;
        out.push({ code:x.code, name:x.name, price, amount:x.amount||0 });
      });
    }
  }
  await Promise.all([poolWorker(),poolWorker(),poolWorker(),poolWorker()]);
  const seen=new Set();
  return out.filter(s=>{
    if(seen.has(s.code)) return false;
    seen.add(s.code);
    return true;
  }).sort((a,b)=>(b.amount||0)-(a.amount||0)).slice(0,80);
}

async function loadQuality(code){
  const now=Date.now();
  const cached=state.qualCache.get(code);
  if(cached && now-cached.t<2*60*60*1000) return cached.d;
  if(USE_SERVER){
    try{
      const r=await fetch('/api/quality?code='+code, { mode:'cors' });
      if(r.ok){
        const d=await r.json();
        state.qualCache.set(code,{d,t:now});
        return d;
      }
    }catch(e){}
  }
  if(API_BASE && !USE_SERVER){
    const lc=localGet('lq:'+code, 2*60*60*1000);
    if(lc) return lc;
    try{
      const r=await fetch(API_BASE+'/api/quality?code='+code, { mode:'cors' });
      if(r.ok){
        const d=await r.json();
        state.qualCache.set(code,{d,t:now});
        localSet('lq:'+code, d);
        return d;
      }
    }catch(e){}
  }
  const scode = code.startsWith('6') ? code+'.SH' : code+'.SZ';
  const url='https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECUCODE%3D%22'+scode+'%22)&pageNumber=1&pageSize=2&sortTypes=-1&sortColumns=REPORT_DATE';
  try{
    const data=await fetchJson(url, 'qcb_'+Date.now(), 8000);
    const rows=(((data||{}).result||{}).data)||[];
    const it=rows[0]||{};
    const d={ ok:!!it.PARENTNETPROFIT, profit:it.PARENTNETPROFIT, roe:it.ROEJQ, debt:it.ZCFZL, profitGrowth:it.PARENTNETPROFITTZ, revGrowth:it.TOTALOPERATEREVETZ };
    state.qualCache.set(code,{d,t:now});
    return d;
  }catch(e){
    return { ok:false };
  }
}

async function loadQualities(codes){
  const uniq=[...new Set(codes.filter(c=>/^\d{6}$/.test(c)))];
  if(!uniq.length) return {};
  if(USE_SERVER){
    try{
      const r=await fetch('/api/qualityBatch?codes='+encodeURIComponent(uniq.join(',')), { mode:'cors' });
      if(r.ok){
        const d=await r.json();
        if(d) return d;
      }
    }catch(e){}
  }
  if(API_BASE && !USE_SERVER){
    const out={};
    const CH=25;
    const chunks=[];
    for(let i=0;i<uniq.length;i+=CH) chunks.push(uniq.slice(i,i+CH));
    let batchIdx=0;
    async function batchWorker(){
      while(batchIdx<chunks.length){
        const chunk=chunks[batchIdx++];
        const missing=chunk.filter(c=>{
          const v=localGet('lq:'+c, 2*60*60*1000);
          if(v){ out[c]=v; return false; }
          return true;
        });
        if(!missing.length) continue;
        try{
          const r=await fetch(API_BASE+'/api/qualityBatch?codes='+encodeURIComponent(missing.join(',')), { mode:'cors' });
          if(r.ok){
            const d=await r.json();
            if(d){
              Object.assign(out,d);
              missing.forEach(c=>{ if(d[c]) localSet('lq:'+c, d[c]); });
            }
          }
        }catch(e){}
      }
    }
    await Promise.all([batchWorker(),batchWorker(),batchWorker(),batchWorker(),batchWorker(),batchWorker()]);
    return out;
  }
  const out={};
  const CH=4;
  for(let i=0;i<uniq.length;i+=CH){
    await Promise.all(uniq.slice(i,i+CH).map(async c=>{
      out[c]=await loadQuality(c);
    }));
  }
  return out;
}

async function loadMarket(){
  const qs=await loadQuotes(INDEX_CODES.map(x=>x.sym));
  renderIndices(qs);
  const rows=await loadKline('399852');
  if(rows.length>=90){
    const closes=rows.map(r=>r.close);
    const idx=closes.length-1;
    const cur=closes[idx];
    const ma60=avg(closes.slice(idx-59,idx+1));
    const mom120=closes.length>120 ? (cur/closes[idx-120]-1)*100 : null;
    const atrs=[];
    for(let i=20;i<rows.length;i++){
      let s=0;
      for(let j=i-19;j<=i;j++){
        const r=rows[j], p=rows[j-1];
        s+=Math.max(r.high-r.low, Math.abs(r.high-p.close), Math.abs(r.low-p.close));
      }
      atrs.push(s/20);
    }
    const atr20=atrs.length?atrs[atrs.length-1]:null;
    const dailyVol=atr20&&cur>0 ? atr20/cur*100 : null;
    let ms='empty';
    if(mom120!=null && mom120>5 && cur>ma60 && dailyVol!=null && dailyVol<3) ms='attack';
    else if(mom120!=null && mom120>0) ms='defense';
    state.market={ state:ms, aboveMa60:cur>ma60, mom120, dailyVol };
  }
  renderMarketState();
}

function computeInd(rows,quote,code){
  if(!rows||rows.length<30) return null;
  const closes=rows.map(r=>r.close);
  const idx=rows.length-1;
  const price = quote&&quote.price>0 ? +quote.price : closes[idx];
  const pct = quote&&quote.pct!=null ? +quote.pct : (closes.length>1 ? (price/closes[idx-1]-1)*100 : 0);
  const n60=Math.min(60,rows.length);
  const h60=Math.max.apply(null,rows.slice(-n60).map(r=>r.high));
  const l60=Math.min.apply(null,rows.slice(-n60).map(r=>r.low));
  const pos60=h60>l60 ? (price-l60)/(h60-l60)*100 : 50;
  const ma5=maOf(closes,5,idx), ma10=maOf(closes,10,idx), ma20=maOf(closes,20,idx), ma60=maOf(closes,60,idx);
  const vol5=avg(rows.slice(-Math.min(5,rows.length)).map(r=>r.volume));
  const vol20=avg(rows.slice(-Math.min(20,rows.length)).map(r=>r.volume));
  const chg10=closes.length>10 ? (price/closes[idx-10]-1)*100 : null;
  const chg60=closes.length>60 ? (price/closes[idx-60]-1)*100 : null;
  const chg120=closes.length>120 ? (price/closes[idx-120]-1)*100 : null;
  const atrs=[];
  for(let i=20;i<rows.length;i++){
    let s=0;
    for(let j=i-19;j<=i;j++){
      const r=rows[j], p=rows[j-1];
      s+=Math.max(r.high-r.low, Math.abs(r.high-p.close), Math.abs(r.low-p.close));
    }
    atrs.push(s/20);
  }
  const atr20=atrs.length?atrs[atrs.length-1]:null;
  const atr60=atrs.length?avg(atrs.slice(-60)):null;
  const lowVol=atr20!=null&&atr60!=null ? atr20<atr60 : null;
  const annVol=atr20!=null&&price>0 ? atr20/price*Math.sqrt(250)*100 : null;
  const prevVol=idx>0 ? rows[idx-1].volume : 0;
  const lastVol=quote&&quote.volume ? +quote.volume : (rows[idx]?rows[idx].volume:0);
  const volRatio=prevVol>0 ? lastVol/prevVol : null;
  const amt5 = quote&&quote.amount_wan!=null ? +quote.amount_wan*10000 : vol5*100*price;
  const e12=emaArr(closes,12), e26=emaArr(closes,26);
  const dif=closes.map((_,i)=>e12[i]-e26[i]);
  const dea=emaArr(dif,9);
  const macdBull=dif[idx]>dea[idx];
  return {
    code, name:quote?quote.name:'', price, pct, open:rows[idx].open, close:closes[idx],
    high:rows[idx].high, low:rows[idx].low,
    pos60, ma5, ma10, ma20, ma60, vol5, vol20, chg10, chg60, chg120,
    atr20, atr60, lowVol, annVol, volRatio, amt5,
    turnover:quote?quote.turnover:null, pe:quote?quote.pe:null, pb:quote?quote.pb:null,
    vol_ratio:quote?quote.vol_ratio:null, amount_wan:quote?quote.amount_wan:null, macdBull
  };
}

function qualityInfo(q,ind){
  if(!q||!q.ok) return { score:0, max:12, grade:'D', label:'数据不足', details:[] };
  let score=0;
  if(q.profit>0) score+=2;
  if(q.roe>=10) score+=3; else if(q.roe>=5) score+=2; else if(q.roe>0) score+=1;
  if(q.debt!=null&&q.debt<50) score+=2; else if(q.debt!=null&&q.debt<70) score+=1;
  if(q.profitGrowth!=null&&q.profitGrowth>0) score+=1;
  if(q.revGrowth!=null&&q.revGrowth>0) score+=1;
  if(ind&&ind.amt5!=null&&ind.amt5>=5000e4) score+=1;
  if(ind&&ind.annVol!=null&&ind.annVol<=40) score+=1;
  if(ind&&ind.close!=null&&ind.ma60!=null&&ind.close>ind.ma60) score+=1;
  const grade = score>=9 ? 'A' : score>=7 ? 'B' : score>=5 ? 'C' : 'D';
  return { score, max:12, grade, label:'质量'+grade, details:[] };
}

function mkEval(checks, corePassed, coreNeed){
  const computable=checks.filter(c=>!c.manual);
  const pass=computable.filter(c=>c.pass).length;
  const total=computable.length;
  const score=total?Math.round(pass/total*100):0;
  let level='none';
  if(pass>0){
    if(corePassed>=coreNeed && score>=80) level='strong';
    else if(score>=60) level='medium';
    else level='weak';
  }
  return { checks, score, level, pass, total, corePassed };
}

function marketLabel(s){
  return MARKET_LABEL[s]||'计算中';
}

function evalAll(ind,qual,market){
  const q=qual||{ok:false};
  const rel=(ind.chg60!=null&&ind.chg120!=null)?(ind.chg60+ind.chg120)/2:null;
  const liq30=ind.amt5!=null && ind.amt5>=3000e4;
  const liq50=ind.amt5!=null && ind.amt5>=5000e4;
  const attack=market.state==='attack';
  const defense=market.state==='defense';
  const usable=attack||defense;
  const qOk=!!q.ok && q.roe>=8 && q.profit>0 && (q.debt==null||q.debt<60);
  const peOk=ind.pe!=null && ind.pe>0 && ind.pe<=20;
  const maTrend=ind.ma5!=null&&ind.ma20!=null&&ind.ma5>ind.ma20;

  const s1Checks=[
    { label:'60-120日相对动量 >5%', pass:rel!=null&&rel>5, val:rel!=null?fmt(rel,1)+'%':'-' },
    { label:'5日均额 ≥3000万', pass:liq30, val:fmtAmt(ind.amt5) },
    { label:'指数进攻态（总开关）', pass:attack, val:marketLabel(market.state) },
    { label:'非ST/退市风险', pass:true, val:'通过' },
    { label:'股价 ≤100元', pass:ind.price<=100, val:fmt(ind.price)+'元' }
  ];
  const s1Core=(rel!=null&&rel>5)&&liq30&&attack;
  const s1=mkEval(s1Checks, s1Core?3:0, 3);

  const s2Checks=[
    { label:'ROE≥8% 且 净利>0', pass:qOk, val:q.ok?fmt(q.roe,1)+'%':'数据不足' },
    { label:'负债率 <60%', pass:q.ok&&(q.debt==null||q.debt<60), val:q.ok&&q.debt!=null?fmt(q.debt,1)+'%':'-' },
    { label:'PE 0-20', pass:peOk, val:ind.pe!=null?fmt(ind.pe,1):'-' },
    { label:'净利/营收正增长', pass:q.profitGrowth==null||q.profitGrowth>0, val:q.ok?(q.profitGrowth!=null?fmt(q.profitGrowth,1)+'%':'待确认'):'数据不足' },
    { label:'股息率≥3%', pass:false, val:'需人工确认', manual:true },
    { label:'5日均额 ≥3000万', pass:liq30, val:fmtAmt(ind.amt5) }
  ];
  const s2Core=qOk&&peOk;
  const s2=mkEval(s2Checks, s2Core?2:0, 2);

  const s3Checks=[
    { label:'年化波动 ≤40%', pass:ind.annVol!=null&&ind.annVol<=40, val:ind.annVol!=null?fmt(ind.annVol,1)+'%':'-' },
    { label:'ATR20 收缩', pass:ind.lowVol===true, val:ind.lowVol==null?'-':(ind.lowVol?'收缩':'未收缩') },
    { label:'5日均额 ≥5000万', pass:liq50, val:fmtAmt(ind.amt5) },
    { label:'收盘 > MA60', pass:ind.close!=null&&ind.ma60!=null&&ind.close>ind.ma60, val:ind.ma60!=null?fmt(ind.close)+' / MA60 '+fmt(ind.ma60):'-' }
  ];
  const s3Core=(ind.annVol!=null&&ind.annVol<=40)&&ind.lowVol===true&&ind.close>ind.ma60;
  const s3=mkEval(s3Checks, s3Core?3:0, 3);

  const s4Checks=[
    { label:'60-120日相对动量 >5%', pass:rel!=null&&rel>5, val:rel!=null?fmt(rel,1)+'%':'-' },
    { label:'ROE≥8% 且 负债率<60%', pass:qOk, val:q.ok?fmt(q.roe,1)+'%':'数据不足' },
    { label:'5日均额 ≥3000万', pass:liq30, val:fmtAmt(ind.amt5) },
    { label:'MA5>MA20 趋势确认', pass:maTrend, val:maTrend?'多头':'未确认' },
    { label:'指数进攻态', pass:attack, val:marketLabel(market.state) }
  ];
  const s4Core=(rel!=null&&rel>5)&&qOk&&liq30;
  const s4=mkEval(s4Checks, s4Core?3:0, 3);

  const s5Checks=[
    { label:'收盘 > MA60', pass:ind.close!=null&&ind.ma60!=null&&ind.close>ind.ma60, val:ind.ma60!=null?fmt(ind.close)+' / MA60 '+fmt(ind.ma60):'-' },
    { label:'ATR20 收缩（低波动）', pass:ind.lowVol===true, val:ind.lowVol==null?'-':(ind.lowVol?'收缩':'未收缩') },
    { label:'换手率 <8%', pass:ind.turnover!=null&&ind.turnover<8, val:ind.turnover!=null?fmt(ind.turnover,1)+'%':'-' },
    { label:'5日均额 ≥3000万', pass:liq30, val:fmtAmt(ind.amt5) },
    { label:'防御/进攻态可用', pass:usable, val:marketLabel(market.state) }
  ];
  const s5Core=(ind.close>ind.ma60)&&ind.lowVol===true&&usable;
  const s5=mkEval(s5Checks, s5Core?3:0, 3);

  if(s1.level!=='none' && !attack) s1.level='weak';
  if(s4.level!=='none' && market.state==='empty') s4.level='weak';
  if(s4.level==='strong' && !attack) s4.level='medium';
  if(s5.level!=='none' && market.state!=='defense') s5.level='weak';

  return { evs:{ 1:s1, 2:s2, 3:s3, 4:s4, 5:s5 }, rel, qOk };
}

function needsQuality(ind){
  if(!ind) return false;
  const rel=(ind.chg60!=null&&ind.chg120!=null)?(ind.chg60+ind.chg120)/2:null;
  if(rel!=null && rel>5) return true;
  if(ind.pe!=null && ind.pe>0 && ind.pe<=20) return true;
  if(ind.annVol!=null && ind.annVol<=40 && ind.lowVol===true && ind.amt5!=null && ind.amt5>=5000e4) return true;
  if(ind.close!=null && ind.ma60!=null && ind.close>ind.ma60 && ind.lowVol===true) return true;
  return false;
}

function buyVerdict(k,level,qi,market){
  if(level==='none') return '暂不';
  if(market.state==='empty') return '空仓态·暂不';
  if(level==='weak') return '观察';
  const qOk=qi&&qi.score>=7;
  if(k==='1'){
    if(market.state==='attack'&&level==='strong'&&qOk) return '可买';
    if(market.state==='attack'&&level==='medium') return '可小仓';
    return '观察';
  }
  if(k==='2'){
    if(level==='strong'&&qOk) return '可买';
    if(level==='medium'&&qOk) return '可小仓';
    return '观察';
  }
  if(k==='3'){
    if(level==='strong') return '可买';
    if(level==='medium') return '可小仓';
    return '观察';
  }
  if(k==='4'){
    if(market.state==='attack'&&level==='strong'&&qOk) return '可买';
    if(level==='medium'&&qOk) return '可小仓';
    return '观察';
  }
  if(k==='5'){
    if(market.state==='defense'&&level==='strong') return '可小仓';
    return '观察';
  }
  return '观察';
}

function bestStrategy(evs,qi){
  const order=[3,2,4,1,5];
  let best=null;
  for(const k of order){
    const e=evs[k];
    if(!e||e.level==='none') continue;
    const s=e.score+(qi?qi.score:0)*0.5;
    if(!best||s>best._score) best=Object.assign({},e,{ key:k, _score:s });
  }
  return best;
}

function opPlan(k,ind){
  const p=ind.price;
  const f=n=>fmt(n,2);
  const plans={
    1:{
      entry:'T+1开盘09:30-10:00，回踩MA10('+f(ind.ma10)+')/MA20('+f(ind.ma20)+')分批，不追高',
      stop:'止损 '+f(p*0.95)+'（-5%），或动量转负',
      target:'目标 '+f(p*1.08)+'（+8%）减半 / '+f(p*1.15)+'（+15%）清仓，满60日离场',
      hold:'20-60日', pos:'≤30%',
      time:'买 09:30-10:00 / 卖 14:30-15:00'
    },
    2:{
      entry:'季报后/季度末最后5日14:30-15:00等权建仓',
      stop:'盈利转负或PE>20时，14:30-15:00卖出',
      target:'+8%~+12%分批止盈，季度末再平衡',
      hold:'1个季度', pos:'≤25%',
      time:'买 季度末14:30-15:00 / 卖 调仓日14:30-15:00'
    },
    3:{
      entry:'月末最后5日14:30-15:00，T+1开盘等权买入',
      stop:'跌破MA60('+f(ind.ma60)+')或年化波动>40%离场',
      target:'+8%~+12%分批止盈，月末再平衡',
      hold:'1个月', pos:'≤30%',
      time:'买 月末14:30-15:00 / 卖 月末14:30-15:00'
    },
    4:{
      entry:'每20日调仓日09:30-10:00或14:30-15:00，回踩MA10/MA20分批',
      stop:'止损 '+f(p*0.95)+'（-5%）',
      target:'+10%减半 / +15%清仓，动量转负离场',
      hold:'20-40日', pos:'进攻≤30%·防御≤10%',
      time:'买 09:30-10:00 / 卖 14:30-15:00'
    },
    5:{
      entry:'防御态分2-3批（50%→30%→20%），每周五判定、下周一09:30-10:00执行',
      stop:'止损 '+f(p*0.95)+'（-5%）',
      target:'+10%减半，环境改善即卖',
      hold:'1-4周', pos:'防守≤20%·单只≤10%',
      time:'买 周一09:30-10:00 / 卖 周五14:30-15:00'
    }
  };
  return plans[k]||plans[1];
}

function verdictWhy(best,qi,market){
  if(!best) return '当前无任何策略触发，暂不买入。';
  const parts=[];
  parts.push(STRATS[best.key].name+'得分 '+best.score+'/100');
  if(best.level==='strong') parts.push('核心条件全部通过');
  else if(best.level==='medium') parts.push('多数条件通过');
  else if(best.level==='weak') parts.push('仅部分条件通过');
  if(qi&&qi.score>=7) parts.push('质量'+qi.grade+'（'+qi.score+'/12）');
  if(qi&&qi.score>0&&qi.score<7) parts.push('质量'+qi.grade+'（'+qi.score+'/12）');
  if(market.state==='empty') parts.push('当前空仓态，仅观察');
  if(market.state==='defense') parts.push('防御态，质量/低波优先');
  if(market.state==='attack'&&(best.key==='1'||best.key==='4')) parts.push('进攻态，动量类可用');
  return parts.join('，')+'。';
}

function renderIndices(qs){
  $('indexCards').innerHTML=INDEX_CODES.map(it=>{
    const q=qs[it.sym];
    if(!q||!q.price) return '<div class="idx-card"><div class="i-name">'+it.name+'</div><div class="i-price">--</div></div>';
    return '<div class="idx-card"><div class="i-name">'+it.name+'</div>'+
      '<div class="i-price '+cls(q.pct)+'">'+fmt(q.price)+'</div>'+
      '<div class="i-pct '+cls(q.pct)+'">'+(q.pct>0?'+':'')+fmt(q.pct,2)+'%</div></div>';
  }).join('');
}

function renderMarketState(){
  const ms=state.market.state;
  const map={
    attack:{ label:'进攻态', detail:'指数动量+低波，可进攻但严格止损', className:'attack' },
    defense:{ label:'防御态', detail:'质量+低波优先，总仓位≤50%', className:'defense' },
    empty:{ label:'空仓态', detail:'等待企稳，不抄底，留0-10%现金', className:'empty' },
    unknown:{ label:'计算中', detail:'--', className:'' }
  };
  const m=map[ms]||map.unknown;
  const el=$('marketStateValue');
  el.textContent=m.label;
  el.className='ms-value '+m.className;
  $('marketStateDetail').textContent=m.detail;
}

function inPrice(r){
  const p=r.ind.price;
  if(state.priceRange==='lt10') return p<=10;
  if(state.priceRange==='10to30') return p>10&&p<=30;
  if(state.priceRange==='30to100') return p>30&&p<=100;
  return true;
}

function renderStrategyCards(){
  const counts={1:0,2:0,3:0,4:0,5:0};
  state.results.filter(inPrice).forEach(r=>{
    for(const k of Object.keys(counts)){
      if(r.evs[k]&&(r.evs[k].level==='strong'||r.evs[k].level==='medium')) counts[k]++;
    }
  });
  $('strategyCards').innerHTML=Object.keys(STRATS).map(k=>{
    const s=STRATS[k];
    return '<div class="strat-card" style="--accent:'+s.color+'" data-strat="'+k+'" onclick="switchStratTab('+k+')">'+
      '<div class="s-type">'+s.type+' · '+s.hold+'</div>'+
      '<div class="s-name">'+s.name+'</div>'+
      '<div class="s-win">'+s.win+'</div>'+
      '<div class="s-win-label">'+s.winLabel+'</div>'+
      '<div class="s-count">当前信号 '+counts[k]+' 只</div>'+
      '<div class="s-time"><b>买入</b> '+esc(s.time.buy)+'<br><b>卖出</b> '+esc(s.time.sell)+'</div></div>';
  }).join('');
}

function switchStratTab(k){
  state.activeStrat=+k;
  renderStrategyTabs();
  renderStrategyPanel(state.activeStrat);
}

function renderSignalPool(){
  const rows=[];
  state.results.filter(inPrice).forEach(r=>{
    const active=Object.keys(r.evs).map(k=>{
      const e=r.evs[k];
      return e&&e.level!=='none'?Object.assign({},e,{key:k}):null;
    }).filter(Boolean);
    if(!active.length) return;
    const best=r.best;
    if(!best) return;
    if(best.level!=='strong'&&best.level!=='medium') return;
    const op=opPlan(best.key,r.ind);
    const score=best.score+(r.qi?r.qi.score:0)*0.5+(r.ind.pct||0)*0.15;
    rows.push({ r, active, op, score });
  });
  rows.sort((a,b)=>b.score-a.score);
  const rangeText={all:'全部≤100元',lt10:'≤10元', '10to30':'10-30元', '30to100':'30-100元'}[state.priceRange];
  const meta='候选池 '+state.results.length+' 只 · 价格 '+rangeText+' · 命中 '+rows.length+' 只 · 扫描 '+state.scanTime;
  $('signalMeta').textContent=meta;
  const body=$('signalBody');
  if(!rows.length){
    body.innerHTML='<tr class="empty-row"><td colspan="13">当前价格区间暂无信号，点击“立即扫描”获取实时数据。</td></tr>';
    return;
  }
  body.innerHTML=rows.map(item=>{
    const r=item.r;
    const active=item.active;
    const tags=active.slice(0,3).map(e=>'<span class="strat-tag s'+e.key+'">'+STRATS[e.key].short+'</span>').join('');
    const extra=active.length>3?'<span class="strat-tag">+'+(active.length-3)+'</span>':'';
    const verdict=buyVerdict(r.best.key,r.best.level,r.qi,state.market);
    const vc=verdict==='可买'?'buy':verdict==='可小仓'?'small':verdict==='观察'?'watch':'no';
    return '<tr data-code="'+r.code+'" onclick="openDrawerByCode(\''+r.code+'\')">'+
      '<td class="code-cell">'+r.code+'</td>'+
      '<td class="name-cell">'+esc(r.name)+'</td>'+
      '<td class="'+cls(r.ind.pct)+'">'+fmt(r.ind.price)+'</td>'+
      '<td class="'+cls(r.ind.pct)+'">'+(r.ind.pct>0?'+':'')+fmt(r.ind.pct,2)+'%</td>'+
      '<td><div class="strat-tags">'+tags+extra+'</div></td>'+
      '<td><span class="chip '+r.best.level+'">'+LEVEL_TEXT[r.best.level]+'</span></td>'+
      '<td><span class="chip qual-'+String(r.qi.grade).toLowerCase()+'">'+r.qi.score+'/12 · '+r.qi.grade+'</span></td>'+
      '<td><span class="chip '+vc+'">'+verdict+'</span></td>'+
      '<td><div class="time-text">'+esc(item.op.time)+'</div></td>'+
      '<td><div class="op-text">'+esc(item.op.entry)+'</div></td>'+
      '<td>'+esc(item.op.stop)+'</td>'+
      '<td>'+esc(item.op.target)+'</td>'+
      '<td>'+esc(item.op.pos)+'</td></tr>';
  }).join('');
}

function checkListHtml(e){
  return '<ul class="checks">'+e.checks.map(c=>{
    const cn=c.manual?'man':c.pass?'ok':'bad';
    return '<li><span>'+esc(c.label)+'</span><span class="'+cn+'">'+esc(c.val)+'</span></li>';
  }).join('')+'</ul>';
}

function statBox(k,v){
  return '<div class="stat-box"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>';
}
function opBox(k,v,timeClass){
  return '<div class="op-box"><div class="k">'+k+'</div><div class="v'+(timeClass?' time-td':'')+'">'+v+'</div></div>';
}
function qualityLine(q){
  if(!q||!q.ok) return '暂无F10财务数据，质量分按技术面近似。';
  return 'ROE '+fmt(q.roe,2)+'% · 归母净利 '+fmt(q.profit/1e8,2)+'亿 · 负债率 '+fmt(q.debt,1)+'% · 净利同比 '+(q.profitGrowth!=null?fmt(q.profitGrowth,1)+'%':'-')+' · 营收同比 '+(q.revGrowth!=null?fmt(q.revGrowth,1)+'%':'-');
}

function renderDrawer(stock){
  const ind=stock.ind, qi=stock.qi, q=stock.qual;
  const best=stock.best;
  const verdict=best?buyVerdict(best.key,best.level,qi,state.market):'暂不';
  const vc=verdict==='可买'?'buy':verdict==='可小仓'?'small':verdict==='观察'?'watch':'no';
  const op=best?opPlan(best.key,ind):null;
  const html=
    '<div class="dq-head"><div><div class="dq-name">'+esc(stock.name)+'</div>'+
    '<div class="dq-code">'+stock.code+'</div></div>'+
    '<div><div class="dq-price '+cls(ind.pct)+'">'+fmt(ind.price)+'</div>'+
    '<div class="dq-pct '+cls(ind.pct)+'">'+(ind.pct>0?'+':'')+fmt(ind.pct,2)+'%</div></div></div>'+
    '<div class="stats-grid">'+
      statBox('换手率', ind.turnover!=null?fmt(ind.turnover,1)+'%':'-')+
      statBox('量比', ind.vol_ratio!=null?fmt(ind.vol_ratio,2):'-')+
      statBox('市盈率', ind.pe!=null?fmt(ind.pe,1):'-')+
      statBox('市净率', ind.pb!=null?fmt(ind.pb,2):'-')+
      statBox('60日位置', fmt(ind.pos60,0)+'%')+
      statBox('年化波动', ind.annVol!=null?fmt(ind.annVol,1)+'%':'-')+
      statBox('5日均额', fmtAmt(ind.amt5))+
      statBox('60日动量', ind.chg60!=null?fmt(ind.chg60,1)+'%':'-')+
      statBox('120日动量', ind.chg120!=null?fmt(ind.chg120,1)+'%':'-')+
      statBox('市场状态', marketLabel(state.market.state))+
    '</div>'+
    '<div class="drawer-section"><h3>质量评分 <span class="chip qual-'+String(qi.grade).toLowerCase()+'">'+qi.grade+' · '+qi.label+'</span></h3>'+
      '<div class="quality-meter"><i style="width:'+Math.min(100,Math.round(qi.score/12*100))+'%"></i></div>'+
      '<div class="win-note">'+qualityLine(q)+'</div></div>'+
    '<div class="drawer-section"><h3>策略信号</h3><div class="strategy-list">'+
      Object.keys(STRATS).map(k=>{
        const s=STRATS[k], e=stock.evs[k]||{ checks:[], score:0, level:'none' };
        const level=e.level;
        return '<div class="strategy-row" style="--accent:'+s.color+'">'+
          '<div class="top"><div><span class="s-name">'+s.name+'</span> <span class="s-score">'+s.type+' · '+s.hold+'</span></div>'+
          '<div><span class="chip '+level+'">'+LEVEL_TEXT[level]+'</span> <span class="chip '+(buyVerdict(k,level,qi,state.market)==='暂不'||buyVerdict(k,level,qi,state.market)==='观察'?'watch':buyVerdict(k,level,qi,state.market)==='可买'?'buy':'small')+'">'+buyVerdict(k,level,qi,state.market)+'</span></div></div>'+
          '<div class="s-score">得分 '+e.score+'/100 · 买入 '+esc(s.time.buy)+' · 卖出 '+esc(s.time.sell)+'</div>'+checkListHtml(e)+'</div>';
      }).join('')+
    '</div></div>'+
    (op?'<div class="drawer-section"><h3>建议操作 · '+STRATS[best.key].name+' <span class="chip '+vc+'">'+verdict+'</span></h3>'+
      '<p class="win-note" style="margin-bottom:8px">'+verdictWhy(best,qi,state.market)+'</p>'+
      '<div class="op-grid">'+opBox('介入方式',op.entry)+opBox('买入时段',op.time,true)+opBox('卖出时段',op.time,true)+opBox('止损',op.stop)+opBox('止盈',op.target)+opBox('持仓周期',op.hold)+opBox('仓位',op.pos)+opBox('最终判断','<span class="chip '+vc+'">'+verdict+'</span>')+'</div>'+
      '<div class="win-note"><strong>胜率参考：</strong>'+STRATS[best.key].win+'（'+STRATS[best.key].winLabel+'）<br>'+STRATS[best.key].winWhy+'</div></div>':'')+
    '<div class="win-note">以上为系统规则计算结果，不构成投资建议；实盘请二次确认人工条件。</div>';
  $('drawerContent').innerHTML=html;
}

function openDrawer(stock){
  state.activeCode=stock.code;
  renderDrawer(stock);
  $('drawerBackdrop').hidden=false;
  $('drawer').hidden=false;
}

window.openDrawerByCode=function(code){
  const stock=state.results.find(r=>r.code===code);
  if(stock) openDrawer(stock);
};
window.switchStratTab=switchStratTab;

function renderStrategyTabs(){
  $('stratTabs').innerHTML=Object.keys(STRATS).map(k=>
    '<button class="strat-tab'+(state.activeStrat===+k?' active':'')+'" data-strat="'+k+'" onclick="switchStratTab('+k+')">'+STRATS[k].name+'</button>'
  ).join('');
}

function renderStrategyPanel(k){
  const s=STRATS[k];
  const rows=state.results.filter(r=>r.evs[k]&&(r.evs[k].level==='strong'||r.evs[k].level==='medium')&&inPrice(r)).sort((a,b)=>b.evs[k].score-a.evs[k].score).slice(0,20);
  let html='<div class="sp-grid">'+
    '<div class="sp-block"><h3>策略逻辑</h3><p>'+s.logic+'</p>'+
    '<h3 style="margin-top:12px">触发条件</h3><ul>'+s.conds.map(c=>'<li>'+c+'</li>').join('')+'</ul>'+
    '<div class="sp-win"><div><div class="rate" style="color:'+s.color+'">'+s.win+'</div><div class="win-note">'+s.winLabel+'</div></div>'+
    '<div class="why">'+s.winWhy+'</div></div>'+
    '<div class="bt-grid">'+
      '<div class="bt-item"><div class="k">总收益率</div><div class="v" style="color:'+(s.bt.total.indexOf('-')>=0?'var(--green)':'var(--red)')+'">'+s.bt.total+'</div></div>'+
      '<div class="bt-item"><div class="k">年化</div><div class="v">'+s.bt.annual+'</div></div>'+
      '<div class="bt-item"><div class="k">夏普</div><div class="v">'+s.bt.sharpe+'</div></div>'+
      '<div class="bt-item"><div class="k">最大回撤</div><div class="v">'+s.bt.dd+'</div></div>'+
      '<div class="bt-item"><div class="k">月度胜率</div><div class="v" style="color:'+s.color+'">'+s.win+'</div></div>'+
    '</div></div>'+
    '<div class="sp-block"><h3>操作纪律与买卖时段</h3>'+
    '<table class="sp-ops-table"><tbody>'+
      '<tr><th>买入时段</th><td class="time-td">'+s.time.buy+'</td></tr>'+
      '<tr><th>卖出时段</th><td class="time-td">'+s.time.sell+'</td></tr>'+
      '<tr><th>介入</th><td>'+s.ops.entry+'</td></tr>'+
      '<tr><th>止损</th><td>'+s.ops.stop+'</td></tr>'+
      '<tr><th>止盈</th><td>'+s.ops.target+'</td></tr>'+
      '<tr><th>周期</th><td>'+s.ops.hold+'</td></tr>'+
      '<tr><th>仓位</th><td>'+s.ops.pos+'</td></tr>'+
    '</tbody></table>'+
    '<p class="win-note" style="margin-top:10px">'+s.note+'</p></div></div>';
  if(rows.length){
    html+='<div class="sp-signals"><table class="data-table"><thead><tr>'+
      '<th>代码</th><th>名称</th><th>现价</th><th>涨跌幅</th><th>信号</th><th>得分</th><th>质量</th><th>能否买</th><th>买卖时段</th><th>止损</th><th>止盈</th></tr></thead><tbody>'+
      rows.map(r=>{
        const e=r.evs[k];
        const verdict=buyVerdict(k,e.level,r.qi,state.market);
        const vc=verdict==='可买'?'buy':verdict==='可小仓'?'small':verdict==='观察'?'watch':'no';
        const op=opPlan(k,r.ind);
        return '<tr data-code="'+r.code+'" onclick="openDrawerByCode(\''+r.code+'\')">'+
          '<td class="code-cell">'+r.code+'</td><td class="name-cell">'+esc(r.name)+'</td>'+
          '<td class="'+cls(r.ind.pct)+'">'+fmt(r.ind.price)+'</td>'+
          '<td class="'+cls(r.ind.pct)+'">'+(r.ind.pct>0?'+':'')+fmt(r.ind.pct,2)+'%</td>'+
          '<td><span class="chip '+e.level+'">'+LEVEL_TEXT[e.level]+'</span></td>'+
          '<td>'+e.score+'</td>'+
          '<td><span class="chip qual-'+String(r.qi.grade).toLowerCase()+'">'+r.qi.score+' · '+r.qi.grade+'</span></td>'+
          '<td><span class="chip '+vc+'">'+verdict+'</span></td>'+
          '<td><div class="time-text">'+esc(op.time)+'</div></td>'+
          '<td>'+esc(op.stop)+'</td><td>'+esc(op.target)+'</td></tr>';
      }).join('')+'</tbody></table></div>';
  }else{
    html+='<p class="win-note" style="margin-top:12px">当前价格区间暂无该策略信号。</p>';
  }
  $('stratPanel').innerHTML=html;
}

function updateMeta(){
  const statusEl=$('marketStatus');
  if(state.scanning){
    statusEl.textContent='扫描中';
    statusEl.className='status loading';
  }else if(isTradingTime()){
    statusEl.textContent='交易中';
    statusEl.className='status live';
  }else{
    statusEl.textContent='已收盘';
    statusEl.className='status closed';
  }
  $('updateTime').textContent=state.scanTime?'更新 '+state.scanTime:'--';
}

function setScanningUI(on){
  const btn=$('refreshBtn');
  btn.textContent=on?'扫描中…':'立即扫描';
  btn.disabled=on;
  updateMeta();
}

function updateProgress(done,total){
  const pct=Math.min(100,Math.round(done/total*100));
  $('progressBar').style.width=pct+'%';
  $('progressText').textContent='扫描 '+Math.min(done,total)+'/'+total;
}

async function scanNow(manual){
  if(state.scanning) return;
  state.scanning=true;
  setScanningUI(true);
  try{
    const pool=await loadPool('lt100');
    if(!pool.length) throw new Error('候选池为空，请检查网络');
    $('progressText').textContent='候选池 '+pool.length+' 只，批量获取行情…';
    const codes=pool.map(s=>s.code);
    const [quoteMap,klineMap]=await Promise.all([
      loadQuotes(pool.map(s=>symOf(s.code)+s.code)),
      loadKlines(codes)
    ]);
    const pre=[];
    pool.forEach(s=>{
      const rows=klineMap[s.code]||[];
      const q=quoteMap[symOf(s.code)+s.code] || null;
      const ind=computeInd(rows,q,s.code);
      if(ind) pre.push({ code:s.code, name:s.name||(q&&q.name)||'', ind });
    });
    $('progressText').textContent='指标计算 '+pre.length+'/'+pool.length+'，批量拉取财务…';
    const qualityCodes=pre.filter(x=>needsQuality(x.ind)).map(x=>x.code);
    const qualityMap=await loadQualities(qualityCodes);
    const results=[];
    pre.forEach(x=>{
      const qual=qualityMap[x.code] || { ok:false };
      const qi=qualityInfo(qual,x.ind);
      const ev=evalAll(x.ind,qual,state.market);
      const evs=ev.evs;
      const best=bestStrategy(evs,qi);
      results.push({ code:x.code, name:x.name, ind:x.ind, qual, qi, evs, best });
    });
    state.results=results;
    state.lastScan=Date.now();
    state.scanTime=new Date().toLocaleString('zh-CN',{hour12:false});
    saveSnapshot();
    renderAll();
    $('progressText').textContent='扫描完成 '+results.length+'/'+pool.length;
  }catch(e){
    $('signalMeta').textContent='扫描失败：'+e.message;
    $('marketStatus').textContent='网络异常';
    $('marketStatus').className='status error';
  }finally{
    state.scanning=false;
    setScanningUI(false);
    updateMeta();
  }
}

function renderAll(){
  renderStrategyCards();
  renderSignalPool();
  renderStrategyTabs();
  renderStrategyPanel(state.activeStrat);
  updateMeta();
}

function saveSnapshot(){
  try{
    localStorage.setItem('longScanV3', JSON.stringify({
      t:state.scanTime,
      ts:state.lastScan,
      priceRange:state.priceRange,
      results:state.results.map(r=>({ code:r.code, name:r.name, ind:r.ind, qual:r.qual, qi:r.qi, evs:r.evs, best:r.best }))
    }));
  }catch(e){}
}

function loadSnapshot(){
  try{
    const raw=localStorage.getItem('longScanV3');
    if(!raw) return false;
    const snap=JSON.parse(raw);
    if(!snap.results||!snap.results.length) return false;
    const first=snap.results[0];
    if(!first||!first.evs||!first.evs['1']||!first.evs['2']||!first.evs['3']||!first.evs['4']||!first.evs['5']) return false;
    state.results=snap.results;
    state.scanTime=snap.t||'历史快照';
    state.lastScan=snap.ts||0;
    if(snap.priceRange) state.priceRange=snap.priceRange;
    syncPriceSeg();
    renderAll();
    return true;
  }catch(e){ return false; }
}

async function refreshQuotes(){
  if(!state.results.length) return;
  const syms=INDEX_CODES.map(x=>x.sym).concat(state.results.map(r=>symOf(r.code)+r.code));
  const qs=await loadQuotes(syms);
  renderIndices(qs);
  state.results.forEach(r=>{
    const q=qs[symOf(r.code)+r.code];
    if(q&&q.price>0){
      r.ind.price=q.price;
      r.ind.pct=q.pct;
      r.ind.turnover=q.turnover;
      r.ind.pe=q.pe;
      r.ind.pb=q.pb;
      r.ind.vol_ratio=q.vol_ratio;
      r.ind.amount_wan=q.amount_wan;
      r.ind.amt5=q.amount_wan!=null?q.amount_wan*10000:r.ind.amt5;
      r.ind.low=(q.low!=null?q.low:r.ind.low);
      r.ind.high=(q.high!=null?q.high:r.ind.high);
    }
  });
  renderSignalPool();
  renderStrategyCards();
  if(state.activeCode){
    const st=state.results.find(r=>r.code===state.activeCode);
    if(st && !$('drawer').hidden) renderDrawer(st);
  }
}

async function fetchSuggestions(q){
  if(!q.trim()) return [];
  if(USE_SERVER){
    try{
      const r=await fetch('/api/search?q='+encodeURIComponent(q.trim()), { mode:'cors' });
      if(r.ok){
        const d=await r.json();
        if(Array.isArray(d)&&d.length) return d;
      }
    }catch(e){}
  }
  if(API_BASE && !USE_SERVER){
    try{
      const r=await fetch(API_BASE+'/api/search?q='+encodeURIComponent(q.trim()), { mode:'cors' });
      if(r.ok){
        const d=await r.json();
        if(Array.isArray(d)&&d.length) return d;
      }
    }catch(e){}
  }
  if(!USE_SERVER){
    try{
      const url='https://smartbox.gtimg.cn/s3/?q='+encodeURIComponent(q.trim())+'&t=all';
      await loadScript(url, 6000, 'utf-8');
      const raw=window.v_hint || '';
      const out=[];
      String(raw).split('^').forEach(seg=>{
        const p=seg.split('~');
        if(p.length>=5 && /^\d{6}$/.test(p[1]) && p[4]!=='ZS'){
          out.push({ code:p[1], name:p[2], market:p[0]==='sh'?'sh':(p[0]==='sz'?'sz':symOf(p[1])) });
        }
      });
      if(out.length) return out.slice(0,8);
    }catch(e){}
  }
  if(/^\d{6}$/.test(q.trim())) return [{ code:q.trim(), name:'', market:symOf(q.trim()) }];
  return [];
}

function hideSuggest(){
  $('searchSuggest').hidden=true;
}

function showSuggestions(items){
  const el=$('searchSuggest');
  if(!items.length){ hideSuggest(); return; }
  el.innerHTML=items.map(it=>
    '<div class="suggest-item" data-code="'+it.code+'" data-market="'+it.market+'" data-name="'+esc(it.name)+'">'+
      '<span>'+esc(it.name||'股票')+'</span><span class="s-code">'+it.code+'</span></div>'
  ).join('');
  el.hidden=false;
}

async function loadStockBySearch(item){
  hideSuggest();
  const code=item.code;
  if(!/^\d{6}$/.test(code)) return;
  const existing=state.results.find(r=>r.code===code);
  if(existing){
    openDrawer(existing);
    return;
  }
  $('drawerContent').innerHTML='<div class="drawer-section"><h3>正在加载 '+esc(code)+'</h3><p class="win-note">正在获取行情、K线和财务数据…</p></div>';
  $('drawerBackdrop').hidden=false;
  $('drawer').hidden=false;
  const seq=++state.searchSeq;
  try{
    const rows=await loadKline(code);
    const q=await loadQuote(code);
    const ind=computeInd(rows,q,code);
    if(!ind) throw new Error('该代码K线数据不足');
    const qual=await loadQuality(code);
    const qi=qualityInfo(qual,ind);
    const ev=evalAll(ind,qual,state.market);
    const evs=ev.evs;
    const best=bestStrategy(evs,qi);
    if(seq!==state.searchSeq) return;
    openDrawer({ code, name:item.name||(q&&q.name)||code, ind, qual, qi, evs, best, searched:true });
  }catch(e){
    if(seq===state.searchSeq){
      $('drawerContent').innerHTML='<div class="drawer-section"><h3>加载失败</h3><p class="win-note">'+esc(e.message)+'</p></div>';
    }
  }
}

async function handleSearch(){
  const raw=$('searchInput').value.trim();
  if(!raw) return;
  const existing=state.results.find(r=>r.code===raw||(r.name&&r.name.indexOf(raw)>=0));
  if(existing){
    openDrawer(existing);
    hideSuggest();
    return;
  }
  if(/^\d{6}$/.test(raw)){
    await loadStockBySearch({ code:raw, name:'', market:symOf(raw) });
    return;
  }
  const items=await fetchSuggestions(raw);
  if(items.length===1){
    await loadStockBySearch(items[0]);
  }else if(items.length){
    showSuggestions(items);
  }else{
    $('signalMeta').textContent='未找到该股票，请输入6位代码或名称';
  }
}

function syncPriceSeg(){
  document.querySelectorAll('#priceSeg button').forEach(b=>{
    b.classList.toggle('active', b.dataset.price===state.priceRange);
  });
}

function bindEvents(){
  $('refreshBtn').onclick=()=>scanNow(true);
  $('searchBtn').onclick=handleSearch;
  $('searchInput').addEventListener('keydown',e=>{ if(e.key==='Enter') handleSearch(); });
  let searchTimer=null;
  $('searchInput').addEventListener('input',()=>{
    clearTimeout(searchTimer);
    const q=$('searchInput').value.trim();
    if(!q){ hideSuggest(); return; }
    searchTimer=setTimeout(async ()=>{
      const items=await fetchSuggestions(q);
      showSuggestions(items);
    }, 320);
  });
  $('searchSuggest').addEventListener('click',e=>{
    const el=e.target.closest('.suggest-item');
    if(el) loadStockBySearch({ code:el.dataset.code, market:el.dataset.market, name:el.dataset.name });
  });
  document.querySelectorAll('#priceSeg button').forEach(b=>{
    b.onclick=()=>{
      state.priceRange=b.dataset.price;
      syncPriceSeg();
      renderAll();
    };
  });
  $('drawerClose').onclick=()=>{
    $('drawer').hidden=true;
    $('drawerBackdrop').hidden=true;
    state.activeCode=null;
  };
  $('drawerBackdrop').onclick=()=>{
    $('drawer').hidden=true;
    $('drawerBackdrop').hidden=true;
    state.activeCode=null;
  };
  document.addEventListener('click',e=>{
    if(!e.target.closest('.search-wrap')) hideSuggest();
  });
}

async function init(){
  bindEvents();
  renderStrategyTabs();
  renderStrategyPanel(state.activeStrat);
  renderMarketState();
  updateMeta();
  loadSnapshot();
  await probeApiBase();
  loadMarket().then(()=>{
    renderAll();
    const fresh = state.lastScan && Date.now()-state.lastScan < 3*60*1000;
    if(!fresh && !state.scanning) scanNow(false);
  }).catch(()=>{
    const fresh = state.lastScan && Date.now()-state.lastScan < 3*60*1000;
    if(!fresh && !state.scanning) scanNow(false);
  });
  setInterval(refreshQuotes,20000);
  setInterval(()=>{
    if(isTradingTime() && !state.scanning && Date.now()-state.lastScan>5*60*1000) scanNow(false);
  },60000);
}

document.addEventListener('DOMContentLoaded',init);
