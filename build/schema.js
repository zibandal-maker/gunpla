// build/schema.js — 공통 스키마 · enum · 정규화 유틸
// 모든 어댑터는 이 normalize()를 거쳐 동일 형태의 레코드를 뱉는다.

const GRADES = ['HG','RG','MG','PG','EG','SD','FM','RE100','MGEX','MGSD','PB','OTHER'];

const SERIES = {
  FIRST:'퍼스트 건담', UC:'우주세기(UC)', ZETA:'제타건담', ZZ:'더블제타',
  UNICORN:'유니콘', F91:'F91', VICTORY:'V건담', G:'G건담', WING:'윙건담',
  X:'건담X', TURN_A:'턴에이', SEED:'SEED', '00':'더블오', IBO:'철혈의 오펀스',
  WITCH:'수성의 마녀', THUNDERBOLT:'썬더볼트', ORIGIN:'디 오리진', BUILD:'빌드 시리즈',
  AGE:'건담 AGE', OTHER:'기타'
};

// 등급 자동추론 (모델명/등급 텍스트에서)
function inferGrade(text){
  const t=(text||'').toUpperCase();
  if(/\bMGEX\b/.test(t))return'MGEX';
  if(/\bMGSD\b/.test(t))return'MGSD';
  if(/\bRE\/?100\b/.test(t))return'RE100';
  if(/\bPG\b|PERFECT GRADE/.test(t))return'PG';
  if(/\bMG\b|MASTER GRADE/.test(t))return'MG';
  if(/\bRG\b|REAL GRADE/.test(t))return'RG';
  if(/\bHG(UC|CE|BF|AGE|IBO|BD|BDR|FC|AW|AC|CC)?\b|HIGH GRADE/.test(t))return'HG';
  if(/\bEG\b|ENTRY GRADE/.test(t))return'EG';
  if(/\bSD\b|SUPER DEFORMED|BB전사/.test(t))return'SD';
  if(/\bFM\b|FULL MECHANICS/.test(t))return'FM';
  return 'OTHER';
}

// 시리즈 매핑 (원본 series 문자열 → enum)
function mapSeries(s){
  s=(s||'').toLowerCase();
  if(s.includes('iron-blooded')||s.includes('orphans'))return'IBO';
  if(s.includes('seed'))return'SEED';
  if(s.includes('gundam 00')||/\b00\b/.test(s))return'00';
  if(s.includes('unicorn')||s==='mobile suit gundam uc'||s.includes('narrative')||s.includes('hathaway'))return'UNICORN';
  if(s.includes("char"))return'UC';
  if(s.includes('zeta')||s.includes('z gundam'))return'ZETA';
  if(s.includes('zz')||s.includes('double zeta'))return'ZZ';
  if(s.includes('wing'))return'WING';
  if(s.includes('witch')||s.includes('mercury'))return'WITCH';
  if(s.includes('thunderbolt'))return'THUNDERBOLT';
  if(s.includes('origin'))return'ORIGIN';
  if(s.includes('build'))return'BUILD';
  if(s.includes('age'))return'AGE';
  if(s.includes('f91'))return'F91';
  if(s.includes('victory'))return'VICTORY';
  if(s.includes('turn a')||s.includes('∀'))return'TURN_A';
  if(s.includes('fighter g')||s.includes('g gundam')||s.includes('g-gundam'))return'G';
  if(s.includes('gundam x'))return'X';
  if(s.includes('0080')||s.includes('0083')||s.includes('08th')||s.includes('igloo')||s.includes('stardust')||s.includes('war in the pocket')||s.includes('mobile suit gundam'))return'UC';
  return'OTHER';
}

// 기체형식번호 추출
function extractModelNumber(name){
  const m=(name||'').match(/\b([A-Z]{1,5}-?[A-Z]?\d{1,4}[A-Z0-9\-\/]*)\b/);
  return m?m[1]:'';
}

// 이름에서 등급/스케일 프리픽스 제거
function cleanName(name){
  let n=(name||'').trim();
  n=n.replace(/^(HGUC|HGCE|HGBF|HGBD|HGBDR|HG|RG|MGEX|MGSD|MG|PG|EG|SD|FM|RE\/?100|PB)\s+/i,'');
  n=n.replace(/^(1\/\d+|NON)\s+/i,'');
  return n.trim();
}

// 스케일 자동추론
function inferScale(grade){
  if(['MG','RE100','MGEX','FM'].includes(grade))return'1/100';
  if(grade==='PG')return'1/60';
  if(['HG','RG','EG'].includes(grade))return'1/144';
  if(['SD','MGSD'].includes(grade))return'NON';
  return'';
}

// 병합 중복 제거 키
function dedupKey(o){
  return ((o.modelName||'')+'|'+o.grade+'|'+o.scale).toLowerCase().replace(/\s+/g,'').replace(/건담|gundam/g,'');
}

// 어댑터 출력 → 정규화된 표준 레코드
// 입력 raw: {name, grade, series, scale, releaseYear, pilot, faction, appearedIn, boxImage, price, sourceId}
function normalize(raw){
  const grade = GRADES.includes(raw.grade) ? raw.grade : inferGrade(raw.grade || raw.name);
  const series = SERIES[raw.series] ? raw.series : mapSeries(raw.series || raw.appearedIn || '');
  const name = raw.modelName || cleanName(raw.name);
  return {
    modelName: name,
    modelNumber: raw.modelNumber || extractModelNumber(raw.name || name),
    grade,
    series,
    scale: raw.scale || inferScale(grade),
    releaseYear: raw.releaseYear || null,
    pilot: raw.pilot || '',
    faction: raw.faction || '',
    appearedIn: raw.appearedIn || raw.series || '',
    boxImage: raw.boxImage || '',
    price: raw.price || null,
    source: raw.source || 'unknown'   // 출처 추적 (병합·감사용)
  };
}

module.exports = { GRADES, SERIES, inferGrade, mapSeries, extractModelNumber, cleanName, inferScale, dedupKey, normalize };
