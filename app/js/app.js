// GTA VI trophy guide & tracker — single module, no dependencies, no network at run time
// except the relative fetches of this app's own data files.
const STORE_KEY = 'gta6-trophy-guide-v2';
const KINDS = [
  ['all', 'All'],
  ['story', 'Story'],
  ['missable', 'Missable'],
  ['collectibles', 'Collectibles'],
  ['activities', 'Activities'],
  ['side', 'Side & misc'],
  ['online', 'Online'],
];

const params = new URLSearchParams(location.search);
const state = {
  trophies: [],
  roadmap: null,
  earned: new Set(),
  spoiler: params.get('spoiler') === 'on',
  hideEarned: false,
  kind: params.get('kind') || 'all',
  grade: 'all',
  query: '',
  view: params.get('view') || 'checklist',
  detailId: params.get('id') || null,
};

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.earned)) state.earned = new Set(saved.earned);
    if (typeof saved.spoiler === 'boolean') state.spoiler = saved.spoiler;
  } catch (err) { /* a corrupt save starts empty */ }
}

function saveProgress() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      earned: [...state.earned].sort(),
      spoiler: state.spoiler,
      savedAt: new Date().toISOString(),
    }));
  } catch (err) { /* storage full or blocked: progress still works in memory */ }
}

function seedFromUrl() {
  const seed = params.get('seed');
  if (!seed) return;
  // ?seed=14 earns the first 14 trophies in list order; ?seed=id1,id2
  // earns exactly those ids. Seeding only ever marks demo progress for
  // screenshots; a real visitor's saved checklist is untouched unless
  // they open a seeded link themselves.
  const valid = new Set(state.trophies.map((t) => t.id));
  if (/^\d+$/.test(seed)) {
    state.trophies.slice(0, Math.min(Number(seed), state.trophies.length))
      .forEach((trophy) => state.earned.add(trophy.id));
  } else {
    seed.split(',').map((s) => s.trim()).filter((id) => valid.has(id))
      .forEach((id) => state.earned.add(id));
  }
  saveProgress();
}

function trophyById(id) {
  return state.trophies.find((trophy) => trophy.id === id) || null;
}

function isHiddenFromSpoilers(trophy) {
  return state.spoiler && trophy.kind === 'story' && !state.earned.has(trophy.id);
}

function displayName(trophy) {
  return isHiddenFromSpoilers(trophy) ? 'Hidden story trophy' : trophy.name;
}

function displayDescription(trophy) {
  return isHiddenFromSpoilers(trophy)
    ? 'Spoiler hidden — earn this trophy to reveal it.'
    : trophy.description;
}

function firstSentence(text) {
  const cut = text.search(/[.!?]\s/);
  return cut === -1 ? text : text.slice(0, cut + 1);
}

function matchesKind(trophy) {
  if (state.kind === 'all') return true;
  if (state.kind === 'missable') return trophy.missable;
  if (state.kind === 'online') return false;
  return trophy.kind === state.kind;
}

