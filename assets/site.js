// Rigsta docs: the light/dark switch, the contents rail following the page, and the manual's search.
(function () {
  var root = document.documentElement;
  var btn = document.querySelector('.theme');
  if (btn) btn.addEventListener('click', function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('rigsta-docs-theme', root.dataset.theme); } catch (e) {}
  });
  if (!root.dataset.theme && matchMedia('(prefers-color-scheme: light)').matches) root.dataset.theme = 'light';

  // ── the contents rail lights the section being read ──
  var links = Array.prototype.slice.call(document.querySelectorAll('#tocnav a'));
  if (links.length && 'IntersectionObserver' in window) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var heads = Array.prototype.slice.call(document.querySelectorAll('.doc h2[id], .doc h3[id]'));
    var io = new IntersectionObserver(function () {
      var cur = null;
      heads.forEach(function (h) { if (h.getBoundingClientRect().top < 140) cur = h; });
      links.forEach(function (a) { a.classList.remove('on'); });
      if (cur && byId[cur.id]) {
        byId[cur.id].classList.add('on');
        var nav = document.getElementById('tocnav'), a = byId[cur.id];
        if (nav && a.offsetTop < nav.parentNode.scrollTop || a.offsetTop > nav.parentNode.scrollTop + nav.parentNode.clientHeight - 60)
          nav.parentNode.scrollTop = a.offsetTop - 120;
      }
    }, { rootMargin: '0px 0px -70% 0px' });
    heads.forEach(function (h) { io.observe(h); });
  }

  // ── pictures: a click opens the screenshot over the page, fitted to the screen; a click on it shows it at full
  //    resolution (scroll to look around), ← → step through the page's pictures, Esc or the backdrop closes ──
  var shots = Array.prototype.slice.call(document.querySelectorAll('.doc figure.shot img, .landing img'));
  if (shots.length) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = '<div class="lb-stage"><img alt=""></div><div class="lb-bar"><span class="lb-cap"></span>' +
      '<span class="lb-hint">Click the picture for full size · ← → next · Esc closes</span>' +
      '<button type="button" class="lb-close" aria-label="Close">✕</button></div>';
    document.body.appendChild(box);
    var stage = box.querySelector('.lb-stage'), big = stage.querySelector('img'), cap = box.querySelector('.lb-cap'), at = 0;
    function show(i) {
      at = (i + shots.length) % shots.length;
      var img = shots[at], fig = img.closest('figure'), c = fig && fig.querySelector('figcaption');
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      cap.textContent = c ? c.textContent : (img.alt || '');
      box.classList.remove('full');
      stage.scrollTop = stage.scrollLeft = 0;
    }
    function open(i) { show(i); box.classList.add('on'); document.body.classList.add('lb-open'); }
    function close() { box.classList.remove('on', 'full'); document.body.classList.remove('lb-open'); }
    shots.forEach(function (img, i) {
      img.classList.add('zoomable');
      var link = img.closest('a');
      (link || img).addEventListener('click', function (e) { e.preventDefault(); open(i); });
    });
    big.addEventListener('click', function (e) {
      e.stopPropagation();
      var full = !box.classList.contains('full'), rx = e.offsetX / big.clientWidth, ry = e.offsetY / big.clientHeight;
      box.classList.toggle('full', full);
      // at full size, keep the clicked spot under the pointer
      if (full) { stage.scrollLeft = rx * big.naturalWidth - stage.clientWidth / 2; stage.scrollTop = ry * big.naturalHeight - stage.clientHeight / 2; }
    });
    stage.addEventListener('click', function (e) { if (e.target === stage) close(); });
    box.querySelector('.lb-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('on')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(at + 1);
      else if (e.key === 'ArrowLeft') show(at - 1);
    });
  }

  // ── search: every paragraph, list item and table row, under the heading it sits in ──
  var q = document.getElementById('q'), hits = document.getElementById('hits');
  if (!q) return;
  var index = [], heading = null;
  document.querySelectorAll('.doc h2, .doc h3, .doc h4, .doc p, .doc li, .doc tr').forEach(function (el) {
    if (/^H[234]$/.test(el.tagName)) { heading = el; return; }
    if (el.tagName === 'P' && el.closest('li')) return;
    if (heading) index.push({ h: heading, el: el, text: el.textContent.replace(/\s+/g, ' ').trim() });
  });
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  q.addEventListener('input', function () {
    var term = q.value.trim().toLowerCase();
    hits.innerHTML = '';
    if (term.length < 2) return;
    var found = 0, seen = {};
    for (var i = 0; i < index.length && found < 12; i++) {
      var it = index[i], at = it.text.toLowerCase().indexOf(term);
      if (at < 0) continue;
      var key = it.h.id + '|' + it.text.slice(0, 40);
      if (seen[key]) continue;
      seen[key] = 1; found++;
      var from = Math.max(0, at - 40), snip = it.text.slice(from, at + term.length + 60);
      var a = document.createElement('a');
      a.href = '#' + it.h.id;
      a.innerHTML = esc(it.h.textContent.replace(/#$/, '')) + '<small>' + (from ? '…' : '') +
        esc(snip).replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), function (m) { return '<mark>' + m + '</mark>'; }) + '…</small>';
      (function (el) { a.addEventListener('click', function () { setTimeout(function () { el.scrollIntoView({ block: 'center' }); }, 0); }); })(it.el);
      hits.appendChild(a);
    }
    if (!found) hits.innerHTML = '<div class="none">Nothing found.</div>';
  });
})();
