# Laniakea — 구성과 사용법

## 파일 구성

```
index.html       페이지 구조 (타이틀, 소개글, 메인 버튼 4개의 위치)
style.css        디자인
script.js        동작 (메뉴·확대 모션, 블로그, 마크다운 변환)
build_blog.py    posts/ 폴더의 글을 읽어 blog-data.js 를 만드는 스크립트 (Python 3)
blog-data.js     (자동 생성) 글 데이터 — 직접 고치지 않음
post-ids.json    (자동 생성) 글 번호 기록 — 첫 글을 만들면 생김, 지우지 않음
posts/           글 폴더 (카테고리 폴더 6개 + categories.json)
.github/workflows/deploy.yml   (선택) GitHub Pages 자동 배포
```

## 블로그 글 올리기

1. `posts/` 안의 카테고리 폴더에 마크다운(`.md`) 파일을 넣습니다.
2. 이 폴더에서 터미널을 열고 아래를 실행합니다. (Python 3 필요, 추가 설치 없음)
   ```
   python build_blog.py            # 한 번 빌드
   python build_blog.py --watch    # 켜 둔 동안 글을 넣거나 고칠 때마다 자동으로 다시 빌드 (Ctrl+C 로 종료)
   ```
3. 브라우저에서 `index.html` 을 새로고침하면 글이 나타납니다.

### 글 규칙

| 항목 | 규칙 |
|---|---|
| 제목 | 파일 이름 (`제주 여행기.md` → 제목 "제주 여행기") |
| 카테고리 | 파일이 들어 있는 폴더 |
| 대표 이미지 | 글 안의 **첫 번째 이미지** (없으면 목록에 이미지 없이 표시) |
| 날짜 | 글 맨 위에 `date:` 를 적으면 그 날짜, 안 적으면 git 에 처음 올린 날짜(없으면 파일을 만든 날짜) |
| 본문 맨 앞의 `# 제목` 줄 | 제목과 겹치므로 화면에서는 자동으로 숨김 |

날짜를 직접 지정하려면 글 맨 위에 이렇게 적습니다.

```
---
date: 2026-11-09
---
```

이미지는 글 파일 기준 상대 경로로 적습니다. 예) `![설명](images/a.jpg)`
Obsidian 의 `![[a.jpg]]` 도 되고, 같은 카테고리 폴더 안 어디에 있어도 찾습니다.
이미지 경로의 대소문자는 실제 파일 이름에 맞춰 자동으로 고쳐 줍니다.

지원하는 마크다운: 제목, 굵게/기울임/취소선, 코드(인라인·블록), 링크, 이미지, 인용문, 목록(중첩·체크박스), 표, 구분선, HTML 태그.

## 카테고리

`posts/` 안의 폴더가 곧 카테고리입니다. 폴더를 만들면 추가되고 지우면 빠지며, 왼쪽 카테고리 버튼과 메인의 Blog 하위 버튼에 모두 반영됩니다.

- 순서: 폴더 이름 순서입니다. 앞의 `01_`, `02_` 숫자는 순서용이라 화면에는 안 보입니다.
- 화면 이름: 폴더 이름에는 `/` 를 쓸 수 없어서, 이름이 다르면 `posts/categories.json` 에 적습니다.

현재 카테고리:

| 폴더 | 화면에 보이는 이름 |
|---|---|
| `01_Development` | Development |
| `02_CTF-Wargame` | CTF/Wargame |
| `03_Bug Bounty` | Bug Bounty |
| `04_Technical Writing` | Blog/Technical Writing |
| `05_Research-Conferences` | Research/Conferences |
| `06_Competitions-Certifications` | Competitions/Certifications |

폴더 이름을 바꿨다면 `posts/categories.json` 의 왼쪽 이름도 같이 바꿔야 합니다.
(`.gitkeep` 파일은 빈 폴더를 git 에 올리기 위한 것이니 그대로 두세요.)

## 블로그 주소

| 주소 | 화면 |
|---|---|
| `#blog/all/1` | 전체 글 목록 1페이지 (끝의 숫자는 페이지) |
| `#blog/c0/1` | 첫 번째 카테고리 목록 1페이지 (`c0`, `c1`, … 는 위 표의 순서) |
| `#blog/post/000/all` | 글 번호 000 (끝의 `all`/`c0` 은 어느 목록에서 열었는지 — '다른 글 목록'을 채우는 데 쓰임) |

글 번호는 **등록된 순서대로** `000`, `001`, `002` … 가 붙습니다 (카테고리와 무관).
한 번 정해진 번호는 `post-ids.json` 에 기록되어 바뀌지 않으니, 이 파일을 지우지 말고 글과 함께 git 에 올리세요.
파일 이름을 바꾸면 새 글로 보고 새 번호를 받습니다. 글을 전부 지우고 새로 시작하면 000 부터 다시 시작합니다.

## GitHub Pages 에 올리기

**방법 A — 직접 빌드해서 올리기 (설정 없음)**
1. `python build_blog.py` 로 `blog-data.js` 를 갱신합니다.
2. `index.html`, `style.css`, `script.js`, `blog-data.js`, `post-ids.json`, `posts/`, 배경 이미지를 commit & push 합니다.

**방법 B — push 만 하면 자동 반영 (GitHub Actions)**
1. `.github/workflows/deploy.yml` 을 저장소에 포함합니다. (기본 브랜치 이름이 `main` 이 아니면 파일 안의 `branches: [main]` 을 바꾸세요.)
2. 저장소 Settings → Pages → Source 를 "GitHub Actions" 로 선택합니다.
3. 이후 `.md` 와 이미지를 push 하면 서버에서 `blog-data.js` 를 만들어 배포합니다.
   글 번호를 고정하려면 `post-ids.json` 은 계속 같이 올려 주세요.

## 자주 고치는 곳

| 바꾸고 싶은 것 | 위치 |
|---|---|
| 메인 타이틀 글자 | `index.html` 의 `<h1 id="mtitle">` |
| 메인 소개글 | `index.html` 의 `<div id="mintro">` |
| 메인 버튼 4개의 위치 | `index.html` 의 `.main` 버튼 `style="left:…;top:…"` |
| 블로그 제목 / 부제 | `script.js` 의 `BLOG_TITLE`, `BLOG_SUBTITLE` |
| Contact 항목과 링크 | `script.js` 의 `MENU.contact` — `href` 에 링크를 넣으면 클릭 시 열림. 마지막 항목은 항상 버튼이 아닌 글자 |
| Profile / Activities 내용 | `script.js` 의 `MENU.profile`, `MENU.activities` |
| 한 페이지에 보이는 글 수 | `script.js` 의 `PER_PAGE` (기본 20) |
| 엔터 한 번의 줄바꿈 처리 | `script.js` 의 `MD_BREAKS` |
| 배경 이미지 | `style.css` 의 `#stage` |

## 알아 두기

- 글을 고치거나 추가한 뒤에는 반드시 `python build_blog.py` 를 한 번 실행해야 화면에 반영됩니다.
- `posts/` 바로 아래(카테고리 폴더 밖)에 둔 `.md` 는 표시되지 않으며, 빌드할 때 안내 메시지가 나옵니다.