function visibleTrophies() {
  const query = state.query.trim().toLowerCase();
  return state.trophies.filter((trophy) => {
    if (!matchesKind(trophy)) return false;
    if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
    if (state.hideEarned && state.earned.has(trophy.id)) return false;
    if (!query) return true;
    const haystack = [trophy.name, trophy.description, trophy.guide,
      trophy.steps.join(' '), trophy.sources.map((s) => s.name).join(' ')]
      .join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function renderProgress() {
  const earned = state.earned.size;
  const total = state.trophies.length;
  const pct = total ? Math.round((earned / total) * 100) : 0;
  document.getElementById('progress').innerHTML =
    '<span style="width:' + pct + '%"></span>';
  const counts = {};
  state.trophies.forEach((trophy) => {
    counts[trophy.grade] = (counts[trophy.grade] || 0) + 1;
  });
  const earnedByGrade = {};
  state.trophies.forEach((trophy) => {
    if (state.earned.has(trophy.id)) {
      earnedByGrade[trophy.grade] = (earnedByGrade[trophy.grade] || 0) + 1;
    }
  });
  document.getElementById('counts').innerHTML =
    esc(earned + ' / ' + total + ' earned · ' + pct + '%') +
    ' <span>Platinum ' + (earnedByGrade.platinum || 0) + '/1 · Gold ' +
    (earnedByGrade.gold || 0) + '/2 · Silver ' + (earnedByGrade.silver || 0) +
    '/6 · Bronze ' + (earnedByGrade.bronze || 0) + '/46 · 0 online · 1 possibly missable</span>';
}

function gradeChip(trophy) {
  return '<span class="chip grade-' + trophy.grade + '">' +
    esc(trophy.grade[0].toUpperCase() + trophy.grade.slice(1)) + '</span>';
}

function kindLabel(trophy) {
  if (trophy.kind === 'side') return 'Side & misc';
  return trophy.kind[0].toUpperCase() + trophy.kind.slice(1);
}

function renderChecklist() {
  const list = visibleTrophies();
  const box = document.getElementById('cards');
  document.getElementById('showing').textContent =
    'Showing ' + list.length + ' of ' + state.trophies.length + ' trophies';
  document.getElementById('empty').hidden = list.length > 0;
  box.innerHTML = list.map((trophy) => {
    const earned = state.earned.has(trophy.id);
    const hidden = isHiddenFromSpoilers(trophy);
    const firstSource = trophy.sources[0];
    const chips = gradeChip(trophy) +
      '<span class="chip">' + esc(kindLabel(trophy)) + '</span>' +
      (trophy.phase ? '<span class="chip">Phase ' + trophy.phase + '</span>' : '') +
      (trophy.chapter ? '<span class="chip">Chapter ' + trophy.chapter + '</span>' : '') +
      (trophy.missable ? '<span class="chip missable">⚠ Missable</span>' : '') +
      (trophy.hidden ? '<span class="chip">Hidden</span>' : '');
    return '<article class="card' + (earned ? ' earned' : '') + '">' +
      '<div class="card-top"><input type="checkbox" data-id="' + esc(trophy.id) + '"' +
      (earned ? ' checked' : '') + ' aria-label="Mark ' + esc(displayName(trophy)) + ' earned">' +
      '<span class="card-name">' + esc(displayName(trophy)) + '</span></div>' +
      '<p class="card-desc' + (hidden ? ' hidden-story' : '') + '">' +
      esc(displayDescription(trophy)) + '</p>' +
      '<div class="chips">' + chips + '</div>' +
      (hidden ? '' :
        '<p class="excerpt"><strong>Guide:</strong> ' + esc(firstSentence(trophy.guide)) + '</p>' +
        '<p class="source-line">Source: <a href="' + esc(firstSource.url) +
        '" target="_blank" rel="noopener">' + esc(firstSource.name) + '</a>' +
        (trophy.sources.length > 1 ? ' + ' + (trophy.sources.length - 1) + ' more' : '') + '</p>') +
      '<button type="button" class="full-guide" data-detail="' + esc(trophy.id) + '">Full guide &amp; sources →</button>' +
      '</article>';
  }).join('');
}

function renderKindPills() {
  document.getElementById('kind-pills').innerHTML = KINDS.map(([value, label]) =>
    '<button type="button" class="pill' + (state.kind === value ? ' active' : '') +
    '" data-kind="' + value + '">' + esc(label) + '</button>').join('');
}

function renderRoadmap() {
  const data = state.roadmap;
  if (!data) return;
  document.getElementById('roadmap-title').textContent = data.title;
  document.getElementById('roadmap-total').textContent =
    'Total: ' + data.totalHours + ' Difficulty: ' + data.difficulty;
  document.getElementById('roadmap-warnings').innerHTML =
    '<h3>Before you start — read this</h3><ul>' +
    data.warnings.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul>';  document.getElementById('roadmap-phases').innerHTML = data.phases.map((phase) => {
    const chips = phase.trophies.map((name) => {
      const trophy = state.trophies.find((t) => t.name === name);
      if (!trophy) return '<span>' + esc(name) + '</span>';
      return '<a href="?view=detail&amp;id=' + esc(trophy.id) + '"' +
        (trophy.missable ? ' class="missable"' : '') + '>' + esc(name) +
        (trophy.missable ? ' ⚠ missable' : '') + '</a>';
    }).join('');
    const sources = phase.sources.map((s) =>
      '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>').join(' · ');
    return '<section class="phase"><h3>Phase ' + phase.n + ' — ' + esc(phase.name) + '</h3>' +
      '<p class="hours">' + esc(phase.hours) + ' (' + esc(phase.hoursSource) + ')</p>' +
      '<p>' + esc(phase.text) + '</p>' +
      '<div class="trophy-names">' + chips + '</div>' +
      '<p class="phase-sources">Sources: ' + sources + '</p></section>';
  }).join('');
}

function renderHundred() {
  const data = state.roadmap;
  if (!data) return;
  document.querySelector('#hundred-table tbody').innerHTML =
    data.checklist100.map((row) =>
      '<tr><td>' + esc(row.line) + '</td><td><strong>' + esc(row.need) +
      '</strong></td><td>' + esc(row.source) + '</td></tr>').join('');
}

function renderDetail() {
  const trophy = trophyById(state.detailId) || state.trophies[0];
  if (!trophy) return;
  state.detailId = trophy.id;
  const earned = state.earned.has(trophy.id);
  const hidden = isHiddenFromSpoilers(trophy);
  const index = state.trophies.indexOf(trophy);
  const prev = state.trophies[(index - 1 + state.trophies.length) % state.trophies.length];
  const next = state.trophies[(index + 1) % state.trophies.length];
  document.getElementById('detail').innerHTML =
    '<p class="grade-line">' + esc(trophy.grade) + (trophy.hidden ? ' · Hidden' : '') + '</p>' +
    '<h2>' + esc(displayName(trophy)) + '</h2>' +
    '<p class="official">' + esc(displayDescription(trophy)) + '</p>' +
    '<div class="chips">' + gradeChip(trophy) +
    '<span class="chip">' + esc(kindLabel(trophy)) + '</span>' +
    (trophy.phase ? '<span class="chip">Phase ' + trophy.phase + '</span>' : '') +
    (trophy.chapter ? '<span class="chip">Chapter ' + trophy.chapter + '</span>' : '') +
    (trophy.missable ? '<span class="chip missable">⚠ Missable</span>' : '') + '</div>' +
    (trophy.missable
      ? '<p class="missable-banner">⚠ Possibly missable — see the warning in the Roadmap tab before this chapter ends.</p>' : '') +
    (hidden ? '<p class="guide-text">Spoiler mode is on. Earn this trophy to reveal its guide.</p>' :
      '<h3>How to unlock it</h3><p class="guide-text">' + esc(trophy.guide) + '</p>' +
      '<h3>Steps</h3><ol class="steps">' +
      trophy.steps.map((step) => '<li>' + esc(step) + '</li>').join('') + '</ol>' +
      '<h3>Sources</h3><ul class="sources">' +
      trophy.sources.map((s) => '<li><a href="' + esc(s.url) +
        '" target="_blank" rel="noopener">' + esc(s.name) + '</a></li>').join('') +
      '</ul><p class="roadmap-note">The guide above is written in this guide\u2019s own words. The sources are cited, never copied.</p>') +
    '<p class="earned-toggle"><button type="button" id="detail-toggle">' +
    (earned ? '✓ Earned — click to unmark' : 'Mark as earned') + '</button></p>';
  document.getElementById('detail-nav').innerHTML =
    '<button type="button" data-detail="' + esc(prev.id) + '">← ' + esc(displayName(prev)) + '</button>' +
    '<button type="button" data-detail="' + esc(next.id) + '">' + esc(displayName(next)) + ' →</button>';
  document.getElementById('detail-toggle').addEventListener('click', () => {
    toggleEarned(trophy.id);
    renderDetail();
  });
}

function showView(view) {
  state.view = view;
  // A trophy detail is a focused reading view: the toolbar hides so the
  // guide, steps and sources fit on one screen.
  document.body.classList.toggle('detail-open', view === 'detail');
  document.querySelectorAll('.tab').forEach((tab) =>
    tab.classList.toggle('active', tab.dataset.view === view));
  document.getElementById('view-checklist').hidden = view !== 'checklist';
  document.getElementById('view-roadmap').hidden = view !== 'roadmap';
  document.getElementById('view-hundred').hidden = view !== 'hundred';
  document.getElementById('view-detail').hidden = view !== 'detail';
  if (view === 'roadmap') renderRoadmap();
  if (view === 'hundred') renderHundred();
  if (view === 'detail') renderDetail();
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  saveProgress();
  renderProgress();
  renderChecklist();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({
    guide: 'GTA VI Trophy Guide & Tracker',
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort(),
    spoiler: state.spoiler,
  }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const earned = Array.isArray(data.earned) ? data.earned : data;
      const valid = new Set(state.trophies.map((t) => t.id));
      state.earned = new Set(earned.filter((id) => valid.has(id)));
      if (typeof data.spoiler === 'boolean') state.spoiler = data.spoiler;
      saveProgress();
      syncControls();
      renderProgress();
      renderChecklist();
    } catch (err) {
      alert('That file is not a progress export from this guide.');
    }
  };
  reader.readAsText(file);
}

