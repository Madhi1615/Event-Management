/* ===========================================================
   GITHUB-API — reads and writes files in the repo using the
   GitHub Contents API. This is what makes the site work
   without any separate backend or database: the repo itself
   IS the database.
   =========================================================== */

const GitHubAPI = (() => {
  const base = "https://api.github.com";

  function authHeaders(token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function repoPath(path) {
    return `${base}/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${path}`;
  }

  // Base64 helpers that handle UTF-8 text correctly
  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function fromBase64(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  /**
   * Get a file's decoded text content + its sha (needed to update/delete it).
   * Returns null if the file doesn't exist yet.
   */
  async function getFile(path, token) {
    const res = await fetch(
      `${repoPath(path)}?ref=${CONFIG.GITHUB_BRANCH}&t=${Date.now()}`,
      { headers: token ? authHeaders(token) : {} }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw await apiError(res);
    const json = await res.json();
    return { content: fromBase64(json.content.replace(/\n/g, "")), sha: json.sha };
  }

  /**
   * Create or update a text file (e.g. data/events.json).
   * Pass the current sha when updating an existing file.
   */
  async function putTextFile(path, textContent, message, sha, token) {
    const res = await fetch(repoPath(path), {
      method: "PUT",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content: toBase64(textContent),
        branch: CONFIG.GITHUB_BRANCH,
        ...(sha ? { sha } : {})
      })
    });
    if (!res.ok) throw await apiError(res);
    return res.json();
  }

  /**
   * Upload a binary file (poster image) given its raw base64 (no data: prefix).
   */
  async function putBinaryFile(path, base64Content, message, token) {
    const res = await fetch(repoPath(path), {
      method: "PUT",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content: base64Content,
        branch: CONFIG.GITHUB_BRANCH
      })
    });
    if (!res.ok) throw await apiError(res);
    return res.json();
  }

  async function deleteFile(path, sha, message, token) {
    const res = await fetch(repoPath(path), {
      method: "DELETE",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ message, sha, branch: CONFIG.GITHUB_BRANCH })
    });
    if (!res.ok) throw await apiError(res);
    return res.json();
  }

  async function apiError(res) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.message || "";
    } catch (_) {}
    return new Error(`GitHub API error (${res.status}): ${detail || res.statusText}`);
  }

  return { getFile, putTextFile, putBinaryFile, deleteFile };
})();
