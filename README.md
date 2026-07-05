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

- 박스아트는 URL 참조만(앱에 복제 안 함). 저작권 안전.
- 사진 없는 항목은 앱이 설계도 카드(자작 SVG)로 자동 생성.
- 외부 이미지 로드 실패 시 설계도로 폴백.
- HLJ / 구글JP 검색 버튼으로 일본 소스에서 이미지 탐색.

## 데이터 출처

- GunplaDB (gunpladb.com) — 제품 카탈로그 메타데이터
- 한글 큐레이션 — 대표 기체 파일럿·소속 정보 (수기 검증)
