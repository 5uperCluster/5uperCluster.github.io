(() => {
  // 하위 메뉴 (임시)
  const MENU = {
    // 항목은 문자열 또는 {t:제목, v:옆에 붙는 값, sub:[하위 내용...]}. 선은 제목(t)에만 연결, sub는 선 없이 들여쓰기로 표시
    profile:    [
      { t:'Name', v:'이동현 Donghyun Lee / Laniakea' },
      { t:'Education', sub:['Korea University, Division of Smart Security (2026.03~)'] },
      { t:'Interests', sub:['AI Security','Offensive Security', 'App Security'] },
      { t:'Skills & Certificates', sub:['Python', 'C'] }
    ],
    // Contact: href에 링크를 넣으면 클릭 시 열림 (mailto:… 도 가능). 비워 두면 클릭해도 아무 동작 없음. 링크 유무와 상관없이 버튼 모양은 동일
    contact:    [
      { t:'LinkedIn', href:''},
      { t:'GitHub',   href:'https://github.com/5uperCluster/' },
      { t:'supercluster@korea.ac.kr'}
    ],
    blog:       ['Development','CTF/Wargame','Bug Bounty','Blog/Technical Writing','Research/Conferences','Competitions/Certifications'],   // 블로그 카테고리 이름으로도 쓰임 (blog-data.js가 있으면 posts/ 폴더 기준으로 대체됨)
    activities: ['Asan Youth-Preneur (2024)', 'HSpace Knights Frontier (2026)']
  };
  const SCALE = 2.5, DURATION = 1600;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body, stage = document.getElementById('stage');
  const subs = document.getElementById('subs'), lines = document.getElementById('lines');
  const back = document.getElementById('back');
  let active = null, cur = 1, raf = 0, timer = 0, settleTimer = 0, revealTimer = 0, origin = [0, 0];
  const REVEAL_AT = 0.65;   // 확대 시간의 이 비율쯤(확대가 거의 끝날 무렵)부터 선·하위 항목이 등장하기 시작
  const settle = () => subs.querySelectorAll('.sub').forEach(el => el.style.transitionDelay = '0s');
  const titleAction = key => { if (key === 'blog') enterBlog('all'); };   // 확대된 Blog 글자 → 전체 포스트 목록

  const geom = () => {
    const vw = innerWidth, vh = innerHeight;
    const W = Math.max(vw, vh * 16 / 9), H = W * 9 / 16;
    return {vw, vh, W, H, left:(vw - W) / 2};
  };
  const frac = el => [parseFloat(el.style.left)/100, parseFloat(el.style.top)/100];

  // 버튼별 확대 설정 (확대 후 메인 글자의 위치와 하위 항목 배치)
  //  모든 버튼 공통 → 글자 박스의 왼쪽 시작점이 화면 가로 22.5% 지점(1/5~1/4 사이). 세로는 모든 항목 동일(화면 높이의 25% 부근)
  //  하위 항목 → 글자 아래 세로 정렬 (기본은 일반 텍스트, buttons:true면 버튼) + 금빛 곡선으로 연결
  //  gap → 메인 글자와 첫 항목 사이 간격(배수), side:'left' → 선이 글자 왼쪽에서 출발
  //  titleButton → 확대된 화면에서 타이틀도 버튼으로 동작, startGap → 선 출발점과 글자 사이 간격(px)
  const OPTS = {
    activities: { gap:1.6 },
    contact:    { buttons:true, lastPlain:true, gap:1.6 },   // lastPlain: 마지막 항목만 버튼이 아닌 글자
    profile:    { gap:1.6, side:'left' },
    blog:       { buttons:true, gap:1.6, side:'left', titleButton:true, startGap:22 }
  };

  // 최종 확대 상태(SCALE, tx, ty)를 계산하고, 그 상태와 일치하는 "고정점"을 구함.
  // 고정점을 transform-origin으로 두고 scale만 바꾸면 화면이 흔들림 없이 한 점을 향해 곧게 확대됨.
  function target(btn){
    const g = geom(), [fx, fy] = frac(btn), o = OPTS[btn.dataset.key] || {};
    // 확대 후 버튼 글자의 중심이 놓일 화면 좌표 (px, py)
    const w = btn.offsetWidth * SCALE, h = btn.offsetHeight * SCALE;
    const px = g.vw * 0.225 + w/2;                                               // 글자 박스 왼쪽 = 화면 가로 22.5% (1/5과 1/4 사이)
    const py = Math.max(g.vh * 0.25, 64 + h/2);                                  // ← Back 버튼 아래를 침범하지 않게
    let tx = px - g.left - SCALE*fx*g.W, ty = py - SCALE*fy*g.H;
    tx = Math.min(-g.left, Math.max(g.vw - g.left - SCALE*g.W, tx));   // 사진 밖이 보이지 않게
    ty = Math.min(0, Math.max(g.vh - SCALE*g.H, ty));
    const fs = parseFloat(getComputedStyle(btn).fontSize);
    return {g, o, fs, w, h,
            origin:[tx/(1 - SCALE), ty/(1 - SCALE)],
            cx:g.left + tx + SCALE*fx*g.W, cy:ty + SCALE*fy*g.H};
  }
  const apply = s => {
    stage.style.transformOrigin = `${origin[0]}px ${origin[1]}px`;
    stage.style.transform = s === 1 ? 'none' : `scale(${s})`;
  };

  // 지각적으로 균일한 줌: 배율을 지수적으로 보간 + 완만한 sine 이징(속도 변화 최소화)
  function animate(from, to, done){
    cancelAnimationFrame(raf);
    if (reduce){ cur = to; apply(to); done && done(); return; }
    const t0 = performance.now(), ratio = to / from;
    // cubic-bezier(.45, 0, .1, 1): 시작은 이전과 비슷, 끝은 길고 부드럽게 감속
    const bez = (x1, y1, x2, y2) => {
      const B = (t, a, b) => 3*a*t*(1-t)*(1-t) + 3*b*t*t*(1-t) + t*t*t;
      return x => { let lo = 0, hi = 1, t = x;
        for (let i = 0; i < 30; i++){ t = (lo + hi)/2; (B(t, x1, x2) < x) ? lo = t : hi = t; }
        return B(t, y1, y2); };
    };
    const mix = bez(.45, 0, .1, 1);
    const step = now => {
      const p = Math.min(1, (now - t0) / DURATION);
      cur = from * Math.pow(ratio, mix(p));
      apply(cur);
      if (p < 1) raf = requestAnimationFrame(step); else { cur = to; apply(to); done && done(); }
    };
    raf = requestAnimationFrame(step);
  }

  // 세로 배치: 글자 아래 세로 일렬 + 글자 오른쪽 끝에서 각 제목으로 이어지는 금빛 곡선
  // (.child 항목은 들여쓰기만 하고 선은 연결하지 않음)
  function layoutColumn(T, items){
    const {cx, cy, g, w, h, fs} = T, NS = 'http://www.w3.org/2000/svg';
    const padX = .3*fs*SCALE, padY = .2*fs*SCALE;            // .btn 패딩(확대 후)
    const left = cx - w/2 + padX, right = cx + w/2 - padX;   // 글자 왼쪽/오른쪽 끝
    const step = Math.max(44, Math.min(64, g.vh*0.058));     // 항목 간격
    const side = T.o.side === 'left';
    const sg = T.o.startGap ?? 10;
    const sx = side ? left - sg : right + sg, sy = cy;       // 선 출발점: 글자 오른쪽 (side:'left'면 왼쪽)
    let y = cy + h/2 - padY + step*(T.o.gap ?? 0.65), prevChild = false, k = 0;   // 첫 항목 y
    items.forEach((el, i) => {
      const child = el.classList.contains('child');
      if (i > 0) y += child ? step*0.78 : step*(prevChild ? 1.05 : 1);
      prevChild = child;
      const x = left + (child ? 40 : 14);
      // 버튼(.sub)은 중심 기준(translate -50%)이라 가로 중심으로, 일반 텍스트는 왼쪽 끝 기준
      el.style.left = (el.classList.contains('sub') ? x + el.offsetWidth/2 : x) + 'px'; el.style.top = y + 'px';
      el.style.setProperty('--d', (0.12*i + 0.5) + 's');     // 선이 어느 정도 도달한 뒤 글자 등장
      if (child) return;
      const P = document.createElementNS(NS, 'path');
      if (side){                                             // 왼쪽 출발 → 왼쪽으로 휘었다가 항목 왼쪽 끝으로
        const ex = x - 16, ey = y;
        const b = Math.min(28 + (ey - sy)*0.2, sx*1.2);
        P.setAttribute('d', `M${sx} ${sy} C${sx-b} ${sy} ${ex-40} ${ey} ${ex} ${ey}`);
      } else {
        const ex = x + el.offsetWidth + 14, ey = y;          // 선 도착점: 항목 오른쪽 끝
        const dx = 50 + (ey - sy)*0.2;
        P.setAttribute('d', `M${sx} ${sy} C${sx+dx} ${sy} ${ex+50} ${ey} ${ex} ${ey}`);
      }
      P.setAttribute('pathLength', '1');
      P.style.setProperty('--d', (0.12*k++) + 's');
      lines.appendChild(P);
    });
  }

  function layout(T){
    lines.querySelectorAll('path').forEach(l => l.remove());
    layoutColumn(T, [...subs.children]);
  }

  function open(btn){
    if (active) return;
    active = btn;
    btn.classList.add('active');
    subs.innerHTML = '';
    const o = OPTS[btn.dataset.key] || {}, plain = !o.buttons;
    const items = MENU[btn.dataset.key];
    items.forEach((t, i) => {
      const asText = plain || (o.lastPlain && i === items.length - 1);   // 일반 텍스트로 만들 항목
      if (asText){                                            // 일반 텍스트
        const e = typeof t === 'string' ? {t} : t;
        const s = document.createElement('span');
        s.className = 'sub-text' + (plain ? '' : ' padbtn'); s.textContent = e.t;   // padbtn: 버튼 글자와 같은 위치에 맞춤
        if (e.v){ const v = document.createElement('span'); v.className = 'val'; v.textContent = e.v; s.appendChild(v); }
        subs.appendChild(s);
        (e.sub || []).forEach(c => {                          // 선 없이 들여쓰기만 하는 하위 내용
          const cs = document.createElement('span');
          cs.className = 'sub-text child'; cs.textContent = c;
          subs.appendChild(cs);
        });
        return;
      }
      const it = typeof t === 'string' ? { t } : t, a = document.createElement('a');
      a.className = 'btn sub'; a.textContent = btn.dataset.key === 'blog' ? amp(it.t) : it.t;   // Blog 하위 버튼: / → ' & '
      if (it.href){ a.href = it.href; if (!/^(mailto|tel):/i.test(it.href)){ a.target = '_blank'; a.rel = 'noopener noreferrer'; } }
      else a.href = '#';
      a.style.transitionDelay = (0.5 + 0.12*i) + 's';   // 선이 닿은 뒤 등장
      a.addEventListener('click', ev => {
        if (btn.dataset.key === 'blog'){ ev.preventDefault(); enterBlog(i); }       // Blog 하위 버튼 → 해당 카테고리 목록
        else if (!it.href) ev.preventDefault();                                    // 링크 미지정 → 아무 동작 없음 (링크가 있으면 그대로 이동)
      });
      subs.appendChild(a);
    });
    const T = target(btn);
    origin = T.origin;
    layout(T);
    body.classList.add('zoomed');
    if (o.titleButton) btn.classList.add('live');
    clearTimeout(timer);
    clearTimeout(revealTimer);
    revealTimer = setTimeout(reveal, reduce ? 0 : DURATION * REVEAL_AT);       // 확대가 끝나기 전에 선·하위 항목 등장 시작
    animate(cur, SCALE, () => {
      clearTimeout(revealTimer);
      if (!body.classList.contains('open')) reveal();
      back.focus({preventScroll:true});
    });
  }

  // 선 그리기 + 하위 항목 등장 시작 (등장 속도 자체는 기존 그대로)
  function reveal(){
    if (!active) return;
    body.classList.add('open');
    // 등장 지연은 첫 등장에만 쓰고, 이후 hover 반응이 굼뜨지 않도록 해제
    clearTimeout(settleTimer); settleTimer = setTimeout(settle, 2000);
  }

  function close(){
    if (!active) return;
    const btn = active; active = null;
    clearTimeout(revealTimer); clearTimeout(settleTimer); settle();
    body.classList.remove('open');
    btn.classList.remove('live');
    clearTimeout(timer);
    timer = setTimeout(() => animate(cur, 1, () => {
      body.classList.remove('zoomed');
      btn.classList.remove('active');
      btn.focus({preventScroll:true});
      fitIntro();
    }), 300);
  }

  document.querySelectorAll('.main').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if (active === b){ if (b.classList.contains('live')) titleAction(b.dataset.key); return; }   // 확대된 타이틀 버튼
    open(b);
  }));
  back.addEventListener('click', e => { e.stopPropagation(); close(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (body.classList.contains('blogmode')) blogEscape(); else close();
  });
  document.addEventListener('click', e => {
    if (!body.classList.contains('blogmode') && active && body.classList.contains('open') && !e.target.closest('.btn, .sub-text')) close();
  });
  addEventListener('resize', () => {
    if (!active) return;
    const T = target(active); origin = T.origin;
    cancelAnimationFrame(raf); cur = SCALE; apply(SCALE);
    layout(T);
  });

  /* =====================================================================
     Blog — 카테고리별 포스트 목록 / 포스트 페이지
     주소(#blog/…)로 상태를 관리하므로 브라우저 뒤로가기도 동작함
       #blog/all/1  전체 목록 1페이지   #blog/c2/1  카테고리 3번째 1페이지   #blog/post/007/c2  글 번호 007 (카테고리 3번째 목록에서 연 경우)
     ===================================================================== */
  const BLOG_TITLE = 'Security Deep Field', BLOG_SUBTITLE = 'Security Blog';     // 블로그 제목 영역 (모든 화면에서 유지)
  const ALL_LABEL = 'All', PER_PAGE = 20;                   // 전체 보기 이름, 한 페이지 최대 포스트 수
  const CATS = MENU.blog;                                   // 카테고리 6개 (이름은 MENU.blog에서 수정)
  const amp = name => name.replace(/\s*\/\s*/g, ' & ');      // 카테고리 이름의 / 를 ' & ' 로 (예: CTF/Wargame → CTF & Wargame) — 메인 Blog 하위 버튼과 목록 제목에 사용

  // ── 마크다운 → HTML (외부 라이브러리 없이) ──────────────────
  // 지원: 제목(#), 굵게/기울임/취소선, 인라인·블록 코드, 링크, 이미지, 인용문, 목록(중첩·체크박스), 표, 구분선, HTML 태그 그대로
  const MD_BREAKS = true;                                   // 엔터 한 번의 줄바꿈도 그대로 줄바꿈으로 표시
  function mdToHtml(src){
    const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    const blank = l => /^\s*$/.test(l);
    const isFence = l => /^\s{0,3}(`{3,}|~{3,})/.test(l);
    const isHead  = l => /^\s{0,3}#{1,6}\s/.test(l);
    const isHr    = l => /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(l);
    const isQuote = l => /^\s{0,3}>/.test(l);
    const isItem  = l => /^\s*([-*+]|\d+[.)])\s+/.test(l);
    const isSep   = l => l.includes('|') && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
    const isTable = i => lines[i].includes('|') && i + 1 < lines.length && isSep(lines[i + 1]);
    const starts  = i => isFence(lines[i]) || isHead(lines[i]) || isHr(lines[i]) || isQuote(lines[i]) || isItem(lines[i]) || isTable(i);

    function inline(t){
      const stash = [], keep = h => '\u0000' + (stash.push(h) - 1) + '\u0000';
      const url = u => u.replace(/^<|>$/g, '');
      t = t.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, c) => keep('<code>' + esc(c.trim()) + '</code>'));
      t = t.replace(/!\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]*)(?:\s+"([^"]*)")?\s*\)/g,
        (_, alt, u, ti) => keep(`<img src="${url(u)}" alt="${alt.replace(/"/g, '&quot;')}"${ti ? ` title="${ti}"` : ''}>`));
      t = t.replace(/\[([^\]]+)\]\(\s*(<[^>]*>|[^)\s]*)(?:\s+"([^"]*)")?\s*\)/g,
        (_, txt, u, ti) => keep(`<a href="${url(u)}" target="_blank" rel="noopener"${ti ? ` title="${ti}"` : ''}>`) + txt + keep('</a>'));
      t = t.replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>')
           .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
           .replace(/(^|[^*])\*([^*\s]|[^*\s][^*\n]*[^*\s])\*(?!\*)/g, '$1<em>$2</em>')
           .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?=[^\w]|$)/g, '$1<strong>$2</strong>')
           .replace(/(^|[^\w])_([^_\s]|[^_\s][^_\n]*[^_\s])_(?=[^\w]|$)/g, '$1<em>$2</em>')
           .replace(/~~(?=\S)([^~]*?\S)~~/g, '<del>$1</del>');
      if (MD_BREAKS) t = t.replace(/\n/g, '<br>');
      return t.replace(/\u0000(\d+)\u0000/g, (_, k) => stash[+k]);
    }

    const out = [];
    let i = 0, m;
    while (i < lines.length){
      const l = lines[i];
      if (blank(l)){ i++; continue; }

      if ((m = l.match(/^\s{0,3}(`{3,}|~{3,})\s*([\w+#.-]*)/))){          // 코드 블록
        const close = new RegExp('^\\s{0,3}' + m[1][0] + '{' + m[1].length + ',}\\s*$'), buf = [];
        i++;
        while (i < lines.length && !close.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<pre><code${m[2] ? ` class="language-${m[2]}"` : ''}>${esc(buf.join('\n'))}</code></pre>`);
        continue;
      }
      if ((m = l.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/))){            // 제목
        out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue;
      }
      if (isHr(l)){ out.push('<hr>'); i++; continue; }                      // 구분선
      if (isQuote(l)){                                                      // 인용문
        const buf = [];
        while (i < lines.length && isQuote(lines[i])) buf.push(lines[i++].replace(/^\s{0,3}>\s?/, ''));
        out.push('<blockquote>' + mdToHtml(buf.join('\n')) + '</blockquote>'); continue;
      }
      if (isTable(i)){                                                      // 표
        const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const head = cells(l), rows = [];
        const al = cells(lines[i + 1]).map(c => c.startsWith(':') ? (c.endsWith(':') ? 'center' : 'left') : (c.endsWith(':') ? 'right' : ''));
        i += 2;
        while (i < lines.length && !blank(lines[i]) && lines[i].includes('|')) rows.push(cells(lines[i++]));
        const cell = (tag, c, k) => `<${tag}${al[k] ? ` style="text-align:${al[k]}"` : ''}>${inline(c)}</${tag}>`;
        out.push('<div class="tbl"><table><thead><tr>' + head.map((c, k) => cell('th', c, k)).join('') + '</tr></thead><tbody>' +
          rows.map(r => '<tr>' + r.map((c, k) => cell('td', c, k)).join('') + '</tr>').join('') + '</tbody></table></div>');
        continue;
      }
      if (isItem(l)){                                                       // 목록 (중첩 · 체크박스)
        const items = [];
        while (i < lines.length){
          const mm = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
          if (mm && !isHr(lines[i])){ items.push({ ind: mm[1].replace(/\t/g, '    ').length, ord: /\d/.test(mm[2]), text: mm[3] }); i++; }
          else if (items.length && !blank(lines[i]) && /^\s+\S/.test(lines[i])) { items[items.length - 1].text += '\n' + lines[i].trim(); i++; }
          else if (blank(lines[i]) && i + 1 < lines.length && isItem(lines[i + 1]) && !isHr(lines[i + 1])) i++;
          else break;
        }
        let html = '';
        const stack = [];
        items.forEach(it => {
          while (stack.length && it.ind < stack[stack.length - 1].ind) html += `</li></${stack.pop().tag}>`;
          const tag = it.ord ? 'ol' : 'ul';
          if (stack.length && it.ind === stack[stack.length - 1].ind && stack[stack.length - 1].tag !== tag)
            html += `</li></${stack.pop().tag}>`;                          // 같은 단계에서 -목록 → 1.목록으로 바뀌면 새 목록
          const top = stack[stack.length - 1];
          if (!top || it.ind > top.ind){ html += `<${tag}>`; stack.push({ ind: it.ind, tag }); }
          else html += '</li>';
          const txt = it.text.replace(/^\[( |x|X)\]\s+/, (_, c) => `<input type="checkbox" disabled${c === ' ' ? '' : ' checked'}> `);
          html += '<li>' + inline(txt);
        });
        while (stack.length) html += `</li></${stack.pop().tag}>`;
        out.push(html); continue;
      }
      const buf = [l]; i++;                                                 // 문단
      while (i < lines.length && !blank(lines[i]) && !starts(i)) buf.push(lines[i++]);
      out.push('<p>' + inline(buf.join('\n')) + '</p>');
    }
    return out.join('\n');
  }
  const htmlOf = p => p._h || (p._h = mdToHtml(p.md));      // 마크다운 본문 → HTML (한 번만 변환해 보관)

  // ── 포스트 데이터 ──────────────────────────────────────────
  // { id:'000', cat:0~5(CATS 순서), title, date:'YYYY-MM-DD', md:'마크다운 본문' }
  // 목록의 "글 첫 부분 / 첫 이미지"는 본문에서 자동 추출됨(이미지가 없으면 이미지 없이 표시).
  // 글은 posts/ 폴더의 마크다운 파일로 올림. build_blog.py가 읽어서 blog-data.js를 만들고, 여기서는 그 데이터를 사용함.
  const DATA = window.BLOG_DATA;
  if (DATA && DATA.posts) MENU.blog.splice(0, MENU.blog.length, ...DATA.categories);   // 카테고리 = posts/ 안의 폴더
  const POSTS = DATA && DATA.posts ? DATA.posts.map(p => ({ ...p, id: String(p.id) })) : [];

  // ── 공통 도우미 ────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const blog = $('blog'), bmain = $('bmain'), catsEl = $('cats');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const fmt = d => d.replace(/-/g, '.');
  const listOf = cat => POSTS.filter(p => cat === 'all' || p.cat === cat)
                             .sort((a, b) => b.date.localeCompare(a.date) || (a.id < b.id ? 1 : -1));     // 최신순
  const info = p => p._x || (p._x = (() => {                // 글 첫 부분 + 첫 이미지 추출
    const doc = new DOMParser().parseFromString(htmlOf(p), 'text/html');
    doc.querySelectorAll('br').forEach(b => b.replaceWith(' '));
    const img = doc.querySelector('img');
    const txt = ([...doc.body.querySelectorAll('p')].map(e => e.textContent.trim()).join(' ') || doc.body.textContent).trim();
    return { img: img ? img.getAttribute('src') : null, ex: txt.length > 170 ? txt.slice(0, 170).trim() + '…' : txt };
  })());

  $('btitle').textContent = BLOG_TITLE; $('bsub').textContent = BLOG_SUBTITLE;

  // ── 주소 ↔ 상태 ────────────────────────────────────────────
  let st = null, lastList = null, pendingY = 0;             // 현재 상태 / 마지막으로 본 목록(이전 버튼용) / 복원할 스크롤
  const ctxKey = c => c === 'all' ? 'all' : 'c' + c;
  // from: 포스트를 어느 목록(전체 'all' 또는 카테고리 번호)에서 열었는지 → '다른 글 목록'이 그 목록의 글로 채워짐
  const hashOf = s => s.view === 'post' ? `#blog/post/${s.id}` + (s.from != null ? '/' + ctxKey(s.from) : '') : `#blog/${ctxKey(s.cat)}/${s.page}`;
  function parseHash(){
    const m = location.hash.split('/');
    if (m[0] !== '#blog') return null;
    if (m[1] === 'post'){
      const id = m[2], f = m[3] || '';
      if (POSTS.some(p => p.id === id)){
        let from = null;
        if (f === 'all') from = 'all'; else if (/^c\d+$/.test(f) && +f.slice(1) < CATS.length) from = +f.slice(1);
        return { view:'post', id, from };
      }
    }
    let cat = 'all';
    if (/^c\d+$/.test(m[1] || '')){ const n = +m[1].slice(1); if (n < CATS.length) cat = n; }
    return { view:'list', cat, page: Math.max(1, parseInt(m[2]) || 1) };
  }
  let navBusy = false;
  const push = s => { history.pushState(null, '', hashOf(s)); route(); };
  // 사라지는 모션 (모든 화면 전환 공통): 목록은 카드가 아래로 내려가며(등장의 반대 순서), 본문은 박스가 아래로 내려가며 사라짐.
  // 본문 → 목록일 때는 왼쪽 '다른 글 목록' 박스도 왼쪽으로 빠지며 사라짐. 끝나면 done() 호출
  function exitCenter(targetView, done){
    const wrap = bmain.firstElementChild;
    if (reduce || !wrap) { done(); return; }
    let wait = 210;
    if (wrap.classList.contains('bwrap')){
      const br = bmain.getBoundingClientRect();
      const vis = [...wrap.querySelectorAll('.row')].filter(c => { const r = c.getBoundingClientRect(); return r.bottom > br.top && r.top < br.bottom; }).slice(0, 8);
      vis.forEach((c, k) => c.style.setProperty('--ld', (vis.length - 1 - k) * 21 + 'ms'));   // 아래 카드부터
      wait = Math.max(0, vis.length - 1) * 21 + 210;
      wrap.classList.add('leaving');
    } else if (wrap.classList.contains('pview')){
      wrap.classList.add('leaving');
      const side = catsEl.querySelector('.others.side');
      if (targetView === 'list' && side) side.classList.add('leaving');
    } else { done(); return; }
    setTimeout(done, wait);
  }
  function go(s){
    if (navBusy) return;
    if (body.classList.contains('blogmode') && st){                    // 블로그 안에서의 이동: 사라진 뒤 새 화면 등장
      const was = st; navBusy = true;
      exitCenter(s.view, () => { navBusy = false; if (st === was) push(s); });
      return;
    }
    push(s);
  }
  const enterBlog = cat => go({ view:'list', cat, page:1 });          // 'all' 또는 카테고리 번호

  function route(){
    const s = parseHash(), on = body.classList.contains('blogmode');
    const entering = !on, fromList = entering || (st && st.view === 'list');   // 블로그가 처음 뜨는 중인지 / 목록에서 넘어왔는지 (애니메이션용)
    if (!s){ if (on){ body.classList.remove('blogmode'); blog.setAttribute('aria-hidden', 'true'); } return; }
    if (!on){ body.classList.add('blogmode'); blog.setAttribute('aria-hidden', 'false'); }
    blog.classList.toggle('no-t', entering);                 // 블로그가 처음 뜰 때는 타이틀 접힘/펼침 전환 없이 바로 적용
    blog.classList.toggle('postview', s.view === 'post');    // 본문 화면에서는 타이틀 숨김
    if (entering){ void blog.offsetWidth; requestAnimationFrame(() => blog.classList.remove('no-t')); }
    const keepY = (!entering && st && st.view === 'post' && s.view === 'post') ? ((catsEl.querySelector('.olist') || {}).scrollTop || 0) : 0;   // 다른 글 목록 스크롤 위치 유지
    st = s; renderCats(entering);
    if (s.view === 'list'){ lastList = { cat:s.cat, page:s.page, y:0 }; renderList(s, entering); } else renderPost(s, entering, fromList);   // 목록을 볼 때마다 '이전' 복귀 지점 갱신
    bmain.scrollTop = pendingY; pendingY = 0;
    if (keepY){ const ol = catsEl.querySelector('.olist'); if (ol){ ol.scrollTop = keepY; if (ol._fade) ol._fade(); } }
  }

  // 홈: 블로그를 닫고 맨 처음 화면(확대 해제)으로
  function goHome(){
    close();
    history.pushState(null, '', location.pathname + location.search);
    route();
  }
  // 이전: 마지막으로 보던 목록(페이지·스크롤 위치 포함)으로
  function goPrev(){
    const L = lastList || { cat: st.from != null ? st.from : POSTS.find(p => p.id === st.id).cat, page: 1, y: 0 };
    pendingY = L.y || 0;
    if (!navBusy) setActiveCat(L.cat);
    go({ view:'list', cat:L.cat, page:L.page });
  }
  function blogEscape(){ if (st && st.view === 'post') goPrev(); }

  // ── 왼쪽 카테고리 버튼 ─────────────────────────────────────
  // 카테고리 선택 색을 즉시 바꿈 (사라짐 모션이 끝나기를 기다리지 않음)
  function setActiveCat(key){
    catsEl.querySelectorAll('.cat').forEach(b => { b.classList.toggle('on', b.dataset.key === String(key)); b.classList.remove('cur'); });
  }
  function renderCats(entering){
    catsEl.replaceChildren(); catsEl.classList.toggle('enter', !!entering);        // 블로그가 처음 뜰 때만 카테고리 등장 모션
    const here = st.view === 'post' ? (st.from != null ? st.from : POSTS.find(p => p.id === st.id).cat) : st.cat;
    let order = 0;
    const mk = (label, n, key, extra) => {
      const b = el('button', 'bbtn cat' + (extra || '') + (st.view === 'list' && st.cat === key ? ' on' : '') + (st.view === 'post' && here === key ? ' cur' : ''));
      const lab = el('span');                                // 이름에 / 가 있으면 / 는 지우고 그 자리에서 줄바꿈 (예: Blog / Technical Writing)
      label.split('/').forEach((part, k) => { if (k) lab.append(document.createElement('br')); lab.append(part.trim()); });
      b.type = 'button'; b.append(lab, el('span', 'n', String(n))); b.style.setProperty('--i', order++);
      b.dataset.key = key;
      b.addEventListener('click', () => { if (navBusy) return; setActiveCat(key); go({ view:'list', cat:key, page:1 }); });   // 선택 색은 애니메이션을 기다리지 않고 즉시
      catsEl.appendChild(b);
    };
    mk(ALL_LABEL, POSTS.length, 'all', ' all');
    CATS.forEach((c, i) => mk(c, POSTS.filter(p => p.cat === i).length, i));
  }

  // ── 포스트 목록 ────────────────────────────────────────────
  function cardEl(p, i){
    const x = info(p), a = el('a', 'card' + (x.img ? ' hasimg' : ''));
    a.href = hashOf({ view:'post', id:p.id, from:st.cat });
    const t = el('div', 'txt'), meta = el('div', 'meta');
    meta.append(el('span', 'c', amp(CATS[p.cat])), el('time', null, fmt(p.date)));
    t.append(meta, el('h2', null, p.title), el('p', 'ex', x.ex));
    a.append(t);
    if (x.img){
      const th = el('div', 'thumb'), im = new Image();
      im.src = x.img; im.alt = ''; th.append(im); a.append(th);
    }
    a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      if (st.view === 'list') lastList = { cat:st.cat, page:st.page, y:bmain.scrollTop };   // 이전 버튼이 돌아올 자리
      go({ view:'post', id:p.id, from:st.cat });               // 어느 목록에서 열었는지 기억 → 다른 글 목록에 반영
    });
    const row = el('div', 'row');                           // 가로선·등장/퇴장 모션은 행이, 호버 효과는 안쪽 링크가 담당
    row.style.setProperty('--i', i);
    if (i >= 8) row.classList.add('na');                     // 첫 화면 밖의 항목은 등장 모션 생략
    row.append(a);
    return row;
  }
  function pagerEl(s, pages){
    const nav = el('nav', 'pager');
    const b = (label, page, on, dis) => {
      const x = el('button', 'bbtn' + (on ? ' on' : ''), label); x.type = 'button'; x.disabled = !!dis;
      if (!dis) x.addEventListener('click', () => go({ view:'list', cat:s.cat, page }));
      nav.append(x);
    };
    b('‹', s.page - 1, false, s.page <= 1);
    for (let n = 1; n <= pages; n++) b(String(n), n, n === s.page);
    b('›', s.page + 1, false, s.page >= pages);
    return nav;
  }
  function renderList(s, entering){
    const all = listOf(s.cat), pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    if (s.page > pages) s.page = pages;
    const wrap = el('div', 'bwrap'), head = el('div', 'lhead');
    wrap.style.setProperty('--d0', entering ? '.385s' : '0s');   // 블로그가 처음 뜰 때는 카테고리·제목 뒤에 등장
    head.append(el('span', 'lt', s.cat === 'all' ? ALL_LABEL : amp(CATS[s.cat])), el('span', 'lc', `${all.length} posts`));
    wrap.append(head);
    if (!all.length) wrap.append(el('div', 'rule'));            // 글이 없으면 메시지 없이, 현재 카테고리 제목 아래에 가로선 하나만 표시
    all.slice((s.page - 1) * PER_PAGE, s.page * PER_PAGE).forEach((p, i) => wrap.append(cardEl(p, i)));
    if (pages > 1) wrap.append(pagerEl(s, pages));
    bmain.classList.remove('post');
    bmain.replaceChildren(wrap);
  }

  // ── 포스트 페이지 (본문 + 이전 버튼 + 다른 포스트 목록) ─────
  function setCurOther(a){
    a.parentNode.querySelectorAll('.oi.cur').forEach(x => { x.classList.remove('cur'); x.removeAttribute('aria-current'); });
    a.classList.add('cur'); a.setAttribute('aria-current', 'page');
  }
  function otherEl(q, from, curId){
    const a = el('a', 'oi' + (q.id === curId ? ' cur' : ''));
    if (q.id === curId) a.setAttribute('aria-current', 'page');
    a.href = hashOf({ view:'post', id:q.id, from });
    const t = el('div', 'ox'), meta = el('div', 'meta');
    meta.append(el('span', 'c', amp(CATS[q.cat])), el('time', null, fmt(q.date)));
    t.append(el('div', 'tt', q.title), meta); a.append(t);
    a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      if (q.id !== curId){                                       // 지금 보는 글은 눌러도 이동 없음
        if (navBusy) return;
        setCurOther(a);                                          // 어둡게 표시되는 '현재 글'을 애니메이션을 기다리지 않고 즉시 옮김
        go({ view:'post', id:q.id, from });
      }
    });
    return a;
  }
  // 다른 포스트 박스 (제목 글자 없이 박스만). side: 카테고리 버튼 아래 / under: 좁은 화면에서 본문 아래
  // from: 글을 연 목록('all'이면 전체 글, 카테고리 번호면 그 카테고리의 글만) — 지금 보는 글도 포함(어둡게 표시)
  function othersEl(p, cls, from, anim, d0){
    const box = el('div', 'others ' + cls + (anim ? ' anim' : '')), list = el('div', 'olist');
    box.style.setProperty('--d0', d0);
    listOf(from).forEach(q => list.append(otherEl(q, from, p.id)));
    box.append(list); return box;
  }
  function renderPost(s, entering, fromList){
    const p = POSTS.find(q => q.id === s.id), from = s.from != null ? s.from : p.cat;
    const wrap = el('div', 'pview'), art = el('article', 'article');
    const meta = el('div', 'meta'), content = el('div', 'content'), abody = el('div', 'abody');
    meta.append(el('span', 'c', amp(CATS[p.cat])), el('time', null, fmt(p.date)));
    content.innerHTML = htmlOf(p);                          // 마크다운 → HTML 본문
    const h1 = content.firstElementChild;                   // 본문 첫 줄이 # 제목이면 중복이라 제거
    if (h1 && h1.tagName === 'H1') h1.remove();
    const first = content.querySelector('img');             // 첫 사진은 본문 맨 위 오른쪽에
    if (first){ first.classList.add('first'); content.prepend(first); }
    abody.append(meta, el('h1', null, p.title), content);
    art.append(abody);
    wrap.style.setProperty('--d0', entering ? '.385s' : '0s');
    wrap.append(art, othersEl(p, 'under', from, false, '0s'));
    bmain.classList.add('post');
    bmain.replaceChildren(wrap);
    catsEl.append(othersEl(p, 'side', from, fromList, entering ? '.525s' : '0s'));   // 카테고리 버튼 아래 (목록에서 넘어왔을 때만 등장 모션)
    const ol = catsEl.querySelector('.olist'), cur = ol && ol.querySelector('.oi.cur');    // 현재 글이 보이도록 목록 스크롤을 맞춤
    if (ol && cur) ol.scrollTop = Math.max(0, cur.offsetTop - (ol.clientHeight - cur.offsetHeight) / 2);
    if (ol) edgeFade(ol);
  }
  // 다른 글 목록 위/아래: 위로 더 스크롤할 수 있으면 위쪽이, 아래로 더 있으면 아래쪽이 서서히 사라지게
  function edgeFade(ol){
    const upd = () => {
      ol.style.setProperty('--ft', ol.scrollTop > 2 ? '28px' : '0px');
      ol.style.setProperty('--fb', ol.scrollTop + ol.clientHeight < ol.scrollHeight - 2 ? '28px' : '0px');
    };
    ol._fade = upd; ol.addEventListener('scroll', upd, { passive:true }); upd();
  }
  addEventListener('resize', () => { const ol = catsEl.querySelector('.olist'); if (ol && ol._fade) ol._fade(); });

  $('home').addEventListener('click', goHome);
  addEventListener('popstate', () => {                      // 브라우저 뒤로/앞으로가기도 같은 사라짐→등장 모션
    const s = parseHash();
    if (s && body.classList.contains('blogmode') && !navBusy && st){
      navBusy = true; exitCenter(s.view, () => { navBusy = false; route(); });
    } else route();
  });
  route();                                                  // 주소에 #blog/… 가 있으면 바로 해당 화면

  // 왼쪽 메뉴: 클릭 → 해당 메인 버튼을 누른 것과 같은 확대 / 마우스를 올리면 해당 메인 버튼에 마우스를 올린 것과 같은 효과(.hot)
  document.querySelectorAll('.sbtn').forEach(b => {
    const m = document.querySelector('.main[data-key="' + b.dataset.key + '"]');
    const on  = () => { if (!active) m.classList.add('hot'); };
    const off = () => m.classList.remove('hot');
    b.addEventListener('mouseenter', on);  b.addEventListener('mouseleave', off);
    b.addEventListener('focus', on);       b.addEventListener('blur', off);
    b.addEventListener('click', e => { e.stopPropagation(); off(); open(m); });
  });

  // 왼쪽 메뉴 가로선: 두께를 글자 획 두께(글자 크기의 약 STROKE배)로 맞추고, 위치를 기기 픽셀에 맞춰서
  // 소수점 위치 때문에 어떤 선은 굵게/흐리게 보이는 현상을 없앰 (모든 선이 같은 두께로 보임)
  const STROKE = 0.05;
  function snapLines(){
    const dpr = window.devicePixelRatio || 1, side = document.getElementById('side');
    const ls = [...side.querySelectorAll('.vline')];
    const t = Math.max(1, Math.round(parseFloat(getComputedStyle(side).fontSize) * STROKE * dpr)) / dpr;
    ls.forEach(l => { l.style.transform = ''; l.style.height = t + 'px'; });
    ls.forEach(l => {
      const top = l.getBoundingClientRect().top;
      l.style.transform = `translateY(${Math.round(top * dpr) / dpr - top}px)`;
    });
  }
  snapLines();
  addEventListener('resize', snapLines);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(snapLines);

  // 소개글(#mintro)은 메인 버튼·왼쪽 메뉴와 겹치지 않는 빈 공간에만 놓음.
  // 기본 크기로 겹치지 않으면 그대로 두고, 겹치는 화면 크기에서만 글자를 조금씩 줄이고 폭을 넓혀 비켜 줌 (다른 요소는 건드리지 않음)
  function fitIntro(){
    const el = document.getElementById('mintro');
    if (!el || body.classList.contains('zoomed')) return;           // 확대 중에는 버튼 위치가 달라 측정하지 않음
    el.style.fontSize = ''; el.style.width = '';
    const obstacles = [...document.querySelectorAll('.main'), document.getElementById('side')].map(o => o.getBoundingClientRect());
    const gap = 14;
    const hit = r => obstacles.some(o => r.left < o.right + gap && r.right > o.left - gap && r.top < o.bottom + gap && r.bottom > o.top - gap);
    if (!hit(el.getBoundingClientRect())) return;
    const base = parseFloat(getComputedStyle(el).fontSize), w0 = el.getBoundingClientRect().width;
    const wMax = innerWidth - 2 * el.getBoundingClientRect().left;
    for (let fs = base; fs >= 9; fs -= 0.5){
      el.style.fontSize = fs + 'px';
      for (let w = w0; w <= wMax + 1; w += 24){
        el.style.width = Math.min(w, wMax) + 'px';
        if (!hit(el.getBoundingClientRect())) return;
      }
    }
  }
  fitIntro();
  addEventListener('resize', () => requestAnimationFrame(fitIntro));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitIntro);

  // 첫 진입 연출: Activities → Contact → Blog → Profile 순서 (#blog 주소로 바로 들어오면 생략)
  ['activities', 'contact', 'blog', 'profile'].forEach((k, i) =>
    document.querySelector('.main[data-key="' + k + '"]').style.setProperty('--k', i));
  if (/^#blog/.test(location.hash)) body.classList.remove('intro');
  else setTimeout(() => body.classList.remove('intro'), 1600);   // 마지막 버튼 등장(약 1.5초) 직후
})();