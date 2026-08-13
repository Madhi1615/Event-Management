/* ===========================================================
   ADMIN — password + token gate, then full CRUD on events.json
   and poster images, all via the GitHub Contents API.

   Nothing here is a substitute for real auth: the password is
   just a shared gate for co-organizers, and the real permission
   to write comes from each person's own GitHub token, which is
   kept only in sessionStorage (cleared when the tab closes) and
   never written to the repo.
   =========================================================== */

let TOKEN = sessionStorage.getItem("eb_token") || "";
let EVENTS = [];
let EVENTS_SHA = null;
let EDITING_ID = null;

const $ = sel => document.querySelector(sel);

// ---------- login gate ----------

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function handleLogin(e) {
  e.preventDefault();
  const pw = $("#login-password").value;
  const token = $("#login-token").value.trim();
  const hash = await sha256(pw);

  if (!CONFIG.ADMIN_PASSWORD_HASH) {
    showStatus("login-status", "No admin password is set yet in js/config.js — see the note below.", "err");
    return;
  }
  if (hash !== CONFIG.ADMIN_PASSWORD_HASH) {
    showStatus("login-status", "Wrong password.", "err");
    return;
  }
  if (!token) {
    showStatus("login-status", "Paste your GitHub token to continue.", "err");
    return;
  }

  TOKEN = token;
  sessionStorage.setItem("eb_token", token);
  enterAdmin();
}

function logout() {
  sessionStorage.removeItem("eb_token");
  TOKEN = "";
  location.reload();
}

async function enterAdmin() {
  $("#login-panel").classList.add("hidden");
  $("#admin-panel").classList.remove("hidden");
  await refreshEvents();
}

// ---------- data load ----------

async function refreshEvents() {
  showStatus("list-status", "Loading events…", "pending");
  try {
    const file = await GitHubAPI.getFile("data/events.json", TOKEN);
    if (file) {
      EVENTS = JSON.parse(file.content);
      EVENTS_SHA = file.sha;
    } else {
      EVENTS = [];
      EVENTS_SHA = null;
    }
    renderList();
    hideStatus("list-status");
  } catch (err) {
    showStatus("list-status", err.message, "err");
  }
}

