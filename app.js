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
    key:'s1', name:'涨停板首板', short:'首板战法', type:'进攻', hold:'1-3日', color:'#f85149',
    win:'40-50%', winLabel:'3日参考胜率',
    winWhy:'涨停次日低开和炸板是常态，所以胜率天然不高；策略靠盈亏比赚钱。9只低价股回测中，首板次日平均涨幅约+3%~+5%，连板概率约30%，板块效应与封单强度需要人工二次确认。',
    logic:'捕捉第一个涨停板：新资金首次强势介入，通常代表短期趋势反转。用换手率过滤烂板、价格位置过滤追高、波动率收缩确认启动质量，再用质量过滤排除壳股。',
    conds:['今日涨停且前5日未涨停','换手率 5%-15%','60日价格位置 ≤50%','波动率收缩（ATR20低于前期）','5日均额 ≥3000万','量比 ≥2','净利>0 且 负债率<70%','板块效应/封单强度（人工）'],
    ops:{ entry:'次日低开≤2%低吸；高开3%-5%只观察；高开>5%不追', stop:'-3%硬止损，或跌破首板价-3%', target:'+5%减半，+8%清仓；次日不涨停尾盘卖', hold:'1-3日', pos:'≤15%（龙头可20%）' },
    note:'首板当日不追高；封单与板块效应未确认前按弱信号处理。'
  },
  2: {
    key:'s2', name:'低位启动放量', short:'低位放量', type:'进攻', hold:'3-5日', color:'#3fb950',
    win:'56.0%', winLabel:'3日回测胜率',
    winWhy:'25个回测信号中，3日胜率56.0%、平均收益+1.08%、盈亏比1.42:1。加入放量过滤后，3日胜率从52.2%提升到56.0%，平均收益从+0.41%提升到+1.08%，假信号减少约46%。',
    logic:'股价处于60日低位区，说明经过充分调整；此时出现放量阳线并站上MA5，代表短期多头开始介入。质量与流动性过滤排除僵尸股和低位垃圾股。',
    conds:['60日价格位置 ≤30%','放量阳线：涨幅≥2%且收>开','收盘站上MA5','5日均额 ≥3000万','ROE≥5% 且 净利>0','MACD红柱（加分）'],
    ops:{ entry:'尾盘确认阳线后买入；或次日回踩MA5不破加仓', stop:'-3%硬止损，或跌破信号日最低价', target:'+5%减半，+8%清仓；5日不涨即走', hold:'3-5日', pos:'≤15%（回测最优可到20%）' },
    note:'低位还有低位，必须严格止损；中证1000跌破MA60时策略禁用。'
  },
  3: {
    key:'s3', name:'超跌反弹', short:'超跌反弹', type:'机会', hold:'1-5日', color:'#b58cff',
    win:'40-45%', winLabel:'历史参考胜率',
    winWhy:'超跌反弹是逆势接飞刀，胜率天然偏低；但止跌阳线+放量确认后盈亏比可达1.8~2.5:1，靠“小亏多次、大赚一次”盈利。当前小样本回测只有1个信号且失败，统计意义不足。',
    logic:'10日跌15%-30%后，RSI6进入超卖区；出现放量止跌阳线意味着空头短期耗尽，容易触发技术性反弹。只做系统性错杀，不做基本面恶化。',
    conds:['10日跌幅 -15%~-30%','RSI6 ≤30 超卖','止跌阳线：收>开 且 最低价高于前日','成交量 ≥前日1.5倍','5日均额 ≥3000万','净利>0 且 负债率<70%'],
    ops:{ entry:'超跌后第一根放量阳线尾盘轻仓；次日回踩阳线低点不破加仓', stop:'跌破阳线最低价，或-3%硬止损', target:'+5%减半，+8%清仓；5日不涨即走', hold:'1-5日', pos:'≤10%，最多2只' },
    note:'不碰ST、退市风险、重大利空、持续弱势板块；新手优先使用策略2。'
  },
  4: {
    key:'s4', name:'相对动量质量', short:'相对动量', type:'进攻', hold:'5-20日', color:'#4cc9f0',
    win:'59.4%', winLabel:'月度回测胜率',
    winWhy:'58只A股、32个月回测中月度胜率59.4%，总收益+21.7%。质量因子过滤垃圾股、动量因子捕捉趋势，两者交集降低假信号；但夏普仅0.35，必须配合市场择时避免追顶。',
    logic:'60-120日相对动量>5%证明中期趋势存在，叠加ROE≥8%、负债率<60%的质量约束，只买“趋势中的好公司”，并在均线多头排列、量价配合时确认。',
    conds:['60-120日相对动量 >5%','MA5>MA10>MA20 多头排列','收盘站上MA20/MA60','5日均额 ≥3000万','ROE≥8% 且 负债率<60%','5日均量 >20日均量×1.2'],
    ops:{ entry:'回踩MA10/MA20分批低吸，不追高', stop:'-5%硬止损，或动量转负离场', target:'+8%减半，+12%清仓；持有到期动量转弱离场', hold:'5-20日', pos:'≤15%' },
    note:'A股动量是环境依赖因子，进攻态才启用，空仓态禁用。'
  },
  5: {
    key:'s5', name:'高股息防守', short:'防守波段', type:'防守', hold:'1-4周', color:'#f0b429',
    win:'防守型', winLabel:'控回撤优先',
    winWhy:'防守策略不追求胜率，目标是市场调整期减少亏损：参考历史经验，调整期回撤控制在-5%~-10%，显著跑赢指数；正常市会跑输进攻策略，所以默认不启用。',
    logic:'在市场调整期，用高股息、低估值、低波动、真正防守板块（银行/电力/公用/必选消费）控制回撤；质量+股息双过滤排除“借债分红”陷阱。',
    conds:['收盘>MA60','ATR20收缩','换手率<8%','PE(TTM)>0且≤20','ROE≥8%、负债率<70%','股息率≥4%（需人工确认）','价格≤10元'],
    ops:{ entry:'调整期分批建仓，分2-3次，不追高', stop:'-5%硬止损', target:'+8%~+12%止盈，环境改善立即卖出', hold:'1-4周，最长8周', pos:'≤20%（单只≤10%）' },
    note:'煤炭/石油/钢铁是周期股不是防守股；当前若为进攻态，本策略默认观察。'
  }
};

