// build/adapters/gunpladb.js — GunplaDB(gunpladb.com) 어댑터
// 소스: https://gunpladb.com/data/models.json (약 1,068종)
// 제품 카탈로그 메타데이터. 이미지는 URL 참조만.

const fs = require('fs');
const path = require('path');
const https = require('https');

const SOURCE_URL = 'https://gunpladb.com/data/models.json';
const CACHE = path.join(__dirname, '..', 'sources', 'gunpladb.json');

function fetchUrl(url){
  return new Promise((resolve,reject)=>{
    https.get(url,{headers:{'User-Agent':'gunpla-log-build/1.0'}},res=>{
      if(res.statusCode!==200){reject(new Error('HTTP '+res.statusCode));return;}
      let data='';res.on('data',c=>data+=c);res.on('end',()=>resolve(data));
    }).on('error',reject);
  });
}

// 원본 취득 (캐시 우선, 없으면 다운로드)
async function acquire(){
  if(fs.existsSync(CACHE)){
    return JSON.parse(fs.readFileSync(CACHE,'utf8'));
  }
  const raw = await fetchUrl(SOURCE_URL);
  fs.writeFileSync(CACHE, raw);
  return JSON.parse(raw);
}

// 건프라 아닌 라인 제외
const EXCLUDE = new Set(['30MM','FAG']);

// 표준 레코드로 변환 (normalize는 오케스트레이터가 적용)
async function extract(){
  const rows = await acquire();
  const out = [];
  for(const k of rows){
    if(EXCLUDE.has(k.grade)) continue;
    const img = (k.images||[]).find(u=>u && !u.includes('picsum')) || '';
    out.push({
      name: k.name,                      // 'RG 1/144 RX-78-2 Gundam'
      grade: k.grade,
      series: k.series,
      scale: k.scale || '',
      releaseYear: k.release_date ? parseInt(k.release_date.slice(0,4)) : null,
      pilot: '',
      faction: '',
      appearedIn: k.series || '',
      boxImage: img,
      price: k.price_msrp || null,
      source: 'gunpladb'
    });
  }
  return out;
}

module.exports = { name:'gunpladb', extract };
