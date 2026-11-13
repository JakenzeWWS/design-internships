# Design Internships KZ

A one-page site with UX/UI, product and web design vacancies for students in Kazakhstan. It collects
from 20+ sources every hour: hh.kz, 13 Telegram channels, Habr Career and 7 remote-job boards.
See [SOURCES.md](SOURCES.md) for the full list and why some sites are only linked.

- `index.html`: the page students open
- `data/vacancies.json`: the vacancy list (generated, don't edit)
- `data/manual.json`: vacancies **you** add by hand (from Telegram, Instagram, LinkedIn...)
- `scripts/fetch.mjs`: collects vacancies from all sources (add Telegram channels at `TG_KZ` / `TG_DESIGN`)
- `.github/workflows/update.yml`: runs the script every hour on GitHub

## Setup (one time)

### 1. Get a HeadHunter API key (free)
HeadHunter now requires a registered application to search vacancies.
1. Sign in at https://dev.hh.ru (any hh account works) and click **Create application**.
2. Fill in a name (e.g. "Design Internships for students"), a description of what it does, and your
   email. For the redirect URI you can enter your future site address, e.g. `https://<your-username>.github.io/design-internships/`.
3. Wait for approval (hh reviews applications manually; usually a few days). You'll get a
   **Client ID** and **Client Secret**.

### 2. Put the site on GitHub
1. Create a free account at https://github.com and a **public** repository called `design-internships`.
2. Click **Add file → Upload files** and drag in everything from this folder (including the hidden `.github`
   folder; on a Mac press `Cmd+Shift+.` in Finder to show it).
3. **Settings → Secrets and variables → Actions → New repository secret**. Add:
   - `HH_CLIENT_ID`: your Client ID
   - `HH_CLIENT_SECRET`: your Client Secret
   - `HH_USER_AGENT`: `DesignInternships/1.0 (your-email@example.com)` with your real email
4. **Settings → Pages**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)`, then **Save**.
5. **Actions** tab: enable workflows if asked, open **Update vacancies**, then click **Run workflow**.

After about a minute your site is live at `https://<your-username>.github.io/design-internships/`. Share that link.

## Adding a vacancy by hand
Edit `data/manual.json` on GitHub (pencil icon) and add entries like this:

```json
[
  {
    "title": "UX/UI Design Intern",
    "company": "Company name",
    "city": "Almaty",
    "published_at": "2026-11-13T09:00:00+05:00",
    "url": "https://link-to-the-vacancy",
    "tags": ["Internship"],
    "format": "Office"
  }
]
```
Saving the file updates the site within about a minute.

## Run locally
```bash
HH_CLIENT_ID=... HH_CLIENT_SECRET=... node scripts/fetch.mjs
python3 -m http.server 8000   # then open http://localhost:8000
```