const LEVEL_TEXT = { strong:'强', medium:'中', weak:'弱', none:'无' };
const state = {
  poolMode:'lt10',
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
const USE_SERVER = (typeof location!=='undefined') && (location.protocol==='http:'||location.protocol==='https:');

const $ = id => document.getElementById(id);
const fmt = (n,d) => { if(n==null||isNaN(+n)) return '-'; return (+n).toFixed(d==null?2:d); };
const cls = p => p>0?'up':(p<0?'down':'flat');
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;

function maOf(arr,p,idx){ if(idx+1<p) return null; let s=0; for(let i=idx-p+1;i<=idx;i++) s+=arr[i]; return s/p; }
function atrOf(rows){
  if(rows.length<21) return null;
  let s=0;
  for(let i=rows.length-20;i<rows.length;i++){
    const tr=Math.max(rows[i].high-rows[i].low, Math.abs(rows[i].high-rows[i-1].close), Math.abs(rows[i].low-rows[i-1].close));
    s+=tr;
  }
  return s/20;
}
function rsiOf(closes,p){
  if(closes.length<p+1) return null;
  let g=0,l=0;
  for(let i=closes.length-p;i<closes.length;i++){
    const d=closes[i]-closes[i-1];
    if(d>=0) g+=d; else l-=d;
  }
  return g+l===0 ? 50 : 100*g/(g+l);
}
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
  const out={};
  const CH=8;
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
        if(Array.isArray(arr)) return arr;
      }
    }catch(e){}
  }
  const out=[];
  const num=80;
  const maxPages = mode==='lt10' ? 40 : 12;
  const sort = mode==='lt10' ? 'trade' : 'amount';
  const asc = mode==='lt10' ? 1 : 0;
  for(let page=1;page<=maxPages;page++){
    const base='https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page='+page+'&num='+num+'&sort='+sort+'&asc='+asc+'&node=hs_a&symbol=&_s_r_a=page';
    let arr=null;
    try{
      const cb='poolcb_'+page+'_'+Date.now();
      arr=await fetchJson(base, cb, 4000);
    }catch(e){ break; }
    if(!arr||!arr.length) break;
    arr.forEach(x=>{
      const price=+x.trade;
      if(!x.code||!price||/ST|退/.test(x.name||'')) return;
      if(mode==='lt10' && price>=10) return;
      out.push({ code:x.code, name:x.name, price, amount:x.amount||0 });
    });
    if(arr.length<num) break;
  }
  const seen=new Set();
  const uniq=out.filter(s=>{
    if(seen.has(s.code)) return false;
    seen.add(s.code);
    return true;
  });
  return uniq.sort((a,b)=>(b.amount||0)-(a.amount||0)).slice(0,160);
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
  const scode = code.startsWith('6') ? code+'.SH' : code+'.SZ';
  const url='https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECUCODE%3D%22'+scode+'%22)&pageNumber=1&pageSize=2&sortTypes=-1&sortColumns=REPORT_DATE';
  try{
    const data=await fetchJson(url);
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
  const out={};
  const CH=6;
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
    const atr=atrOf(rows);
    const dailyVol=atr&&cur>0 ? atr/cur*100 : null;
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
  const r6=rsiOf(closes,6);
  const atr=atrOf(rows);
  let atrLong=atr;
  if(rows.length>=61){
    let s=0;
    for(let i=rows.length-60;i<rows.length;i++){
      const r=rows[i], p=rows[i-1];
      const tr=Math.max(r.high-r.low, Math.abs(r.high-p.close), Math.abs(r.low-p.close));
      s+=tr;
    }
    atrLong=s/60;
  }
  const lowVol = atr!=null&&atrLong!=null ? atr<atrLong : null;
  const annVol = atr!=null&&price>0 ? atr/price*Math.sqrt(250)*100 : null;
  const prevVol = idx>0 ? rows[idx-1].volume : 0;
  const lastVol = quote&&quote.volume ? +quote.volume : (rows[idx]?rows[idx].volume:0);
  const volRatio = prevVol>0 ? lastVol/prevVol : null;
  const amt5 = quote&&quote.amount_wan!=null ? +quote.amount_wan*10000 : vol5*100*price;
  const limitPct = code.startsWith('3')||code.startsWith('68') ? 19.6 : 9.8;
  const limitToday = pct>=limitPct;
  let limit5=false;
  for(let i=Math.max(1,idx-4);i<idx;i++){
    if(closes[i]&&closes[i-1]&&(closes[i]/closes[i-1]-1)*100>=limitPct){ limit5=true; break; }
  }
  const e12=emaArr(closes,12), e26=emaArr(closes,26);
  const dif=closes.map((_,i)=>e12[i]-e26[i]);
  const dea=emaArr(dif,9);
  const macdBull=dif[idx]>dea[idx];
  return {
    code, name:quote?quote.name:'', price, pct, open:rows[idx].open, close:closes[idx],
    high:rows[idx].high, low:rows[idx].low, prevLow:idx>0?rows[idx-1].low:null,
    pos60, ma5, ma10, ma20, ma60, vol5, vol20, chg10, chg60, chg120, r6, atr, annVol,
    lowVol, volRatio, amt5, turnover:quote?quote.turnover:null, pe:quote?quote.pe:null,
    pb:quote?quote.pb:null, vol_ratio:quote?quote.vol_ratio:null,
    limitToday, limit5, macdBull, amount_wan:quote?quote.amount_wan:null
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
  const grade=score>=9?'A':score>=7?'B':score>=5?'C':'D';
  const label=grade==='A'?'优质':grade==='B'?'良好':grade==='C'?'一般':'偏弱';
  return { score, max:12, grade, label, details:[] };
}

function qPass(q,roeMin,debtMax){
  return !!(q && q.ok && q.profit>0 && (q.roe==null||q.roe>=roeMin) && (q.debt==null||q.debt<debtMax));
}

function evalS1(ind,q){
  const first = ind.limitToday && !ind.limit5;
  const turn = ind.turnover!=null && ind.turnover>=5 && ind.turnover<=15;
  const pos = ind.pos60<=50;
  const low = ind.lowVol===true;
  const liq = ind.amt5!=null && ind.amt5>=3000e4;
  const vr = ind.vol_ratio!=null ? ind.vol_ratio>=2 : (ind.volRatio!=null && ind.volRatio>=2);
  const quality = qPass(q,0,70);
  const checks = [
    { label:'今日首板（涨停且前5日未涨停）', pass:first, val:first?'是':'否' },
    { label:'换手率 5%-15%', pass:turn, val:ind.turnover!=null?ind.turnover.toFixed(1)+'%':'无数据' },
    { label:'60日价格位置 ≤50%', pass:pos, val:ind.pos60.toFixed(0)+'%' },
    { label:'波动率收缩', pass:low, val:ind.lowVol==null?'数据不足':low?'收缩':'放大' },
    { label:'5日均额 ≥3000万', pass:liq, val:fmtAmt(ind.amt5) },
    { label:'量比 ≥2', pass:vr, val:ind.vol_ratio!=null?ind.vol_ratio.toFixed(2):(ind.volRatio!=null?ind.volRatio.toFixed(2)+'x':'无数据') },
    { label:'质量：净利>0、负债率<70%', pass:quality, val:q&&q.ok?'ROE '+fmt(q.roe,1)+'% / 负债 '+fmt(q.debt,1)+'%':'无数据' },
    { label:'板块效应/封单强度', pass:false, manual:true, val:'需人工确认' }
  ];
  const auto=[first,turn,pos,low,liq,vr,quality].filter(Boolean).length;
  const score=Math.round(auto/7*100);
  const level = first ? (auto>=6?'strong':auto>=4?'medium':'weak') : 'none';
  return { key:1, level, score, checks, pass:first&&auto>=4 };
}

function evalS2(ind,q,market){
  const c1=ind.pos60<=30;
  const c2=ind.pct>=2 && ind.close>ind.open;
  const c3=ind.close>ind.ma5;
  const c4=ind.amt5!=null && ind.amt5>=3000e4;
  const c5=qPass(q,5,70);
  const c6=ind.chg60!=null && ind.chg60<0;
  const c7=ind.macdBull;
  const cMkt=market.aboveMa60!==false;
  const checks=[
    { label:'60日价格位置 ≤30%', pass:c1, val:ind.pos60.toFixed(0)+'%' },
    { label:'放量阳线：涨幅≥2%且收>开', pass:c2, val:(ind.pct>=0?'+':'')+ind.pct.toFixed(2)+'%' },
    { label:'收盘站上MA5', pass:c3, val:'收 '+fmt(ind.close)+' / MA5 '+fmt(ind.ma5) },
    { label:'5日均额 ≥3000万', pass:c4, val:fmtAmt(ind.amt5) },
    { label:'ROE≥5% 且 净利>0', pass:c5, val:q&&q.ok?'ROE '+fmt(q.roe,1)+'%':'无数据' },
    { label:'60日处于低位（加分）', pass:c6, val:ind.chg60!=null?ind.chg60.toFixed(1)+'%':'无数据' },
    { label:'MACD红柱（加分）', pass:c7, val:c7?'是':'否' },
    { label:'大盘过滤：中证1000站上MA60', pass:cMkt, val:market.aboveMa60==null?'数据不足':cMkt?'站上':'下方·禁用' }
  ];
  const core=[c1,c2,c3,c4,c5,c6].filter(Boolean).length;
  const score=Math.round(core/6*100);
  let level='none';
  if(c1&&c2&&c3&&c4&&c5&&cMkt) level='strong';
  else if(c1&&c2&&c3&&c4&&core>=4) level='medium';
  else if(c1&&c2&&c3) level='weak';
  if(level!=='none' && level!=='weak' && !cMkt) level='weak';
  return { key:2, level, score, checks, pass:c1&&c2&&c3&&c4&&c5 };
}

function evalS3(ind,q){
  const c1=ind.chg10!=null && ind.chg10<=-15 && ind.chg10>=-30;
  const c2=ind.r6!=null && ind.r6<=30;
  const c3=ind.close>ind.open && ind.prevLow!=null && ind.low>ind.prevLow;
  const c4=ind.volRatio!=null && ind.volRatio>=1.5;
  const c5=ind.amt5!=null && ind.amt5>=3000e4;
  const c6=qPass(q,0,70);
  const checks=[
    { label:'10日跌幅 -15%~-30%', pass:c1, val:ind.chg10!=null?ind.chg10.toFixed(1)+'%':'无数据' },
    { label:'RSI6 ≤30 超卖', pass:c2, val:ind.r6!=null?ind.r6.toFixed(0):'无数据' },
    { label:'止跌阳线：收>开且低点抬高', pass:c3, val:ind.prevLow!=null?'低 '+fmt(ind.low)+' / 前低 '+fmt(ind.prevLow):'无数据' },
    { label:'成交量 ≥前日1.5倍', pass:c4, val:ind.volRatio!=null?ind.volRatio.toFixed(2)+'x':'无数据' },
    { label:'5日均额 ≥3000万', pass:c5, val:fmtAmt(ind.amt5) },
    { label:'净利>0 且 负债率<70%', pass:c6, val:q&&q.ok?'ROE '+fmt(q.roe,1)+'% / 负债 '+fmt(q.debt,1)+'%':'无数据' }
  ];
  const core=[c1,c2,c3,c4,c5,c6].filter(Boolean).length;
  const score=Math.round(core/6*100);
  let level='none';
  if(c1&&c2&&c3&&c4&&c5&&c6) level='strong';
  else if(c1&&c2&&c3&&c4&&core>=4) level='medium';
  else if(c1&&c2&&c3) level='weak';
  return { key:3, level, score, checks, pass:c1&&c2&&c3&&c4 };
}

function evalS4(ind,q){
  const rel = ind.chg60!=null&&ind.chg120!=null ? (ind.chg60+ind.chg120)/2 : null;
  const c1=rel!=null && rel>5;
  const c2=ind.ma5>ind.ma10 && ind.ma10>ind.ma20;
  const c3=ind.close>ind.ma20 && ind.close>ind.ma60;
  const c4=ind.amt5!=null && ind.amt5>=3000e4;
  const c5=qPass(q,8,60);
  const c6=ind.vol20>0 && ind.vol5>ind.vol20*1.2;
  const checks=[
    { label:'60-120日相对动量 >5%', pass:c1, val:rel!=null?rel.toFixed(1)+'%':'无数据' },
    { label:'MA5>MA10>MA20 多头排列', pass:c2, val:'M5 '+fmt(ind.ma5)+' / M10 '+fmt(ind.ma10)+' / M20 '+fmt(ind.ma20) },
    { label:'收盘站上MA20/MA60', pass:c3, val:'MA20 '+fmt(ind.ma20)+' / MA60 '+fmt(ind.ma60) },
    { label:'5日均额 ≥3000万', pass:c4, val:fmtAmt(ind.amt5) },
    { label:'ROE≥8% 且 负债率<60%', pass:c5, val:q&&q.ok?'ROE '+fmt(q.roe,1)+'% / 负债 '+fmt(q.debt,1)+'%':'无数据' },
    { label:'5日均量 >20日均量×1.2', pass:c6, val:(ind.vol20>0?(ind.vol5/ind.vol20).toFixed(2)+'x':'无数据') }
  ];
  const core=[c1,c2,c3,c4,c5,c6].filter(Boolean).length;
  const score=Math.round(core/6*100);
  let level='none';
  if(c1&&c2&&c3&&c4&&c5) level='strong';
  else if(c1&&c4&&c5&&(c2||c3)) level='medium';
  else if(c1&&c4) level='weak';
  return { key:4, level, score, checks, pass:c1&&c4&&c5 };
}

function evalS5(ind,q,market){
  const c1=ind.close>ind.ma60;
  const c2=ind.lowVol===true;
  const c3=ind.turnover!=null && ind.turnover<8;
  const c4=ind.pos60<60;
  const c5=ind.chg60!=null && ind.chg60>-10;
  const c6=qPass(q,8,70);
  const c7=ind.pe!=null && ind.pe>0 && ind.pe<=20;
  const c8=ind.price<=10;
  const checks=[
    { label:'收盘>MA60', pass:c1, val:'MA60 '+fmt(ind.ma60) },
    { label:'ATR20收缩（低波动）', pass:c2, val:ind.lowVol==null?'数据不足':c2?'收缩':'放大' },
    { label:'换手率<8%', pass:c3, val:ind.turnover!=null?ind.turnover.toFixed(1)+'%':'无数据' },
    { label:'60日位置<60%', pass:c4, val:ind.pos60.toFixed(0)+'%' },
    { label:'60日未深跌（>-10%）', pass:c5, val:ind.chg60!=null?ind.chg60.toFixed(1)+'%':'无数据' },
    { label:'ROE≥8%、负债率<70%', pass:c6, val:q&&q.ok?'ROE '+fmt(q.roe,1)+'% / 负债 '+fmt(q.debt,1)+'%':'无数据' },
    { label:'PE(TTM)>0且≤20', pass:c7, val:ind.pe!=null?fmt(ind.pe,1):'无数据' },
    { label:'价格≤10元', pass:c8, val:fmt(ind.price)+'元' },
    { label:'股息率≥4%', pass:false, manual:true, val:'需人工确认' }
  ];
  const core=[c1,c2,c3,c4,c5,c6,c7,c8].filter(Boolean).length;
  const score=Math.round(core/8*100);
  let level='none';
  if(c1&&c2&&c3&&c6&&c7&&c8&&c4&&c5) level='strong';
  else if(c1&&c6&&c7&&c8) level='medium';
  else if(c1&&(c6||c7)) level='weak';
  if(level!=='none' && market.state==='attack') level='weak';
  return { key:5, level, score, checks, pass:c1&&c6&&c7&&c8 };
}

function evalAll(ind,q,market){
  return {
    1:evalS1(ind,q),
    2:evalS2(ind,q,market),
    3:evalS3(ind,q),
    4:evalS4(ind,q),
    5:evalS5(ind,q,market)
  };
}

function buyVerdict(k,level,qi,market){
  if(level==='none') return '暂不';
  if(market.state==='empty' && k!==5) return '暂不';
  if(k===3||k===5) return level==='strong'?'可小仓':(level==='medium'?'观察':'暂不');
  if(level==='strong') return (qi&&qi.score>=7)?'可买':'可小仓';
  if(level==='medium') return '可小仓';
  return '观察';
}

function needsQuality(ind){
  const rel = ind.chg60!=null&&ind.chg120!=null ? (ind.chg60+ind.chg120)/2 : null;
  const s1 = ind.limitToday && !ind.limit5;
  const s2 = ind.pos60<=30 && ind.pct>=2 && ind.close>ind.open && ind.close>ind.ma5;
  const s3 = ind.chg10!=null&&ind.chg10<=-15&&ind.chg10>=-30 && ind.r6!=null&&ind.r6<=30 && ind.close>ind.open && ind.prevLow!=null && ind.low>ind.prevLow;
  const s4 = rel!=null && rel>5 && ind.amt5!=null && ind.amt5>=3000e4;
  const s5 = ind.close>ind.ma60 && ind.pe!=null && ind.pe>0 && ind.pe<=20 && ind.price<=10;
  return s1||s2||s3||s4||s5;
}

function opPlan(k,ind){
  const p=ind.price||0;
  const f=n=>fmt(n,2);
  const plans={
    1:{
      entry:'次日低开≤2%低吸（'+f(p*0.98)+'附近）；高开3%-5%观察；>5%不追',
      stop:'止损 '+f(p*0.97)+'（-3%），或跌破首板价-3%',
      target:'目标 '+f(p*1.05)+'（+5%）减半 / '+f(p*1.08)+'（+8%）清仓',
      hold:'1-3日', pos:'≤15%（龙头可20%）'
    },
    2:{
      entry:'尾盘确认阳线买入；次日回踩MA5（'+f(ind.ma5)+'附近）不破加仓',
      stop:'止损 '+f(p*0.97)+'（-3%），或跌破信号日最低价 '+f(ind.low),
      target:'目标 '+f(p*1.05)+'（+5%）减半 / '+f(p*1.08)+'（+8%）清仓',
      hold:'3-5日', pos:'≤15%（可到20%）'
    },
    3:{
      entry:'放量阳线尾盘轻仓；次日回踩阳线低点 '+f(ind.low)+' 不破加仓',
      stop:'跌破 '+f(ind.low)+' 或止损 '+f(p*0.97)+'（-3%）',
      target:'目标 '+f(p*1.05)+'（+5%）减半 / '+f(p*1.08)+'（+8%）清仓',
      hold:'1-5日', pos:'≤10%'
    },
    4:{
      entry:'回踩MA10（'+f(ind.ma10)+'）/MA20（'+f(ind.ma20)+'）分批低吸',
      stop:'止损 '+f(p*0.95)+'（-5%）',
      target:'目标 '+f(p*1.08)+'（+8%）减半 / '+f(p*1.12)+'（+12%）清仓',
      hold:'5-20日', pos:'≤15%'
    },
    5:{
      entry:'调整期分批建仓，分2-3次，不追高',
      stop:'止损 '+f(p*0.95)+'（-5%）',
      target:'目标 '+f(p*1.08)+'~'+f(p*1.12)+'（+8%~+12%）',
      hold:'1-4周，最长8周', pos:'≤20%（单只≤10%）'
    }
  };
  return plans[k]||plans[1];
}

function bestStrategy(evs,qi){
  const order=[2,1,4,3,5];
  let best=null;
  for(const k of order){
    const e=evs[k];
    if(!e||e.level==='none') continue;
    const s=e.score+(qi?qi.score:0)*0.5;
    if(!best||s>best._score) best=Object.assign({},e,{ _score:s });
  }
  return best;
}

function renderIndices(qs){
  const cards=INDEX_CODES.map(it=>{
    const q=qs[it.sym];
    if(!q||!q.price) return '<div class="idx-card"><div class="i-name">'+it.name+'</div><div class="i-price">--</div></div>';
    return '<div class="idx-card"><div class="i-name">'+it.name+'</div>'+
      '<div class="i-price '+cls(q.pct)+'">'+fmt(q.price)+'</div>'+
      '<div class="i-pct '+cls(q.pct)+'">'+(q.pct>0?'+':'')+fmt(q.pct,2)+'%</div></div>';
  }).join('');
  $('indexCards').innerHTML=cards;
}

function renderMarketState(){
  const ms=state.market.state;
  const map={
    attack:{ label:'进攻态', detail:'指数动量+低波，可进攻但严格止损', className:'attack' },
    defense:{ label:'防御态', detail:'降低仓位，防守优先', className:'defense' },
    empty:{ label:'空仓态', detail:'等待企稳，不抄底', className:'empty' },
    unknown:{ label:'计算中', detail:'--', className:'' }
  };
  const m=map[ms]||map.unknown;
  const el=$('marketStateValue');
  el.textContent=m.label;
  el.className='ms-value '+m.className;
  $('marketStateDetail').textContent=m.detail;
}

function renderStrategyCards(){
  const counts={1:0,2:0,3:0,4:0,5:0};
  state.results.forEach(r=>{
    for(const k of Object.keys(counts)){
      if(r.evs[k]&&r.evs[k].level!=='none') counts[k]++;
    }
  });
  $('strategyCards').innerHTML=Object.keys(STRATS).map(k=>{
    const s=STRATS[k];
    return '<div class="strat-card" style="--accent:'+s.color+'" data-strat="'+k+'" onclick="switchStratTab('+k+')">'+
      '<div class="s-type">'+s.type+' · '+s.hold+'</div>'+
      '<div class="s-name">'+s.name+'</div>'+
      '<div class="s-win">'+s.win+'</div>'+
      '<div class="s-win-label">'+s.winLabel+'</div>'+
      '<div class="s-count">当前信号 '+counts[k]+' 只</div></div>';
  }).join('');
}

function switchStratTab(k){
  state.activeStrat=+k;
  renderStrategyTabs();
  renderStrategyPanel(state.activeStrat);
}

function renderSignalPool(){
  const rows=[];
  state.results.forEach(r=>{
    const active=Object.keys(r.evs).map(k=>r.evs[k]).filter(e=>e.level!=='none');
    if(!active.length) return;
    const best=r.best;
    if(!best) return;
    const op=opPlan(best.key,r.ind);
    const score=best.score+(r.qi?r.qi.score:0)*0.5+(r.ind.pct||0)*0.15;
    rows.push({ r, active, op, score });
  });
  rows.sort((a,b)=>b.score-a.score);
  const meta='候选池 '+state.results.length+' 只 · 命中 '+rows.length+' 只 · 扫描 '+state.scanTime;
  $('signalMeta').textContent=meta;
  const body=$('signalBody');
  if(!rows.length){
    body.innerHTML='<tr class="empty-row"><td colspan="12">当前候选池暂无信号，点击“立即扫描”获取实时数据。</td></tr>';
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

function renderDrawer(stock){
  const ind=stock.ind, qi=stock.qi, q=stock.qual;
  const active=Object.keys(stock.evs).map(k=>stock.evs[k]).filter(e=>e.level!=='none');
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
      statBox('10日涨幅', ind.chg10!=null?fmt(ind.chg10,1)+'%':'-')+
      statBox('60日动量', ind.chg60!=null?fmt(ind.chg60,1)+'%':'-')+
      statBox('120日动量', ind.chg120!=null?fmt(ind.chg120,1)+'%':'-')+
    '</div>'+
    '<div class="drawer-section"><h3>质量评分 <span class="chip qual-'+String(qi.grade).toLowerCase()+'">'+qi.grade+' · '+qi.label+'</span></h3>'+
      '<div class="quality-meter"><i style="width:'+Math.min(100,Math.round(qi.score/12*100))+'%"></i></div>'+
      '<div class="win-note">'+qualityLine(q)+'</div></div>'+
    '<div class="drawer-section"><h3>策略信号</h3><div class="strategy-list">'+
      Object.keys(STRATS).map(k=>{
        const s=STRATS[k], e=stock.evs[k];
        const level=e.level;
        return '<div class="strategy-row" style="--accent:'+s.color+'">'+
          '<div class="top"><div><span class="s-name">'+s.name+'</span> <span class="s-score">'+s.type+' · '+s.hold+'</span></div>'+
          '<div><span class="chip '+level+'">'+LEVEL_TEXT[level]+'</span> <span class="chip '+(buyVerdict(k,level,qi,state.market)==='暂不'?'no':buyVerdict(k,level,qi,state.market)==='可买'?'buy':'small')+'">'+buyVerdict(k,level,qi,state.market)+'</span></div></div>'+
          '<div class="s-score">得分 '+e.score+'/100</div>'+checkListHtml(e)+'</div>';
      }).join('')+
    '</div></div>'+
    (op?'<div class="drawer-section"><h3>建议操作 · '+STRATS[best.key].name+' <span class="chip '+vc+'">'+verdict+'</span></h3>'+
      '<p class="win-note" style="margin-bottom:8px">'+verdictWhy(best,qi,state.market)+'</p>'+
      '<div class="op-grid">'+opBox('介入方式',op.entry)+opBox('止损',op.stop)+opBox('止盈',op.target)+opBox('持仓周期',op.hold)+opBox('仓位',op.pos)+opBox('最终判断','<span class="chip '+vc+'">'+verdict+'</span>')+'</div>'+
      '<div class="win-note"><strong>胜率参考：</strong>'+STRATS[best.key].win+'（'+STRATS[best.key].winLabel+'）<br>'+STRATS[best.key].winWhy+'</div></div>':'')+
    '<div class="win-note">以上为系统规则计算结果，不构成投资建议；实盘请二次确认人工条件。</div>';
  $('drawerContent').innerHTML=html;
}

function statBox(k,v){
  return '<div class="stat-box"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>';
}
function opBox(k,v){
  return '<div class="op-box"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>';
}
function qualityLine(q){
  if(!q||!q.ok) return '暂无F10财务数据，质量分按技术面近似。';
  return 'ROE '+fmt(q.roe,2)+'% · 归母净利 '+fmt(q.profit/1e8,2)+'亿 · 负债率 '+fmt(q.debt,1)+'% · 净利同比 '+(q.profitGrowth!=null?fmt(q.profitGrowth,1)+'%':'-')+' · 营收同比 '+(q.revGrowth!=null?fmt(q.revGrowth,1)+'%':'-');
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
  if(market.state==='attack'&&best.key===5) parts.push('进攻态下防守策略默认观察');
  return parts.join('，')+'。';
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
  const rows=state.results.filter(r=>r.evs[k]&&r.evs[k].level!=='none').sort((a,b)=>b.evs[k].score-a.evs[k].score).slice(0,12);
  let html='<div class="sp-grid">'+
    '<div class="sp-block"><h3>策略逻辑</h3><p>'+s.logic+'</p>'+
    '<h3 style="margin-top:12px">触发条件</h3><ul>'+s.conds.map(c=>'<li>'+c+'</li>').join('')+'</ul>'+
    '<div class="sp-win"><div><div class="rate" style="color:'+s.color+'">'+s.win+'</div><div class="win-note">'+s.winLabel+'</div></div>'+
    '<div class="why">'+s.winWhy+'</div></div></div>'+
    '<div class="sp-block"><h3>操作纪律</h3>'+
    '<table class="sp-ops-table"><tbody>'+
      '<tr><th>介入</th><td>'+s.ops.entry+'</td></tr>'+
      '<tr><th>止损</th><td>'+s.ops.stop+'</td></tr>'+
      '<tr><th>止盈</th><td>'+s.ops.target+'</td></tr>'+
      '<tr><th>周期</th><td>'+s.ops.hold+'</td></tr>'+
      '<tr><th>仓位</th><td>'+s.ops.pos+'</td></tr>'+
    '</tbody></table>'+
    '<p class="win-note" style="margin-top:10px">'+s.note+'</p></div></div>';
  if(rows.length){
    html+='<div class="sp-signals"><table class="data-table"><thead><tr>'+
      '<th>代码</th><th>名称</th><th>现价</th><th>涨跌幅</th><th>信号</th><th>得分</th><th>质量</th><th>能否买</th><th>止损</th><th>止盈</th></tr></thead><tbody>'+
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
          '<td>'+esc(op.stop)+'</td><td>'+esc(op.target)+'</td></tr>';
      }).join('')+'</tbody></table></div>';
  }else{
    html+='<p class="win-note" style="margin-top:12px">当前候选池暂无该策略信号。</p>';
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
    const pool=await loadPool(state.poolMode);
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
      const evs=evalAll(x.ind,qual,state.market);
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
    localStorage.setItem('rtShortScan', JSON.stringify({
      t:state.scanTime,
      pool:state.poolMode,
      results:state.results.map(r=>({ code:r.code, name:r.name, ind:r.ind, qual:r.qual, qi:r.qi, evs:r.evs, best:r.best }))
    }));
  }catch(e){}
}

function loadSnapshot(){
  try{
    const raw=localStorage.getItem('rtShortScan');
    if(!raw) return false;
    const snap=JSON.parse(raw);
    if(!snap.results||!snap.results.length) return false;
    state.results=snap.results;
    state.scanTime=snap.t||'历史快照';
    state.poolMode=snap.pool||'lt10';
    syncPoolSeg();
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
    }
  });
  renderSignalPool();
  renderStrategyCards();
  if(state.activeCode){
    const st=state.results.find(r=>r.code===state.activeCode);
    if(st && !$('drawer').hidden) renderDrawer(st);
  }
}

