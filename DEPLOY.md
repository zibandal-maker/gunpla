# Vercel 배포 가이드 — 건프라 로그

이 폴더는 **Vercel에 그대로 올리면 바로 작동**하도록 세팅돼 있다.
서버리스 함수도, 빌드 스텝도 필요 없다. 순수 정적이라 무료 플랜으로 충분하다.

배포하면 `https://프로젝트명.vercel.app` 주소가 생기고, HTTPS 출처라서:
- `file://` 에서 막히던 도서관 데이터(kits.json)가 정상 로드됨
- PWA로 설치 가능 (홈 화면 아이콘)
- 오프라인 동작 (서비스 워커)

---

## 경로 A — 드래그 배포 (가장 빠름, 5분)

git·CLI 없이 웹에서 폴더째 올린다.

1. https://vercel.com 접속 → 가입/로그인 (GitHub·Google 계정으로 가능)
2. 대시보드 → **Add New... → Project**
3. **"Deploy a folder"** 또는 배포 화면에 이 폴더(`gunpla-app`)를 **드래그 앤 드롭**
   - 만약 드래그 옵션이 안 보이면 경로 B(GitHub) 사용
4. 프로젝트 이름 입력 (예: `jeonggyun-gunpla`) → **Deploy**
5. 1~2분 후 `https://jeonggyun-gunpla.vercel.app` 주소 생성 → 접속

> 폴더 안 `vercel.json` 이 캐시 정책을 자동 적용한다. 추가 설정 불필요.

---

## 경로 B — GitHub 연결 (지속적 배포, 권장)

한 번 연결하면 이후 `git push` 할 때마다 자동 재배포된다.
DB 업데이트(kits.json 교체)도 push 한 번으로 반영.

### 1) GitHub 저장소 생성 후 이 폴더 올리기
```bash
cd gunpla-app
git init
git add .
git commit -m "건프라 로그 초기 배포"
git branch -M main
git remote add origin https://github.com/사용자명/gunpla-log.git
git push -u origin main
```

### 2) Vercel에서 저장소 연결
1. https://vercel.com → **Add New... → Project**
2. **Import Git Repository** → 방금 만든 저장소 선택
3. 설정은 전부 기본값 그대로 → **Deploy**
   - Framework Preset: **Other** (자동 감지됨)
   - Build Command: 비움
   - Output Directory: 비움 (루트가 곧 배포 대상)
4. 배포 완료 → 주소 생성

### 이후 업데이트
```bash
# 새 데이터로 kits.json 갱신했다면:
node build/build.js      # data/kits.json 재생성
git add data/
git commit -m "카탈로그 업데이트"
git push                 # → Vercel 자동 재배포
```

---

## 배포 후 확인

- 주소 접속 → 도서관 탭에 959종이 보이면 성공
- 모바일 브라우저(크롬/사파리)에서 접속 → **"홈 화면에 추가"** → 앱처럼 설치
- 비행기 모드로 전환해도 마지막 로드분으로 동작 (오프라인)

## DB 업데이트가 반영 안 될 때

서비스 워커가 옛 데이터를 캐시했을 수 있다. `vercel.json` 이 데이터를
`no-cache` 로 설정해 방지하지만, 그래도 안 되면:
- 앱 안 통계 탭 → **"데이터베이스 새로고침"** 버튼
- 또는 브라우저에서 강력 새로고침 (Ctrl+Shift+R)

---

## 폴더 구조 (배포 대상)

```
index.html      ← 진입점 (Vercel이 루트로 서빙)
manifest.json   ← PWA
sw.js           ← 서비스 워커
icon-*.png      ← 아이콘
data/           ← kits.json, meta.json (DB 실체)
vercel.json     ← 캐시 헤더 설정
```

`build/` 폴더는 `.vercelignore` 로 배포에서 제외된다 (데이터 생성용, 로컬 전용).
```