function syncControls() {
  document.getElementById('spoiler-toggle').textContent =
    'Spoiler mode: ' + (state.spoiler ? 'on' : 'off');
  document.getElementById('spoiler-toggle').setAttribute('aria-pressed', String(state.spoiler));
  document.getElementById('hide-earned').checked = state.hideEarned;
  document.getElementById('grade').value = state.grade;
  renderKindPills();
}

function bindControls() {
  document.getElementById('search').addEventListener('input', (event) => {
    state.query = event.target.value;
    renderChecklist();
  });
  document.getElementById('grade').addEventListener('change', (event) => {
    state.grade = event.target.value;
    renderChecklist();
  });
  document.getElementById('hide-earned').addEventListener('change', (event) => {
    state.hideEarned = event.target.checked;
    renderChecklist();
  });
  document.getElementById('spoiler-toggle').addEventListener('click', () => {
    state.spoiler = !state.spoiler;
    saveProgress();
    syncControls();
    renderChecklist();
    if (state.view === 'detail') renderDetail();
  });
  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('import-btn').addEventListener('click', () =>
    document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', (event) => {
    if (event.target.files[0]) importProgress(event.target.files[0]);
    event.target.value = '';
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Clear all earned trophies?')) {
      state.earned.clear();
      saveProgress();
      renderProgress();
      renderChecklist();
    }
  });
  document.getElementById('kind-pills').addEventListener('click', (event) => {
    const button = event.target.closest('[data-kind]');
    if (!button) return;
    state.kind = button.dataset.kind;
    renderKindPills();
    renderChecklist();
  });
  document.querySelectorAll('.tab').forEach((tab) =>
    tab.addEventListener('click', () => showView(tab.dataset.view)));
  document.getElementById('back-btn').addEventListener('click', () => showView('checklist'));
  document.addEventListener('click', (event) => {
    const box = event.target.closest('input[type="checkbox"][data-id]');
    if (box) toggleEarned(box.dataset.id);
    const detailButton = event.target.closest('[data-detail]');
    if (detailButton) {
      state.detailId = detailButton.dataset.detail;
      showView('detail');
      window.scrollTo(0, 0);
    }
  });
}

async function boot() {
  const [trophyRes, roadmapRes] = await Promise.all([
    fetch('data/trophies.json'),
    fetch('data/roadmap.json'),
  ]);
  const trophyData = await trophyRes.json();
  state.trophies = trophyData.trophies;
  state.roadmap = await roadmapRes.json();
  loadSaved();
  seedFromUrl();
  bindControls();
  syncControls();
  renderProgress();
  renderChecklist();
  showView(state.view);
  // Deep link for screenshots and sharing: ?scroll=200 scrolls that many
  // pixels, ?scroll=%23some-id scrolls that element into view.
  const scrollTarget = params.get('scroll');
  if (scrollTarget) {
    if (/^\d+$/.test(scrollTarget)) window.scrollTo(0, Number(scrollTarget));
    else document.querySelector(scrollTarget)?.scrollIntoView();
  }
}

boot();
