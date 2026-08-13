# Department Event Board

A free event board for Tech / Cultural / Sports events, hosted entirely on
GitHub Pages. There's no separate server or database — the GitHub repo
itself stores the event list (`data/events.json`) and poster images
(`posters/`), and the site reads/writes them through the GitHub API.

- **Public page** (`index.html`) — anyone can view events, filter by
  category, see upcoming and past events sorted by date.
- **Admin page** (`admin.html`) — you and your co-organisers can add,
  edit, and delete events, including uploading a poster image.

---

## 1. Create the repository

1. On GitHub, create a new **public** repository (private repos work too
   but Pages needs the paid plan for those) — e.g. `event-board`.
2. Upload every file in this folder to that repository, keeping the same
   folder structure (`css/`, `js/`, `data/`, `posters/` at the top level).

## 2. Turn on GitHub Pages

1. In the repo, go to **Settings → Pages**.
2. Under "Build and deployment", set **Source** to "Deploy from a branch".
3. Set **Branch** to `main` and folder to `/ (root)`, then **Save**.
4. After a minute, your site is live at
   `https://<your-username>.github.io/<repo-name>/`.

## 3. Point the site at your repo

Open `js/config.js` and fill in:

```js
GITHUB_OWNER: "your-github-username",
GITHUB_REPO: "event-board",
GITHUB_BRANCH: "main",
```

## 4. Set the shared organiser password

The admin login asks for a shared password before it asks for a GitHub
token. To set it, generate a SHA-256 hash of your chosen password and
paste the hash (never the plain password) into `config.js`.

Easiest way — open your browser's console (F12) on any page and run,
replacing `yourPassword`:

```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourPassword'))
  .then(buf => console.log(Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,'0')).join('')))
```

Copy the printed string into `config.js`:

```js
ADMIN_PASSWORD_HASH: "paste-the-hash-here",
```

Commit the change. Share the plain password with your co-organisers
directly (chat, email) — never put it in the code.

## 5. Each organiser creates their own GitHub token

The shared password only gates the login screen. The thing that actually
lets someone save changes is a **GitHub personal access token**, scoped
to just this repository. Each organiser (including you) should make
their own:

1. Go to **github.com → Settings → Developer settings → Personal access
   tokens → Fine-grained tokens → Generate new token**.
2. Give it a name like "Event Board admin".
3. Under **Repository access**, choose "Only select repositories" and
   pick your `event-board` repo.
4. Under **Permissions → Repository permissions**, set **Contents** to
   **Read and write**.
5. Generate the token and copy it (you won't see it again — if you lose
   it, just generate a new one).
6. For an organisation-owned repo, an admin may need to approve the
   token before it works.

This token is only kept in the browser tab's session storage — it's
cleared when the tab is closed and is never written back to the repo.
Anyone with the token can edit the repo's contents, so treat it like a
password and don't share it outside your organiser group. If a token is
ever exposed, revoke it from the same GitHub settings page.

## 6. Add your first real event

Open `admin.html` on your live site, sign in, and add an event with a
poster. It should appear on the public board within a minute (GitHub
Pages caches briefly after each deploy).

---

## How it works

- `data/events.json` is a plain JSON array of events. The public page
  fetches it directly — no authentication needed to read.
- Adding/editing/deleting from `admin.html` uses the GitHub **Contents
  API** to commit an updated `events.json` (and poster image) straight
  to the repo, authenticated with the organiser's personal token.
- Poster images are resized to a max width of 1000px and compressed to
  JPEG in the browser before upload, so the repo doesn't bloat.
- Every add/edit/delete is a normal git commit — you get a full history
  of who changed what and when, visible in the repo's commit log.

## Limitations to know about

- This is fine for a small, trusted group of organisers — it is **not**
  a general-purpose multi-tenant admin system. Anyone with a valid token
  can edit anything.
- Two people saving at the exact same moment can conflict (the second
  save will fail with a sha mismatch) — just retry, it's rare for a
  small team.
- GitHub Pages typically updates within 30–60 seconds of a commit, so
  changes aren't instant for visitors.
