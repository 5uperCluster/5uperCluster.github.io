#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Laniakea 블로그 빌더
====================
posts/ 폴더 안의 마크다운(.md) 글을 읽어서 blog-data.js 를 만듭니다.
index.html(script.js)은 이 blog-data.js 를 읽어서 카테고리와 포스트를 자동으로 보여 줍니다.

폴더 구조
---------
  index.html  style.css  script.js
  blog-data.js            ← 이 스크립트가 만드는 파일 (직접 수정 X)
  post-ids.json           ← 이 스크립트가 만드는 글 번호 기록 (지우지 말 것)
  build_blog.py
  posts/
    categories.json       ← (선택) 화면에 보일 카테고리 이름. 폴더 이름에 쓸 수 없는 / 등을 쓸 때
    01_Development/       ← 카테고리 폴더 (폴더 이름 = 카테고리 이름, 앞의 "01_" 은 순서용이라 화면엔 안 보임)
      제주 여행기.md       ← 파일 이름 = 글 제목
      images/a.jpg        ← 글에 쓸 이미지 (아무 곳에나 두고 상대 경로로 연결)
    02_CTF-Wargame/
      ...

사용법 (Python 3 필요, 추가 설치 없음)
------------------------------------
  python build_blog.py            # 한 번 빌드
  python build_blog.py --watch    # 켜 둔 채로 글을 추가/수정하면 자동으로 다시 빌드 (Ctrl+C 로 종료)

글 쓰는 규칙
------------
  - 제목      : 파일 이름 (제목.md)
  - 주소 번호 : 글이 등록된 순서대로 000, 001, 002 ... (카테고리와 무관). 한 번 정해지면 post-ids.json 에 기록돼 바뀌지 않음
  - 대표 이미지: 글 안의 첫 번째 이미지  (이미지가 없으면 목록에 이미지 없이 표시)
  - 카테고리  : 들어 있는 폴더. 화면에 / 가 들어간 이름을 쓰려면 posts/categories.json 에 { "폴더이름": "화면 이름" } 으로 적음
  - 날짜      : 글 맨 위에 아래처럼 적으면 그 날짜, 안 적으면 git 에 처음 올린 날짜(없으면 파일을 만든 날짜)
                ---
                date: 2026-11-09
                ---
  - 본문 맨 앞의 "# 제목" 줄은 화면에 중복으로 보이지 않도록 자동으로 숨겨짐
  - 이미지는 ![설명](images/a.jpg) 처럼 글 파일 기준 상대 경로로 (Obsidian 의 ![[a.jpg]] 도 인식: 같은 카테고리 폴더 안 어디에 있어도 찾음)