async function handleSearch(){
  const raw=$('searchInput').value.trim();
  if(!raw) return;
  const existing=state.results.find(r=>r.code===raw||(r.name&&r.name.indexOf(raw)>=0));
  if(existing){
    openDrawer(existing);
    return;
  }
  if(!/^\d{6}$/.test(raw)){
    $('searchInput').value='';
    $('signalMeta').textContent='请输入6位股票代码';
    return;
  }
  $('drawerContent').innerHTML='<div class="drawer-section"><h3>正在加载 '+esc(raw)+'</h3><p class="win-note">正在获取行情、K线和财务数据…</p></div>';
  $('drawerBackdrop').hidden=false;
  $('drawer').hidden=false;
  const seq=++state.searchSeq;
  try{
    const rows=await loadKline(raw);
    const q=await loadQuote(raw);
    const ind=computeInd(rows,q,raw);
    if(!ind) throw new Error('该代码无足够K线数据');
    const qual=await loadQuality(raw);
    const qi=qualityInfo(qual,ind);
    const evs=evalAll(ind,qual,state.market);
    const best=bestStrategy(evs,qi);
    if(seq!==state.searchSeq) return;
    openDrawer({ code:raw, name:(q&&q.name)||raw, ind, qual, qi, evs, best });
  }catch(e){
    if(seq===state.searchSeq){
      $('drawerContent').innerHTML='<div class="drawer-section"><h3>加载失败</h3><p class="win-note">'+esc(e.message)+'</p></div>';
    }
  }
}

function syncPoolSeg(){
  document.querySelectorAll('#poolSeg button').forEach(b=>{
    b.classList.toggle('active', b.dataset.pool===state.poolMode);
  });
}

function bindEvents(){
  $('refreshBtn').onclick=()=>scanNow(true);
  $('searchBtn').onclick=handleSearch;
  $('searchInput').addEventListener('keydown',e=>{ if(e.key==='Enter') handleSearch(); });
  document.querySelectorAll('#poolSeg button').forEach(b=>{
    b.onclick=()=>{
      state.poolMode=b.dataset.pool;
      syncPoolSeg();
      scanNow(true);
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
}

function init(){
  bindEvents();
  renderStrategyTabs();
  renderStrategyPanel(state.activeStrat);
  renderMarketState();
  updateMeta();
  loadSnapshot();
  loadMarket().then(()=>{
    renderAll();
    if(!state.scanning) scanNow(false);
  }).catch(()=>{
    if(!state.scanning) scanNow(false);
  });
  setInterval(refreshQuotes,20000);
  setInterval(()=>{
    if(isTradingTime() && !state.scanning && Date.now()-state.lastScan>5*60*1000) scanNow(false);
  },60000);
}

document.addEventListener('DOMContentLoaded',init);
