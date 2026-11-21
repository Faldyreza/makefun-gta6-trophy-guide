/* Leonida Trophy Ledger — tracker, filters, spoiler mode, roadmap, export/import.
   Loads only its own files: data/trophies.json and data/roadmap.json. No network at runtime.
   Screenshot helpers (URL params, never persisted): ?view=guide|roadmap|checklist,
   ?detail=<trophy id> to open one trophy, ?spoiler=1, ?earned=<n> to preview n earned. */
(function () {
  'use strict';

  var TROPHY_KEY = 'gta6-trophy-ledger-earned-v4';
  var CHECK_KEY = 'gta6-trophy-ledger-checklist-v4';

  var trophies = [];
  var roadmap = null;
  var earned = new Set();
  var checked = new Set();
  var openDetail = null;
  var demoEarned = 0;

  var $ = function (id) { return document.getElementById(id); };

  function loadSet(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return new Set();
      var arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) { return new Set(); }
  }
  function saveSet(key, set) {
    try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch (e) {}
  }

  function gradeLabel(g) {
    return { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' }[g] || g;
  }
  function kindLabel(k) {
    return { story: 'Story', side: 'Side', collectibles: 'Collectibles', activities: 'Activities', platinum: 'Platinum' }[k] || k;
  }
  function stars(n) {
    if (!n) return 'Difficulty: not rated yet';
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
    return 'Difficulty ' + s + ' (' + n + '/5)';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isSpoilerHidden(t) {
    return $('spoilerMode').checked && t.kind === 'story' && !earned.has(t.id);
  }

  function currentFilters() {
    return {
      q: ($('search').value || '').trim().toLowerCase(),
      kind: $('kindFilter').value,
      grade: $('gradeFilter').value,
      hideEarned: $('hideEarned').checked
    };
  }

  function visibleTrophies() {
    var f = currentFilters();
    return trophies.filter(function (t) {
      if (f.hideEarned && earned.has(t.id)) return false;
      if (f.kind === 'missable') { if (!t.missable) return false; }
      else if (f.kind !== 'all' && t.kind !== f.kind) return false;
      if (f.grade !== 'all' && t.grade !== f.grade) return false;
      if (f.q) {
        var hay = (t.name + ' ' + t.official + ' ' + t.guide + ' ' + (t.chapter || '')).toLowerCase();
        if (hay.indexOf(f.q) === -1) return false;
      }
      return true;
    });
  }

  function renderProgress() {
    var n = earned.size;
    $('earnedCount').textContent = n + ' / ' + trophies.length;
    $('earnedPct').textContent = Math.round((n / trophies.length) * 100) + '%';
    $('progressFill').style.width = (n / trophies.length) * 100 + '%';
    var byGrade = { platinum: [0, 1], gold: [0, 2], silver: [0, 6], bronze: [0, 46] };
    trophies.forEach(function (t) { if (earned.has(t.id)) byGrade[t.grade][0]++; });
    $('gradeCounts').textContent = 'Platinum ' + byGrade.platinum[0] + '/1 · Gold ' + byGrade.gold[0] + '/2 · Silver ' + byGrade.silver[0] + '/6 · Bronze ' + byGrade.bronze[0] + '/46';
  }

  function cardHtml(t) {
    var isEarned = earned.has(t.id);
    var hidden = isSpoilerHidden(t);
    var chips = '<span class="chip ' + t.grade + '">' + gradeLabel(t.grade) + '</span>'
      + '<span class="chip">' + kindLabel(t.kind) + '</span>'
      + (t.hidden ? '<span class="chip hidden">Hidden</span>' : '')
      + (t.missable ? '<span class="chip missable">Missable</span>' : '')
      + (t.status === 'lead' ? '<span class="chip lead">Community lead</span>' : '')
      + (t.status === 'unknown' ? '<span class="chip unknown">Method unknown</span>' : '');
    var head;
    if (hidden) {
      head = '<div class="card-name">Hidden story trophy</div>'
        + '<p class="card-official">Spoiler-safe mode hides this story trophy until you earn it.</p>'
        + '<div class="spoiler-box">SPOILER HIDDEN — tick the box when you earn it to reveal the guide.</div>';
    } else {
      head = '<div class="card-name">' + esc(t.name) + '</div>'
        + '<p class="card-official">“' + esc(t.official) + '”' + (t.chapter ? ' · ' + esc(t.chapter) : '') + '</p>';
    }
    var detail = '';
    if (openDetail === t.id && !hidden) {
      var steps = t.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
      detail = '<div class="detail">'
        + '<h4>Guide</h4><p>' + esc(t.guide) + '</p>'
        + '<h4>Steps</h4><ol>' + steps + '</ol>'
        + '<p class="meta"><b>' + esc(stars(t.difficulty)) + '</b> · Time: ' + esc(t.time) + ' · Phase ' + t.phase + '</p>'
        + '<p class="sources"><b>Sources:</b> ' + esc(t.sources.join(', ')) + ' (named sources; this guide links nowhere — it works offline).</p>'
        + '</div>';
    } else if (openDetail === t.id && hidden) {
      detail = '';
    }
    var meta = hidden ? '' : '<p class="meta">' + esc(stars(t.difficulty)) + ' · ' + esc(t.time) + '</p>';
    return '<article class="card' + (isEarned ? ' earned' : '') + '" data-id="' + t.id + '">'
      + '<div class="card-head"><input type="checkbox" data-earn="' + t.id + '"' + (isEarned ? ' checked' : '') + ' aria-label="Mark ' + esc(t.name) + ' earned">'
      + '<div><div>' + head + '</div>'
      + '<div class="chips">' + chips + '</div>' + meta + detail + '</div></div></article>';
  }

  function renderCards() {
    var list = visibleTrophies();
    $('cards').innerHTML = list.map(cardHtml).join('');
    $('showing').textContent = 'Showing ' + list.length + ' of ' + trophies.length;
    $('emptyState').hidden = list.length !== 0;
  }

  function renderRoadmap() {
    if (!roadmap) return;
    $('roadmapTitle').textContent = roadmap.title;
    $('roadmapMeta').textContent = 'Story: ' + roadmap.story_hours + ' · Total: ' + roadmap.total_hours + ' · ' + roadmap.missable_warning;
    $('route').innerHTML = roadmap.steps.map(function (s) {
      return '<li><span class="phase-tag">Phase ' + s.phase + '</span><h4>Step ' + s.n + ' — ' + esc(s.title) + '</h4><p>' + esc(s.detail) + '</p></li>';
    }).join('');
    $('phases').innerHTML = roadmap.phases.map(function (p) {
      return '<div class="phase"><h4>Phase ' + p.n + ' — ' + esc(p.name) + '</h4>'
        + '<p>' + esc(p.chapters) + ' · ' + esc(p.hours) + '</p><p>' + esc(p.goal) + '</p>'
        + '<p class="trophy-names">' + esc(p.trophies.join(' · ')) + '</p></div>';
    }).join('');
  }

  function renderChecklist() {
    if (!roadmap) return;
    $('checklist').innerHTML = roadmap.checklist_100.map(function (item, i) {
      var done = checked.has(String(i));
      return '<li><input type="checkbox" data-check="' + i + '"' + (done ? ' checked' : '') + ' aria-label="' + esc(item.item) + '">'
        + '<span><strong>' + esc(item.item) + '</strong><br><span class="by">' + esc(item.done_by) + '</span></span>'
        + '<span class="need">' + esc(item.need) + '</span></li>';
    }).join('');
    $('checklistTotal').textContent = checked.size + ' / ' + roadmap.checklist_100.length + ' checklist items done.';
  }

  function renderAll() {
    renderProgress();
    renderCards();
    renderRoadmap();
    renderChecklist();
  }

  function setView(name) {
    document.querySelectorAll('.tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === name);
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('active', v.id === 'view-' + name);
    });
  }

  function toggleEarned(id, on) {
    if (on) earned.add(id); else earned.delete(id);
    if (!demoEarned) saveSet(TROPHY_KEY, earned);
    renderProgress();
    renderCards();
  }

  function exportProgress() {
    var data = { earned: Array.from(earned), checklist: Array.from(checked), exportedAt: new Date().toISOString() };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gta6-trophy-progress.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    $('toolsNote').textContent = 'Exported ' + earned.size + ' earned trophies and ' + checked.size + ' checklist items.';
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (Array.isArray(data.earned)) { earned = new Set(data.earned); saveSet(TROPHY_KEY, earned); }
        if (Array.isArray(data.checklist)) { checked = new Set(data.checklist); saveSet(CHECK_KEY, checked); }
        renderAll();
        $('toolsNote').textContent = 'Imported ' + earned.size + ' earned trophies and ' + checked.size + ' checklist items.';
      } catch (e) {
        $('toolsNote').textContent = 'That file could not be read as a progress backup.';
      }
    };
    reader.readAsText(file);
  }

  function init() {
    var params = new URLSearchParams(location.search);
    earned = loadSet(TROPHY_KEY);
    checked = loadSet(CHECK_KEY);

    // Screenshot preview only: ?earned=N marks the first N trophies in memory, never saved.
    var demo = parseInt(params.get('earned') || '0', 10);
    if (demo > 0) {
      demoEarned = demo;
      earned = new Set(trophies.slice(0, demo).map(function (t) { return t.id; }));
    }
    if (params.get('spoiler') === '1') $('spoilerMode').checked = true;
    if (params.get('detail')) openDetail = params.get('detail');
    var view = params.get('view');
    if (view === 'roadmap' || view === 'checklist') setView(view);

    document.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.view); });
    });
    ['search', 'kindFilter', 'gradeFilter', 'hideEarned', 'spoilerMode'].forEach(function (id) {
      $(id).addEventListener('input', renderCards);
      $(id).addEventListener('change', renderCards);
    });
    $('cards').addEventListener('click', function (ev) {
      var box = ev.target.closest('[data-earn]');
      if (box) { toggleEarned(box.dataset.earn, box.checked); return; }
      var card = ev.target.closest('.card');
      if (card) {
        openDetail = openDetail === card.dataset.id ? null : card.dataset.id;
        renderCards();
        if (openDetail) {
          var el = document.querySelector('.card[data-id="' + openDetail + '"]');
          if (el) el.scrollIntoView({ block: 'nearest' });
        }
      }
    });
    $('checklist').addEventListener('change', function (ev) {
      var box = ev.target.closest('[data-check]');
      if (!box) return;
      if (box.checked) checked.add(box.dataset.check); else checked.delete(box.dataset.check);
      saveSet(CHECK_KEY, checked);
      renderChecklist();
    });
    $('exportBtn').addEventListener('click', exportProgress);
    $('importFile').addEventListener('change', function () {
      if (this.files && this.files[0]) importProgress(this.files[0]);
      this.value = '';
    });
    $('resetBtn').addEventListener('click', function () {
      earned = new Set(); checked = new Set();
      saveSet(TROPHY_KEY, earned); saveSet(CHECK_KEY, checked);
      renderAll();
      $('toolsNote').textContent = 'Progress reset.';
    });

    renderAll();
    if (openDetail) {
      var el = document.querySelector('.card[data-id="' + openDetail + '"]');
      if (el) el.scrollIntoView({ block: 'start' });
    }
  }

  Promise.all([
    fetch('data/trophies.json').then(function (r) { return r.json(); }),
    fetch('data/roadmap.json').then(function (r) { return r.json(); })
  ]).then(function (results) {
    trophies = results[0].trophies;
    roadmap = results[1];
    init();
  }).catch(function (err) {
    document.getElementById('cards').innerHTML = '<p class="empty">Could not load the trophy data. Open this guide from its own folder so its data files load.</p>';
    if (window.console) console.error(err);
  });
})();
