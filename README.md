# 건프라 로그 — 데이터 파일 아키텍처

정균이의 건프라 컬렉션 기록 PWA. 단일 HTML을 벗어나 **앱 코드와 데이터를 분리**했다.
데이터베이스 확장이 코드와 무관하게 이뤄지고, 백엔드 없이도 업데이트된다.

## 구조

```
gunpla-app/
├── index.html          # 앱 (UI·로직). 데이터는 fetch로 로드
├── manifest.json     # PWA 매니페스트
├── sw.js             # 서비스 워커 (오프라인 · 데이터 network-first)
├── icon-192/512.png  # 앱 아이콘
├── data/
│   ├── kits.json     # 건프라 카탈로그 (959종) ← 이 파일만 갈아끼우면 DB 업데이트
│   └── meta.json     # 버전·통계·출처
└── build/            # 빌드 파이프라인 (데이터 생성용, 배포엔 불필요)
    ├── build.js      # 오케스트레이터
    ├── schema.js     # 공통 스키마·정규화
    └── adapters/     # 소스별 어댑터
        ├── gunpladb.js         # GunplaDB (약 1,000종)
        └── korean-curated.js   # 한글명·파일럿 정보
```

## 실행

로컬에서 열려면 정적 서버가 필요하다 (fetch·서비스워커는 file:// 에서 제한됨).

```bash
cd gunpla-app
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000/index.html
```

또는 GitHub Pages / Vercel / Netlify에 폴더째 올리면 바로 PWA로 설치 가능.

## 데이터베이스 업데이트 (백엔드 불필요)

핵심: **데이터가 코드와 분리돼 있어 kits.json만 바꾸면 반영된다.**

세 가지 방법 중 아무거나:
1. **로컬**: `data/kits.json` 을 새 파일로 덮어쓰기 → 앱에서 통계 탭 → "데이터베이스 새로고침"
2. **호스팅**: 새 kits.json 을 재배포 → 앱 재방문 시 버전 변경 자동 감지
3. 앱이 온라인일 때 자동으로 최신 kits.json 을 fetch (network-first)

버전 판정은 `meta.json` 의 `version` + `count` 조합. 바뀌면 도서관 시드만 교체하고
**컬렉션 기록·사용자 추가 항목은 보존**한다.

## 빌드 파이프라인 (데이터 확장)

여러 소스를 병합해 kits.json 을 생성한다. 확장은 어댑터 추가만으로.

```bash
cd gunpla-app
node build/build.js
# → data/kits.json, data/meta.json 재생성
```

### 새 소스 추가하는 법

1. `build/adapters/새소스.js` 를 만든다. `extract()` 가 표준 필드 배열을 반환하면 됨:
   ```js
   { name, grade, series, scale, releaseYear, pilot, faction, appearedIn, boxImage, price, source }
   ```
2. `build/build.js` 의 `ADAPTERS` 배열에 추가한다. 뒤에 둘수록 우선순위 높음(정보 덧입힘).
3. `node build/build.js` 실행.

`schema.js` 의 `normalize()` 가 등급·시리즈·스케일을 자동 추론하고,
`dedupKey()` 로 중복을 병합한다. 어댑터는 원본을 표준형으로 바꾸기만 하면 된다.

예: 일본 데이터 CSV, 위키 덤프, 정균이가 직접 만든 목록 등 무엇이든 어댑터로 흡수 가능.

## 이미지·저작권

- 박스아트는 URL 참조만(앱에 복제 안 함). 저작권 안전, 용량 0.
- 이미지 출처 2개: GunplaDB(제품 이미지) + Gundam Wiki(기체 일러스트, CC-BY-SA).
- 사진 없는 항목은 앱이 설계도 카드(자작 SVG)로 자동 생성.
- 외부 이미지 로드 실패 시 설계도로 폴백.
- HLJ / 구글JP 검색 버튼으로 개별 항목 박스아트 보강 가능.

현재 956종 중 626종(65%) 이미지 보유. 나머지는 설계도 카드.

## 이미지 자동 보강 (enrichment)

빈 이미지를 Gundam Wiki MediaWiki API로 자동 매칭한다. 수작업 0.

```bash
node build/build.js --enrich
```

메커니즘:
- 빈 `boxImage` + 모델번호 있는 항목만 대상
- 위키 검색 → **모델번호가 위키 타이틀에 정확히 포함될 때만** 채택 (오매칭 방지)
- 결과는 `build/sources/wiki-cache.json` 에 캐시 → 재빌드 시 API 재호출 안 함
- rate limit 250ms 준수 (예의)

`--enrich` 없이 `node build/build.js` 만 하면 캐시된 이미지만 사용(API 호출 0).
새 킷을 추가한 뒤 `--enrich` 를 붙이면 새 항목만 위키 조회(나머지는 캐시).

### 왜 모델번호 정확 매칭인가
검색 첫 결과를 무조건 쓰면 파생기·다른 등급이 오매칭된다(예: Strike Freedom →
Freedom). 모델번호(GNX-603T 등)가 위키 타이틀에 정확히 있을 때만 채택하면
오매칭이 거의 0. 실측 매칭률 약 82% (413종 중 338종).

## 데이터 출처

- GunplaDB (gunpladb.com) — 제품 카탈로그 메타데이터
- 한글 큐레이션 — 대표 기체 파일럿·소속 정보 (수기 검증)

## 이미지 소스 조사 결론 (2026-07)

박스아트를 대량·자동·저작권안전·정형으로 주는 소스는 존재하지 않음을 실측 확인.
- GunplaDB: 정형 JSON, hotlink 가능 → 288종 사용 (실제 상품 이미지)
- Gundam Wiki: MediaWiki API, hotlink 가능 → 338종 사용 (애니 일러스트, "일러스트" 라벨 표시)
- Hobby Search(1999.co.jp): 이미지는 hotlink 되나 Cloudflare가 검색·페이지 차단(headless 포함)
- HLJ / Bandai 공식: JS 동적 렌더링으로 정적 추출 불가

→ 결론: 자동(식별용 이미지) + 반자동(HLJ·구글 검색으로 박스아트 개별 보강) 계층 구조가 최적.
검색 버튼: HLJ(/search/?q=, 확실히 작동) + 구글 이미지 일본어(박스아트 키워드).