"""
import json
import os
import posixpath
import re
import subprocess
import sys
import time
import unicodedata
from datetime import datetime
from urllib.parse import quote, unquote

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(ROOT)
POSTS_DIR = os.path.join(SITE, 'posts')
OUT_FILE = os.path.join(ROOT, 'blog-data.js')
IDS_FILE = os.path.join(ROOT, 'post-ids.json')      # 글 번호(주소) 기록 — 삭제하지 말고 글과 함께 git 에 올리세요
MD_EXT = ('.md', '.markdown')
IMG_EXT = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp')

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


def natural_key(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]


def nfc(s):
    """맥에서 만든 한글 이름(NFD)을 일반 형태(NFC)로 통일"""
    return unicodedata.normalize('NFC', s)


def load_json(path):
    try:
        with open(path, encoding='utf-8-sig') as f:
            return json.load(f)
    except Exception:
        return {}


def category_name(folder):
    """'01_여행' -> '여행' (앞의 숫자+구분자는 정렬용이라 제거)"""
    name = re.sub(r'^\d+[ ._\-)]+', '', nfc(folder)).strip()
    return name or nfc(folder)


def split_front_matter(text):
    m = re.match(r'^---[ \t]*\n(.*?)\n---[ \t]*(?:\n|$)', text, re.S)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).split('\n'):
        key, sep, val = line.partition(':')
        if sep:
            meta[key.strip().lower()] = val.strip().strip('"\'')
    return meta, text[m.end():]


def parse_date(value):
    m = re.match(r'\s*(\d{4})\D+(\d{1,2})\D+(\d{1,2})', value or '')
    if not m:
        return None
    try:
        return datetime(*map(int, m.groups())).strftime('%Y-%m-%d')
    except ValueError:
        return None


_git_cache = {}


def git_date(path):
    """git 에 이 파일이 처음 추가된 날짜 (GitHub Actions 등 파일 시간이 의미 없는 환경에서 정확한 날짜를 위해)"""
    if path in _git_cache:
        return _git_cache[path]
    date = None
    try:
        r = subprocess.run(['git', 'log', '--follow', '--diff-filter=A', '--format=%aI', '--', path],
                           cwd=SITE, capture_output=True, text=True, timeout=15)
        lines = [l for l in r.stdout.split('\n') if l.strip()]
        if r.returncode == 0 and lines:
            date = parse_date(lines[-1])                      # 가장 오래된(처음 추가된) 커밋
    except Exception:                                         # noqa  (git 없음 등)
        pass
    if date:
        _git_cache[path] = date
    return date


def file_date(path):
    """파일을 만든 날짜 (맥: 생성일, 윈도우: 생성일, 리눅스: 수정일)"""
    st = os.stat(path)
    t = getattr(st, 'st_birthtime', None)
    if t is None:
        t = st.st_ctime if os.name == 'nt' else st.st_mtime
    return datetime.fromtimestamp(t).strftime('%Y-%m-%d')


def resolve_actual(parts):
    """이미지 경로를 디스크의 실제 이름으로 보정 (대소문자·한글 정규화 차이 무시). 없으면 None.
    GitHub Pages 는 대소문자를 구분하기 때문에 실제 이름 그대로 연결해 둬야 안전함."""
    key = lambda x: nfc(x).casefold()
    cur, actual = POSTS_DIR, []
    for part in parts:
        if part in ('', '.'):
            continue
        try:
            names = os.listdir(cur)
        except OSError:
            return None
        if part in names:
            pick = part
        else:
            cand = [n for n in names if key(n) == key(part)]
            if not cand:
                return None
            pick = cand[0]
        actual.append(pick)
        cur = os.path.join(cur, pick)
    return actual if os.path.isfile(cur) else None


def find_attachment(name, md_dir):
    """Obsidian 식 ![[이미지.png]] (경로 없이 파일 이름만)일 때: 글 폴더 → 같은 카테고리 폴더 → posts/ 전체 순서로 이미지를 찾음"""
    key = lambda x: nfc(x).casefold()
    want = key(name)
    parts = md_dir.split('/')
    for base in (os.path.join(POSTS_DIR, *parts), os.path.join(POSTS_DIR, parts[0]), POSTS_DIR):
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = sorted(d for d in dirnames if not d.startswith(('.', '_')))
            for fn in sorted(filenames):
                if key(fn) == want:
                    return '/'.join(os.path.relpath(os.path.join(dirpath, fn), POSTS_DIR).split(os.sep))
    return None


def rewrite_images(md, md_dir, warn):
    """글 안의 상대 경로 이미지를 laniakea.html 기준 경로(posts/...)로 바꿈"""

    def fix(url):
        url = url.strip()
        if url.startswith('<') and url.endswith('>'):
            url = url[1:-1]
        if re.match(r'^(?:[a-z][a-z0-9+.\-]*:|//|/|#)', url, re.I):   # http:, data:, /절대경로 등은 그대로
            return url
        rel = unquote(re.split(r'[?#]', url)[0])
        path = posixpath.normpath(posixpath.join(md_dir, rel))
        actual = resolve_actual(path.split('/'))
        if actual is None:
            warn('이미지를 찾을 수 없음: ' + rel)
            return 'posts/' + quote(path)
        return 'posts/' + '/'.join(quote(a) for a in actual)

    # Obsidian 이미지 삽입  ![[a.jpg]] / ![[a.jpg|300]]  ->  ![](a.jpg)
    def obsidian(m):
        name = m.group(1).strip()
        if not name.lower().endswith(IMG_EXT):
            return m.group(0)
        found = None if '/' in name else find_attachment(name, md_dir)
        return '![](<' + (posixpath.relpath(found, md_dir) if found else name) + '>)'
    md = re.sub(r'!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]', obsidian, md)

    # ![설명](경로 "제목")
    def md_img(m):
        inner = m.group(2)
        mm = re.match(r'^\s*(<[^>]*>|.*?)(\s+"[^"]*")?\s*$', inner, re.S)
        return '%s(%s%s)' % (m.group(1), fix(mm.group(1)), mm.group(2) or '')
    md = re.sub(r'(!\[[^\]]*\])\(([^)]*)\)', md_img, md)

    # <img src="경로">
    md = re.sub(r'(<img\b[^>]*?\bsrc\s*=\s*)(["\'])(.*?)\2',
                lambda m: m.group(1) + m.group(2) + fix(m.group(3)) + m.group(2), md, flags=re.I)
    return md


def collect():
    warnings = []
    folders = sorted(
        (d for d in os.listdir(POSTS_DIR)
         if os.path.isdir(os.path.join(POSTS_DIR, d)) and not d.startswith(('.', '_'))),
        key=natural_key)
    # 폴더 이름에는 / 를 쓸 수 없으므로, 화면에 보일 이름이 폴더 이름과 다르면 posts/categories.json 에 적는다
    #   { "02_CTF-Wargame": "CTF/Wargame", ... }   (없는 폴더는 폴더 이름에서 앞의 숫자만 뗀 이름이 쓰임)
    cat_map = {nfc(k): v for k, v in load_json(os.path.join(POSTS_DIR, 'categories.json')).items() if isinstance(v, str)}
    for k in cat_map:
        if k not in [nfc(f) for f in folders]:
            warnings.append('categories.json 의 "%s" 폴더가 posts/ 안에 없습니다 (이름 확인)' % k)
    categories = [cat_map.get(nfc(f)) or category_name(f) for f in folders]
    posts = []

    for dirpath, dirnames, filenames in os.walk(POSTS_DIR):             # 이름 형식 안내
        for nm in dirnames + filenames:
            if nm != nfc(nm):
                warnings.append('%s : 한글 이름이 맥 방식(NFD)으로 저장돼 있어요. 화면엔 문제없지만 git 에 올릴 땐 영문 이름이 더 안전해요' % nm)
                break
    for fn in os.listdir(POSTS_DIR):                                   # 카테고리 폴더 밖의 글 안내
        if fn.lower().endswith(MD_EXT) and fn.lower() != 'readme.md' and not fn.startswith(('.', '_')):
            warnings.append('posts/%s : 카테고리 폴더 안으로 옮겨야 표시됩니다' % fn)

    for ci, folder in enumerate(folders):
        for dirpath, dirnames, filenames in os.walk(os.path.join(POSTS_DIR, folder)):
            dirnames[:] = sorted((d for d in dirnames if not d.startswith(('.', '_'))), key=natural_key)
            for fn in sorted(filenames, key=natural_key):
                stem, ext = os.path.splitext(fn)
                if ext.lower() not in MD_EXT or fn.startswith(('.', '_')) or fn.lower() == 'readme.md':
                    continue
                path = os.path.join(dirpath, fn)
                rel = '/'.join(os.path.relpath(path, POSTS_DIR).split(os.sep))
                try:
                    with open(path, encoding='utf-8-sig') as f:
                        text = f.read().replace('\r\n', '\n').replace('\r', '\n')
                except Exception as e:                                  # noqa
                    warnings.append('%s : 읽을 수 없음 (%s)' % (rel, e))
                    continue
                meta, body = split_front_matter(text)
                date = parse_date(meta.get('date')) or git_date(os.path.relpath(path, SITE)) or file_date(path)
                body = rewrite_images(body, posixpath.dirname(rel), lambda msg, rel=rel: warnings.append('%s : %s' % (rel, msg)))
                posts.append({
                    'rel': nfc(rel),
                    'cat': ci,
                    'title': nfc(stem).strip(),
                    'date': date,
                    'md': body.strip('\n'),
                })

    # 글 번호(주소): 등록된 순서대로 000, 001, 002 ... (카테고리와 상관없이 하나의 번호). 한 번 정해진 번호는 post-ids.json 에 기록돼 바뀌지 않음.
    # 새로 발견된 글은 (날짜, 경로) 순으로 다음 번호를 받음. 삭제된 글의 번호는 목록에서 빠지고, 남은 글의 번호는 그대로 유지됨.
    old = load_json(IDS_FILE).get('ids', {})
    present = {p['rel'] for p in posts}
    ids = {k: v for k, v in old.items() if k in present and isinstance(v, int)}
    nxt = max(ids.values()) + 1 if ids else 0
    for p in sorted((p for p in posts if p['rel'] not in ids), key=lambda p: (p['date'], p['rel'])):
        ids[p['rel']] = nxt
        nxt += 1
    if ids != old:
        with open(IDS_FILE, 'w', encoding='utf-8', newline='\n') as f:
            json.dump({'_note': '글 번호(주소) 고정용 기록. 삭제하지 말고 글과 함께 git 에 올리세요.',
                       'ids': dict(sorted(ids.items(), key=lambda kv: kv[1]))}, f, ensure_ascii=False, indent=1)
            f.write('\n')
    for p in posts:
        p['id'] = '%03d' % ids[p.pop('rel')]
    posts.sort(key=lambda p: (p['date'], p['title']), reverse=True)
    return categories, folders, posts, warnings


def build(quiet=False):
    if not os.path.isdir(POSTS_DIR):
        print('posts/ 폴더가 없습니다: ' + POSTS_DIR)
        return False
    categories, folders, posts, warnings = collect()
    data = {'categories': categories, 'posts': posts}
    js = ('/* 자동 생성 파일 — build_blog.py 가 posts/ 폴더로부터 만듭니다. 직접 수정하지 마세요. */\n'
          'window.BLOG_DATA = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    old = None
    if os.path.isfile(OUT_FILE):
        with open(OUT_FILE, encoding='utf-8') as f:
            old = f.read()
    if js != old:
        with open(OUT_FILE, 'w', encoding='utf-8', newline='\n') as f:
            f.write(js)
    if not quiet or js != old:
        print('[%s] %s  카테고리 %d개 / 포스트 %d개' % (
            time.strftime('%H:%M:%S'), '갱신됨' if js != old else '변경 없음', len(categories), len(posts)))
        for ci, name in enumerate(categories):
            n = sum(1 for p in posts if p['cat'] == ci)
            print('   %-20s %d개   (폴더: posts/%s)' % (name, n, folders[ci]))
        for w in warnings:
            print('   ! ' + w)
    return True


def signature():
    sig = []
    for dirpath, dirnames, filenames in os.walk(POSTS_DIR):
        for fn in filenames:
            p = os.path.join(dirpath, fn)
            try:
                st = os.stat(p)
                sig.append((p, st.st_mtime_ns, st.st_size))
            except OSError:
                pass
        sig.extend((os.path.join(dirpath, d), 0, 0) for d in dirnames)
    return sorted(sig)


def main():
    args = sys.argv[1:]
    if '-h' in args or '--help' in args:
        print(__doc__)
        return
    if not build():
        sys.exit(1)
    if '--watch' in args:
        print('\n감시 중... posts/ 폴더에 글이나 이미지를 넣거나 고치면 자동으로 다시 빌드합니다. (종료: Ctrl+C)\n')
        last = signature()
        try:
            while True:
                time.sleep(1)
                cur = signature()
                if cur != last:
                    time.sleep(0.4)            # 파일 복사가 끝나기를 잠깐 기다림
                    last = signature()
                    build(quiet=True)
        except KeyboardInterrupt:
            print('\n종료합니다.')


if __name__ == '__main__':
    main()
