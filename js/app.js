/* ===========================================================
   APP — renders the public event board.
   Reads data/events.json directly (no auth needed to read).
   =========================================================== */

let ALL_EVENTS = [];
let ACTIVE_FILTER = "All";

async function loadEvents() {
  try {
    // Cache-bust so visitors always see the latest commit, not a stale
    // GitHub Pages / browser cache of events.json.
    const res = await fetch(`data/events.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("Could not load events.json");
    ALL_EVENTS = await res.json();
  } catch (e) {
    ALL_EVENTS = [];
    console.error(e);
  }
  render();
}

function setFilter(type) {
  ACTIVE_FILTER = type;
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.type === type);
  });
  render();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// deterministic small rotation per card so flyers don't look perfectly aligned
function rotationFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  return ((hash % 7) - 3) * 0.7; // -2.1deg .. +2.1deg
}

function flyerCard(ev, isPast) {
  const rot = rotationFor(ev.id);
  const posterHtml = ev.poster
    ? `<img class="poster" src="${ev.poster}" alt="${escapeHtml(ev.title)} poster" loading="lazy">`
    : `<div class="poster placeholder">${ev.type[0]}</div>`;

  return `
    <article class="flyer${isPast ? " past" : ""}" data-type="${ev.type}" style="transform: rotate(${rot}deg);">
      <div class="tape"></div>
      ${posterHtml}
      <div class="body">
        <span class="type-tag">${ev.type}</span>
        <h3>${escapeHtml(ev.title)}</h3>
        <p class="date-line">${formatDate(ev.date)}${ev.time ? " · " + escapeHtml(ev.time) : ""}</p>
        ${ev.venue ? `<p class="venue-line">${escapeHtml(ev.venue)}</p>` : ""}
        ${ev.description ? `<p class="desc">${escapeHtml(ev.description)}</p>` : ""}
      </div>
    </article>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function render() {
  const filtered = ACTIVE_FILTER === "All"
    ? ALL_EVENTS
    : ALL_EVENTS.filter(e => e.type === ACTIVE_FILTER);

  const today = todayStr();
  const upcoming = filtered.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = filtered.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const upcomingWrap = document.getElementById("upcoming-section");
  const pastWrap = document.getElementById("past-section");

  upcomingWrap.innerHTML = upcoming.length
    ? `<p class="section-label">Upcoming</p><div class="flyer-grid">${upcoming.map(e => flyerCard(e, false)).join("")}</div>`
    : `<p class="section-label">Upcoming</p><p class="empty-state">Nothing pinned up yet for this category.</p>`;

  pastWrap.innerHTML = past.length
    ? `<p class="section-label">Past</p><div class="flyer-grid">${past.map(e => flyerCard(e, true)).join("")}</div>`
    : "";
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => setFilter(chip.dataset.type));
  });
  loadEvents();
});
