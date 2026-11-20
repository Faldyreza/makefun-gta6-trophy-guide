/* GTA VI Trophy Guide & Tracker — checklist, filters, spoiler mode, roadmap, export/import.
   Loads only its own files: data/trophies.json and data/roadmap.json. No network at runtime. */
(function () {
  "use strict";

  var STORE_KEY = "gta6-trophy-guide-v3";
  var HUNDRED_KEY = "gta6-trophy-guide-v3-hundred";
  var SEED_EARNED = [2, 3, 4, 5, 8, 16, 20, 21, 28, 31, 35, 42, 46, 53];

  var trophies = [];
  var roadmap = null;
  var earned = new Set();
  var hundredDone = new Set();
  var spoiler = false;
  var hideEarned = false;
  var kindFilter = "all";
  var gradeFilter = "all";
  var searchText = "";
  var currentTab = "checklist";
  var detailId = null;
  var scrollY = 0;

  var cardsEl, showingEl, emptyEl, progressFill, progressLine, factsLine;
  var searchBox, gradeSelect, kindRow, spoilerBtn, hideEarnedBox;

  function $(id) { return document.getElementById(id); }

  function loadStored() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) JSON.parse(raw).forEach(function (id) { earned.add(id); });
      var rawH = localStorage.getItem(HUNDRED_KEY);
      if (rawH) JSON.parse(rawH).forEach(function (i) { hundredDone.add(i); });
    } catch (e) { /* storage unavailable: tracker still works in memory */ }
  }

  function saveStored() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(earned)));
      localStorage.setItem(HUNDRED_KEY, JSON.stringify(Array.from(hundredDone)));
    } catch (e) { /* ignore */ }
  }

  function applyQueryParams() {
    var params = new URLSearchParams(window.location.search);
    var seed = parseInt(params.get("seed") || "", 10);
    if (!isNaN(seed) && seed > 0) {
      earned = new Set(SEED_EARNED.slice(0, seed));
    }
    if (params.get("spoiler") === "1") spoiler = true;
    var sc = parseInt(params.get("scroll") || "", 10);
    if (!isNaN(sc) && sc > 0) scrollY = sc;
  }

  function trophyById(id) {
    for (var i = 0; i < trophies.length; i++) if (trophies[i].id === id) return trophies[i];
    return null;
  }

  function kindLabel(kind) {
    var labels = { story: "Story", missable: "Missable", collectibles: "Collectibles",
      activities: "Activities", side: "Side & misc", online: "Online", platinum: "Platinum" };
    return labels[kind] || kind;
  }

  function gradeLabel(grade) {
    return grade.charAt(0).toUpperCase() + grade.slice(1);
  }

  function difficultyStars(t) {
    if (t.difficulty == null) return "Difficulty: not rated";
    var filled = "";
    for (var i = 0; i < 5; i++) filled += i < t.difficulty ? "★" : "☆";
    return "Difficulty " + filled + " (" + t.difficulty + "/5)";
  }

  function isStoryHidden(t) {
    return spoiler && t.kind === "story" && !earned.has(t.id);
  }

  function matchesFilters(t) {
    if (kindFilter === "online") return false;
    if (kindFilter === "missable") { if (!t.missable) return false; }
    else if (kindFilter !== "all" && t.kind !== kindFilter) return false;
    if (gradeFilter !== "all" && t.grade !== gradeFilter) return false;
    if (hideEarned && earned.has(t.id)) return false;
    if (searchText) {
      var hay = (t.name + " " + t.description + " " + t.guide + " " +
        t.sources.map(function (s) { return s.name; }).join(" ")).toLowerCase();
      if (hay.indexOf(searchText) === -1) return false;
    }
    return true;
  }

  function excerpt(text, max) {
    if (text.length <= max) return text;
    return text.slice(0, text.lastIndexOf(" ", max)) + "…";
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function chipHtml(text, cls) {
    return '<span class="chip ' + cls + '">' + escapeHtml(text) + "</span>";
  }

  function cardHtml(t) {
    var isEarned = earned.has(t.id);
    var cls = "card" + (isEarned ? " is-earned" : "") + (t.missable ? " is-missable" : "");
    if (isStoryHidden(t)) {
      return '<article class="' + cls + ' spoiler-card">' +
        '<div class="card-top"><input type="checkbox" class="card-check" data-id="' + t.id + '"' +
        (isEarned ? " checked" : "") + ' aria-label="Mark trophy earned">' +
        '<h3 class="card-name">Hidden story trophy</h3></div>' +
        "<p>Earn this trophy to reveal its name and description. Spoiler mode is on.</p>" +
        "</article>";
    }
    var chips = chipHtml(gradeLabel(t.grade), t.grade) + chipHtml(kindLabel(t.kind), "") +
      chipHtml("Phase " + t.phase, "");
    if (t.chapter) chips += chipHtml(t.chapter, "");
    if (t.hidden) chips += chipHtml("Hidden", "");
    if (t.missable) chips += chipHtml("Missable", "missable");
    if (t.status === "unknown") chips += chipHtml("Method unknown", "status-unknown");
    else if (t.status === "lead") chips += chipHtml("Method unconfirmed", "status-lead");
    var firstSource = t.sources[0];
    var more = t.sources.length > 1 ? " + " + (t.sources.length - 1) + " more" : "";
    return '<article class="' + cls + '">' +
      '<div class="card-top"><input type="checkbox" class="card-check" data-id="' + t.id + '"' +
      (isEarned ? " checked" : "") + ' aria-label="Mark ' + escapeHtml(t.name) + ' earned">' +
      '<h3 class="card-name">' + escapeHtml(t.name) + "</h3></div>" +
      '<p class="card-desc">' + escapeHtml(t.description) + "</p>" +
      '<div class="chips">' + chips + "</div>" +
      '<p class="meta-line"><b>' + difficultyStars(t) + "</b> &middot; Time " + escapeHtml(t.time) +
      " &middot; Rarity " + escapeHtml(t.rarity) + "</p>" +
      '<p class="guide-excerpt"><b>Guide:</b> ' + escapeHtml(excerpt(t.guide, 170)) + "</p>" +
      '<p class="source-line">Source: <a href="' + firstSource.url + '" target="_blank" rel="noopener">' +
      escapeHtml(firstSource.name) + "</a>" + more + "</p>" +
      '<a class="card-btn" href="#trophy/' + t.id + '">Full guide &amp; sources &rarr;</a>' +
      "</article>";
  }

  function renderCards() {
    var shown = 0;
    var html = "";
    trophies.forEach(function (t) {
      if (matchesFilters(t)) { shown++; html += cardHtml(t); }
    });
    cardsEl.innerHTML = html;
    showingEl.textContent = "Showing " + shown + " of 55 trophies";
    if (kindFilter === "online") {
      emptyEl.hidden = false;
      emptyEl.textContent = "No online trophies: all 55 trophies are single-player. Nothing to track here.";
    } else {
      emptyEl.hidden = shown !== 0;
      emptyEl.textContent = "No trophies match this filter. Try another kind, grade or search.";
    }
  }

  function renderProgress() {
    var counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    earned.forEach(function (id) {
      var t = trophyById(id);
      if (t) counts[t.grade]++;
    });
    var n = earned.size;
    var pct = Math.round(n / 55 * 100);
    progressFill.style.width = pct + "%";
    progressLine.textContent = n + " / 55 earned · " + pct + "%";
    factsLine.textContent = "Platinum " + counts.platinum + "/1 · Gold " + counts.gold + "/2 · Silver " +
      counts.silver + "/6 · Bronze " + counts.bronze + "/46 · 0 online · 1 possibly missable";
  }

  function renderRoadmap() {
    if (!roadmap) return;
    $("roadmapIntro").textContent = roadmap.roadmap_note;
    var f = roadmap.facts;
    $("factsGrid").innerHTML =
      factHtml("Difficulty", f.difficulty) +
      factHtml("Time to platinum", f.time_platinum) +
      factHtml("Playthroughs", String(f.playthroughs) + " — no mission replay, no New Game+") +
      factHtml("Missable trophies", String(f.missable_count) + " — Positive Mental Attitude only");
    var savesLine = document.createElement("p");
    savesLine.className = "roadmap-intro";
    savesLine.textContent = "Saves: " + f.saves + " Cheats: " + f.cheats + " Online trophies: " + f.online_trophies + ".";
    $("factsGrid").after(savesLine);
    $("routeList").innerHTML = roadmap.platinum_route.map(function (r) {
      return "<li><b>Step " + r.step + ".</b> " + escapeHtml(r.text) + "</li>";
    }).join("");
    $("phases").innerHTML = roadmap.phases.map(function (p) {
      return '<div class="phase"><div class="phase-head"><h3>' + escapeHtml(p.title) +
        '</h3><span class="phase-hours">' + escapeHtml(p.hours) + "</span></div>" +
        '<p class="phase-trophies">' + escapeHtml(p.trophies) + "</p><ol>" +
        p.steps.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("") +
        "</ol></div>";
    }).join("");
  }

  function factHtml(label, value) {
    return '<div class="fact"><b>' + escapeHtml(label) + "</b><span>" + escapeHtml(value) + "</span></div>";
  }

  function renderHundred() {
    if (!roadmap) return;
    $("hundredBody").innerHTML = roadmap.checklist_100.map(function (row, i) {
      return "<tr><td>" + escapeHtml(row.item) + "</td><td>" + escapeHtml(row.need) +
        '</td><td><label><input type="checkbox" class="hundred-check" data-i="' + i + '"' +
        (hundredDone.has(i) ? " checked" : "") + "> " + escapeHtml(row.done_by) + "</label></td></tr>";
    }).join("");
  }

  function renderDetail(id) {
    var t = trophyById(id);
    var detail = $("detail");
    if (!t) { detail.innerHTML = "<p>Trophy not found.</p>"; return; }
    if (isStoryHidden(t)) {
      detail.innerHTML = "<p class=\"eyebrow\">" + gradeLabel(t.grade) + " · Hidden</p>" +
        "<h2>Hidden story trophy</h2>" +
        "<p>Spoiler mode is on. Earn this trophy in the game to reveal its name, description and guide here.</p>";
      return;
    }
    var chips = chipHtml(gradeLabel(t.grade), t.grade) + chipHtml(kindLabel(t.kind), "") +
      chipHtml("Phase " + t.phase, "");
    if (t.chapter) chips += chipHtml(t.chapter, "");
    if (t.hidden) chips += chipHtml("Hidden", "");
    if (t.missable) chips += chipHtml("Missable", "missable");
    if (t.status === "unknown") chips += chipHtml("Method unknown", "status-unknown");
    else if (t.status === "lead") chips += chipHtml("Method unconfirmed", "status-lead");
    var video = t.video
      ? '<a class="video-link" href="' + t.video.url + '" target="_blank" rel="noopener">&#9654; ' +
        escapeHtml(t.video.label) + "</a>"
      : "";
    var note = t.status === "unknown"
      ? '<p class="unknown-note"><b>Honest unknown.</b> No published guide has confirmed this method yet. This guide says so instead of guessing.</p>'
      : (t.status === "lead"
        ? '<p class="unknown-note"><b>Unconfirmed lead.</b> The method below is the best current lead, not a confirmed unlock. Treat it as try-it-and-see.</p>'
        : "");
    detail.innerHTML =
      '<p class="eyebrow">' + gradeLabel(t.grade) + (t.hidden ? " · Hidden" : "") + "</p>" +
      "<h2>" + escapeHtml(t.name) + "</h2>" +
      '<p class="card-desc">' + escapeHtml(t.description) + "</p>" +
      '<div class="chips">' + chips + "</div>" +
      '<p class="meta-line"><b>' + difficultyStars(t) + "</b> &middot; Time " + escapeHtml(t.time) +
      " &middot; Rarity " + escapeHtml(t.rarity) + " of tracked players (Exophase)</p>" +
      "<h3>How to unlock it</h3><p>" + escapeHtml(t.guide) + "</p>" + note +
      video +
      "<h3>Sources</h3><ul class=\"source-list\">" +
      t.sources.map(function (s) {
        return '<li><a href="' + s.url + '" target="_blank" rel="noopener">' + escapeHtml(s.name) + "</a></li>";
      }).join("") + "</ul>" +
      '<p class="source-line">Links open only when you follow them. The app itself fetches nothing.</p>' +
      "<h3>Steps</h3><ol class=\"steps\">" +
      t.steps.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("") + "</ol>";
  }

  function showView(name) {
    ["checklist", "roadmap", "hundred", "detail"].forEach(function (v) {
      $("view-" + v).classList.toggle("is-visible", v === name);
    });
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-tab") === name);
    });
    currentTab = name;
  }

  function routeFromHash() {
    var hash = window.location.hash || "#checklist";
    var m = hash.match(/^#trophy\/(\d+)$/);
    document.body.classList.toggle("detail-open", !!m);
    if (m) { detailId = parseInt(m[1], 10); renderDetail(detailId); showView("detail"); return; }
    var tab = hash.replace("#", "");
    if (["checklist", "roadmap", "hundred"].indexOf(tab) === -1) tab = "checklist";
    detailId = null;
    showView(tab);
  }

  function updateSpoilerBtn() {
    spoilerBtn.textContent = "Spoiler mode: " + (spoiler ? "on" : "off");
    spoilerBtn.setAttribute("aria-pressed", spoiler ? "true" : "false");
  }

  function exportProgress() {
    var data = { game: "Grand Theft Auto VI", earned: Array.from(earned).sort(function (a, b) { return a - b; }),
      hundred: Array.from(hundredDone).sort(function (a, b) { return a - b; }),
      exported_at: new Date().toISOString() };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gta6-trophy-progress.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.earned)) throw new Error("bad file");
        earned = new Set(data.earned.filter(function (id) { return trophyById(id); }));
        if (Array.isArray(data.hundred)) {
          hundredDone = new Set(data.hundred.filter(function (i) { return i < 17; }));
        }
        saveStored();
        renderCards();
        renderProgress();
        renderHundred();
      } catch (e) {
        alert("That file is not a progress export from this guide.");
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    searchBox.addEventListener("input", function () {
      searchText = searchBox.value.trim().toLowerCase();
      renderCards();
    });
    gradeSelect.addEventListener("change", function () {
      gradeFilter = gradeSelect.value;
      renderCards();
    });
    kindRow.addEventListener("click", function (e) {
      var btn = e.target.closest(".kind-btn");
      if (!btn) return;
      kindFilter = btn.getAttribute("data-kind");
      kindRow.querySelectorAll(".kind-btn").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      renderCards();
    });
    spoilerBtn.addEventListener("click", function () {
      spoiler = !spoiler;
      updateSpoilerBtn();
      renderCards();
      if (detailId) renderDetail(detailId);
    });
    hideEarnedBox.addEventListener("change", function () {
      hideEarned = hideEarnedBox.checked;
      renderCards();
    });
    $("exportBtn").addEventListener("click", exportProgress);
    $("importBtn").addEventListener("click", function () { $("importFile").click(); });
    $("importFile").addEventListener("change", function () {
      if (this.files[0]) importProgress(this.files[0]);
      this.value = "";
    });
    $("resetBtn").addEventListener("click", function () {
      if (confirm("Clear all earned trophies and 100% checklist ticks?")) {
        earned = new Set();
        hundredDone = new Set();
        saveStored();
        renderCards();
        renderProgress();
        renderHundred();
      }
    });
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        window.location.hash = "#" + b.getAttribute("data-tab");
      });
    });
    $("backBtn").addEventListener("click", function () {
      window.location.hash = "#checklist";
    });
    cardsEl.addEventListener("change", function (e) {
      var box = e.target.closest(".card-check");
      if (!box) return;
      var id = parseInt(box.getAttribute("data-id"), 10);
      if (box.checked) earned.add(id); else earned.delete(id);
      saveStored();
      renderProgress();
      renderCards();
    });
    $("hundredBody").addEventListener("change", function (e) {
      var box = e.target.closest(".hundred-check");
      if (!box) return;
      var i = parseInt(box.getAttribute("data-i"), 10);
      if (box.checked) hundredDone.add(i); else hundredDone.delete(i);
      saveStored();
    });
    window.addEventListener("hashchange", routeFromHash);
  }

  function init() {
    cardsEl = $("cards");
    showingEl = $("showingLine");
    emptyEl = $("emptyState");
    progressFill = $("progressFill");
    progressLine = $("progressLine");
    factsLine = $("factsLine");
    searchBox = $("searchBox");
    gradeSelect = $("gradeSelect");
    kindRow = $("kindRow");
    spoilerBtn = $("spoilerBtn");
    hideEarnedBox = $("hideEarned");
    loadStored();
    applyQueryParams();
    updateSpoilerBtn();
    bindEvents();
    Promise.all([
      fetch("data/trophies.json").then(function (r) { return r.json(); }),
      fetch("data/roadmap.json").then(function (r) { return r.json(); })
    ]).then(function (results) {
      trophies = results[0].trophies;
      roadmap = results[1];
      renderCards();
      renderProgress();
      renderRoadmap();
      renderHundred();
      routeFromHash();
      if (scrollY > 0) window.scrollTo(0, scrollY);
    }).catch(function () {
      cardsEl.innerHTML = "<p>Could not load the trophy data. Open this guide from its own files with a static server.</p>";
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
