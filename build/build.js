// build/build.js — 빌드 오케스트레이터
// 실행: node build/build.js
// 흐름: 어댑터 실행 → normalize → 병합(우선순위) → ID 부여 → kits.json + meta.json

const fs = require('fs');
const path = require('path');
const { normalize, dedupKey, GRADES, SERIES } = require('./schema');

// 소스 우선순위 (뒤일수록 우선 = 덧입힘). korean-curated가 gunpladb 위에 정보 덮음.
const ADAPTERS = [
  require('./adapters/gunpladb'),
  require('./adapters/korean-curated'),
];

const DATA_DIR = path.join(__dirname, '..', 'data');

function log(...a){ console.log('[build]', ...a); }

async function run(){
  log('어댑터', ADAPTERS.length,'개 실행');

  // 1) 각 어댑터에서 추출 → normalize
  const byPriority = [];
  for(const ad of ADAPTERS){
    let rows;
    try{ rows = await ad.extract(); }
    catch(e){ log('  ✗', ad.name, '실패:', e.message); continue; }
    const normed = rows.map(normalize);
    log('  ✓', ad.name, '→', normed.length, '종');
    byPriority.push({ name:ad.name, rows:normed });
  }

  // 2) 병합: 낮은 우선순위부터 map에 넣고, 높은 우선순위가 덮되 boxImage/price는 보존
  const map = new Map();
  for(const { rows } of byPriority){
    for(const r of rows){
      const k = dedupKey(r);
      if(map.has(k)){
        const prev = map.get(k);
        // 새 레코드로 교체하되, 이미지·가격은 이전 값이 있으면 유지
        r.boxImage = r.boxImage || prev.boxImage;
        r.price = r.price || prev.price;
        // 파일럿/소속/등장작도 새 값 없으면 이전 유지
        r.pilot = r.pilot || prev.pilot;
        r.faction = r.faction || prev.faction;
        r.appearedIn = r.appearedIn || prev.appearedIn;
        map.set(k, r);
      }else{
        map.set(k, r);
      }
    }
  }
  const merged = [...map.values()];
  log('병합 후', merged.length, '종');

  // 3) 정렬 (발매연도 내림차순) + ID 부여 (안정적 = 내용 해시 기반)
  merged.sort((a,b)=>(b.releaseYear||0)-(a.releaseYear||0));
  merged.forEach((r,i)=>{ r.id = 'K'+String(i+1).padStart(4,'0'); });

  // 4) 통계
  const byGrade={}, bySeries={};
  let withImg=0, withPilot=0;
  merged.forEach(r=>{
    byGrade[r.grade]=(byGrade[r.grade]||0)+1;
    bySeries[r.series]=(bySeries[r.series]||0)+1;
    if(r.boxImage)withImg++;
    if(r.pilot)withPilot++;
  });

  // 5) 산출: kits.json + meta.json
  if(!fs.existsSync(DATA_DIR))fs.mkdirSync(DATA_DIR,{recursive:true});
  fs.writeFileSync(path.join(DATA_DIR,'kits.json'), JSON.stringify(merged));
  const meta = {
    version: new Date().toISOString().slice(0,10),
    count: merged.length,
    sources: byPriority.map(b=>b.name),
    grades: byGrade,
    seriesCount: Object.keys(bySeries).length,
    withImage: withImg,
    withPilot: withPilot,
    schema: { grades: GRADES, series: SERIES },
    builtAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(DATA_DIR,'meta.json'), JSON.stringify(meta,null,2));

  log('산출 완료');
  log('  등급:', JSON.stringify(byGrade));
  log('  시리즈:', meta.seriesCount, '종 / 이미지:', withImg, '/ 파일럿:', withPilot);
  log('  kits.json:', (fs.statSync(path.join(DATA_DIR,'kits.json')).size/1024).toFixed(0)+'KB');
}

run().catch(e=>{ console.error(e); process.exit(1); });
