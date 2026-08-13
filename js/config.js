/* ===========================================================
   CONFIG — edit these three values before you deploy.
   =========================================================== */
const CONFIG = {
  // Your GitHub username (all lowercase, exactly as in the URL)
  GITHUB_OWNER: "Madhi1615",

  // The name of the repository you created for this site
  GITHUB_REPO: "Event-Management",

  // The branch GitHub Pages serves from (usually "main")
  GITHUB_BRANCH: "main",

  // SHA-256 hash of the shared admin password.
  // Do NOT put the plain password here.
  // To generate a hash: open admin.html, it will prompt you
  // to set a password the first time, and print the hash to
  // paste in here. Or run this in any browser console:
  //
  //   crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourPassword'))
  //     .then(buf => console.log(Array.from(new Uint8Array(buf))
  //       .map(b => b.toString(16).padStart(2,'0')).join('')))
  //
  ADMIN_PASSWORD_HASH: ""
};