function renderList() {
  const wrap = $("#event-list");
  if (!EVENTS.length) {
    wrap.innerHTML = `<p style="color:rgba(246,242,233,0.5); font-size:0.85rem;">No events yet — add the first one above.</p>`;
    return;
  }
  const sorted = [...EVENTS].sort((a, b) => a.date.localeCompare(b.date));
  wrap.innerHTML = sorted.map(ev => `
    <div class="event-row">
      ${ev.poster ? `<img src="../${ev.poster}" alt="">` : `<div style="width:46px;height:60px;background:var(--ink-deep);border-radius:4px;"></div>`}
      <div class="meta">
        <strong>${escapeAttr(ev.title)}</strong>
        <span>${ev.type} · ${ev.date}${ev.venue ? " · " + escapeAttr(ev.venue) : ""}</span>
      </div>
      <div class="actions">
        <button class="secondary" onclick="startEdit('${ev.id}')">Edit</button>
        <button class="danger" onclick="deleteEvent('${ev.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}

function escapeAttr(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------- image handling ----------

// Resize/compress in the browser before committing, so the repo stays small
function fileToCompressedBase64(file, maxWidth = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl.split(",")[1]); // strip "data:image/jpeg;base64,"
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- form ----------

function resetForm() {
  EDITING_ID = null;
  $("#event-form").reset();
  $("#form-title").textContent = "Add an event";
  $("#submit-btn").textContent = "Publish event";
  $("#cancel-edit").classList.add("hidden");
}

function startEdit(id) {
  const ev = EVENTS.find(e => e.id === id);
  if (!ev) return;
  EDITING_ID = id;
  $("#f-title").value = ev.title;
  $("#f-type").value = ev.type;
  $("#f-date").value = ev.date;
  $("#f-time").value = ev.time || "";
  $("#f-venue").value = ev.venue || "";
  $("#f-desc").value = ev.description || "";
  $("#form-title").textContent = `Editing “${ev.title}”`;
  $("#submit-btn").textContent = "Save changes";
  $("#cancel-edit").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleSubmit(e) {
  e.preventDefault();
  const submitBtn = $("#submit-btn");
  submitBtn.disabled = true;
  showStatus("form-status", "Saving…", "pending");

  try {
    const title = $("#f-title").value.trim();
    const type = $("#f-type").value;
    const date = $("#f-date").value;
    const time = $("#f-time").value.trim();
    const venue = $("#f-venue").value.trim();
    const description = $("#f-desc").value.trim();
    const file = $("#f-poster").files[0];

    if (!title || !type || !date) throw new Error("Title, type and date are required.");

    let posterPath = EDITING_ID ? (EVENTS.find(e => e.id === EDITING_ID)?.poster || "") : "";

    if (file) {
      showStatus("form-status", "Uploading poster…", "pending");
      const base64 = await fileToCompressedBase64(file);
      const safeExt = "jpg";
      const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "event";
      posterPath = `posters/${Date.now()}-${safeName}.${safeExt}`;
      await GitHubAPI.putBinaryFile(posterPath, base64, `Add poster for ${title}`, TOKEN);
    }

    if (EDITING_ID) {
      const idx = EVENTS.findIndex(e => e.id === EDITING_ID);
      EVENTS[idx] = { ...EVENTS[idx], title, type, date, time, venue, description, poster: posterPath };
    } else {
      EVENTS.push({
        id: `evt-${Date.now()}`,
        title, type, date, time, venue, description,
        poster: posterPath,
        createdAt: new Date().toISOString()
      });
    }

    showStatus("form-status", "Saving event list…", "pending");
    const result = await GitHubAPI.putTextFile(
      "data/events.json",
      JSON.stringify(EVENTS, null, 2),
      EDITING_ID ? `Update event: ${title}` : `Add event: ${title}`,
      EVENTS_SHA,
      TOKEN
    );
    EVENTS_SHA = result.content.sha;

    showStatus("form-status", "Published. It may take a minute to appear live.", "ok");
    resetForm();
    renderList();
  } catch (err) {
    showStatus("form-status", err.message, "err");
  } finally {
    submitBtn.disabled = false;
  }
}

async function deleteEvent(id) {
  const ev = EVENTS.find(e => e.id === id);
  if (!ev) return;
  if (!confirm(`Delete "${ev.title}"? This can't be undone.`)) return;

  showStatus("list-status", "Deleting…", "pending");
  try {
    if (ev.poster) {
      const posterFile = await GitHubAPI.getFile(ev.poster, TOKEN);
      if (posterFile) {
        await GitHubAPI.deleteFile(ev.poster, posterFile.sha, `Remove poster for ${ev.title}`, TOKEN);
      }
    }
    EVENTS = EVENTS.filter(e => e.id !== id);
    const result = await GitHubAPI.putTextFile(
      "data/events.json",
      JSON.stringify(EVENTS, null, 2),
      `Delete event: ${ev.title}`,
      EVENTS_SHA,
      TOKEN
    );
    EVENTS_SHA = result.content.sha;
    showStatus("list-status", "Deleted.", "ok");
    renderList();
  } catch (err) {
    showStatus("list-status", err.message, "err");
  }
}

// ---------- status helper ----------

function showStatus(id, msg, kind) {
  const el = $("#" + id);
  el.textContent = msg;
  el.className = `status-msg show ${kind}`;
}
function hideStatus(id) {
  $("#" + id).className = "status-msg";
}

document.addEventListener("DOMContentLoaded", () => {
  $("#login-form").addEventListener("submit", handleLogin);
  $("#event-form").addEventListener("submit", handleSubmit);
  $("#cancel-edit").addEventListener("click", resetForm);
  $("#logout-btn").addEventListener("click", logout);

  if (TOKEN) enterAdmin();
});
