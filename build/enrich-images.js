// build/enrich-images.js — 위키 이미지 보강
// 빈 boxImage 항목을 Gundam Wiki(Fandom) MediaWiki API로 채운다.
// 전략: 모델번호 정확 매칭만 채택 (오매칭 방지). CC-BY-SA, hotlink 가능.
// 캐시: sources/wiki-cache.json — 재빌드 시 API 재호출 안 함 (예의 + 속도).
//
// 단독 실행: node build/enrich-images.js   (캐시 갱신)
// build.js 에서 자동 호출됨.

const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_PATH = path.join(__dirname, 'sources', 'wiki-cache.json');
const API = 'https://gundam.fandom.com/api.php';
const RATE_MS = 250;               // API 호출 간격 (rate limit 예의)

function get(url){
  return new Promise((resolve,reject)=>{
    https.get(url,{headers:{'User-Agent':'gunpla-log-build/1.0 (personal hobby app)'}},res=>{
      let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve(d));
    }).on('error',reject);
  });
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const norm = s => (s||'').toUpperCase().replace(/[\s\-\/·]/g,'');

// 캐시 로드
function loadCache(){
  try{ return JSON.parse(fs.readFileSync(CACHE_PATH,'utf8')); }
  catch{ return {}; }
}
function saveCache(c){
  fs.mkdirSync(path.dirname(CACHE_PATH),{recursive:true});
  fs.writeFileSync(CACHE_PATH, JSON.stringify(c,null,0));
}

// 한 킷의 이미지를 위키에서 찾기 (모델번호 정확 매칭)
async function findImage(kit){
  const q = kit.modelName;
  const searchUrl = API+'?action=query&list=search&srsearch='+encodeURIComponent(q)+'&srlimit=3&format=json';
  let s;
  try{ s = JSON.parse(await get(searchUrl)); }catch{ return {status:'error'}; }
  const hits = s.query?.search || [];
  if(!hits.length) return {status:'no-hit'};

  // 모델번호가 위키 타이틀에 포함되는 첫 항목
  const mn = norm(kit.modelNumber);
  let best = null;
  if(mn){
    for(const h of hits){ if(norm(h.title).includes(mn)){ best = h; break; } }
  }
  if(!best) return {status:'no-exact', firstTitle:hits[0].title};

  // 대표 이미지 취득
  const imgUrl = API+'?action=query&titles='+encodeURIComponent(best.title)+'&prop=pageimages&piprop=original&format=json';
  let i;
  try{ i = JSON.parse(await get(imgUrl)); }catch{ return {status:'error'}; }
  const page = Object.values(i.query?.pages||{})[0];
  const img = page?.original?.source || '';
  if(!img) return {status:'no-image', title:best.title};
  return {status:'ok', title:best.title, image:img };
}

// kits 배열을 받아 빈 boxImage 를 채운 새 배열 반환
async function enrich(kits, opts={}){
  const cache = loadCache();
  const targets = kits.filter(k => !k.boxImage && k.modelNumber);
  let filled=0, cached=0, skipped=0, apiCalls=0;

  console.log('[enrich] 대상(빈 이미지+번호 있음):', targets.length, '종');

  for(let idx=0; idx<targets.length; idx++){
    const k = targets[idx];
    const key = norm(k.modelNumber)+'|'+norm(k.modelName);

    // 캐시 히트
    if(cache[key] !== undefined){
      if(cache[key]){ k.boxImage = cache[key]; k.imageSource = 'wiki'; filled++; }
      cached++;
      continue;
    }

    // API 호출
    const r = await findImage(k);
    apiCalls++;
    if(r.status === 'ok'){
      cache[key] = r.image;
      k.boxImage = r.image; k.imageSource = 'wiki';
      filled++;
    }else{
      cache[key] = '';  // 실패도 캐시 (재시도 방지)
      skipped++;
    }

    // 진행 로그 + 주기적 캐시 저장 (중단 대비)
    if(apiCalls % 25 === 0){
      console.log('[enrich]  진행', idx+1+'/'+targets.length, '| 채움', filled, '| API', apiCalls);
      saveCache(cache);
    }
    await sleep(RATE_MS);
  }

  saveCache(cache);
  console.log('[enrich] 완료 → 채움', filled, '| 캐시적중', cached, '| 실패', skipped, '| API호출', apiCalls);
  return { kits, stats:{ filled, cached, skipped, apiCalls } };
}

module.exports = { enrich };

// 단독 실행 시: kits.json 을 읽어 보강하고 다시 저장
if(require.main === module){
  (async()=>{
    const dataPath = path.join(__dirname,'..','data','kits.json');
    const kits = JSON.parse(fs.readFileSync(dataPath,'utf8'));
    await enrich(kits);
    fs.writeFileSync(dataPath, JSON.stringify(kits));
    const withImg = kits.filter(k=>k.boxImage).length;
    console.log('[enrich] kits.json 갱신 →', withImg, '/', kits.length, '종 이미지 보유');
  })();
}
