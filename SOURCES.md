# Vacancy sources: what's connected and why

Researched and tested 13 November 2026. "Connected" means the site collects from it automatically
every hour. Every connection uses an official API, an RSS feed, or a public page the site allows bots
to read. No login, no faking a browser.

**Update 14 November 2026:** every source below now also collects **mobile** (Android, iOS, Flutter) and
**web development** (frontend, backend, fullstack) vacancies, not just design. Kazakhstan IT Telegram
channels are also searched for `#android`, `#ios`, `#flutter`, `#frontend`, `#backend`, `#fullstack`,
`стажер`, `стажировка` and `junior`. The remote boards add their developer categories. designjobs.kz and
the design Telegram channels stay design-only.

## ✅ Connected automatically

| # | Source | What it gives | How | Notes |
|---|---|---|---|---|
| 1 | **hh.kz** | The biggest KZ job board. Internships, junior and no-experience design roles across all of Kazakhstan | Official API | **Waiting on your free API key** from dev.hh.ru. Expected to be the largest KZ source |
| 2a | **Telegram @designkziskra** (Дизайн вакансии Казахстан) | KZ design jobs, often for students | Public channel page + search | All design posts are kept |
| 2 | **Telegram @itcom_kz** (ITvacancy KZ & UZ) | KZ IT vacancies, often design | Public channel page | Only posts about design are kept |
| 3 | **Telegram @workitkz** (IT Вакансии Казахстан) | KZ IT jobs | Public channel page | |
| 4 | **Telegram @itvacancykz** | KZ IT jobs | Public channel page | |
| 5 | **Telegram @itworkkz** | KZ IT jobs | Public channel page | |
| 6 | **Telegram @it_jobs_kz** | KZ IT jobs, mostly Almaty | Public channel page | |
| 7 | **Telegram @jobkz_1** (JobKZ) | General KZ jobs | Public channel page | |
| 8 | **Telegram @vakankz** | General KZ jobs | Public channel page | |
| 9 | **Telegram @designer_ru** (ИЩУ_ДИЗАЙНЕРА) | 30–40 design jobs a day (Russia/CIS) | Public channel page | Only remote, KZ or entry-level posts are kept |
| 10 | **Telegram @designhunters** | Product/UX design roles | Public channel page | Same filter |
| 11 | **Telegram @designwork_vacansii** | Design jobs with salaries | Public channel page | Same filter |
| 12 | **Telegram @designbirzha** | Design jobs and freelance gigs | Public channel page | Same filter |
| 13 | **Telegram @forproducts** | Product designer roles | Public channel page | Same filter |
| 14 | **Telegram @digital_hr** | Digital and design roles | Public channel page | Same filter |
| 15 | **Habr Career** (career.habr.com) | IT and design jobs in Russian | Official RSS | Only jobs in Kazakhstan or marked "можно удалённо" (remote OK) are kept |
| 16 | **Himalayas** | Worldwide remote jobs | Public API | Only "worldwide" design jobs |
| 17 | **Jobicy** | Remote design jobs | Public API | Only jobs open to anywhere, Asia or EMEA |
| 18 | **We Work Remotely** | Remote design jobs | Official RSS | Only "Anywhere" or Asia jobs |
| 19 | **RemoteOK** | Remote jobs | Public API | Few real design jobs; kept for coverage |
| 20 | **Working Nomads** | Remote jobs | Public API | Design category only |
| 21 | **Remotive** | Remote jobs | Public API | Their free feed is small now |
| 22 | **inDrive careers** (careers.indrive.com) | inDrive's own job site. Almaty HQ, often hires designers | Public site data (WordPress API, robots.txt allows) | Only Kazakhstan design roles. Shown for as long as inDrive lists them |
| 23 | **Wolt careers** | Wolt's jobs in Almaty and Astana | Greenhouse public API | Only Kazakhstan design roles (none right now) |
| 24 | **designjobs.kz** | Kazakhstan's design-only job board. Reads the home page plus the Junior, UX/UI, Product designer, UI designer and UX research pages: including junior and intern roles, across many KZ cities | Structured job data on its public pages (robots.txt allows) | **Biggest KZ source right now.** Expired jobs are dropped automatically |
| 25 | **hackathon.kz/internships** | Student internship programs (e.g. Halyk Start, which has a UX/UI track) | The site's public internships data | Only internships that include design. Links go to the hackathon.kz page |
| 26 | **Your own list** (`data/manual.json`) | Anything you find yourself | File you edit | Shows on the site within a minute |

In every Kazakhstan Telegram channel the updater also runs the channel's own search for `дизайнер`, `#UX`, `#design` and `UX/UI`, so older matching posts are found too. Telegram previews show only each channel's ~20 newest posts. The updater remembers older posts, so
nothing gets lost between runs. Listings older than 60 days are removed.

## 🔗 Linked on the site ("More places to look"), not collected

| Source | Why it isn't automatic |
|---|---|
| **Enbek.kz** (state labor exchange) | Its robots.txt forbids bots on vacancy pages, and it has no public API |
| **Astana Hub** (astanahub.com/vacancy) | Blocks automated requests (403) and forbids its API in robots.txt |
| **LinkedIn Jobs** | Its terms forbid automated collection, and there's no public jobs API |
| **OLX.kz** | Its API is only for partners |
| **Behance Jobs** | Loaded by JavaScript; no feed |
| **Qyzmet.kz** | Its robots.txt forbids bots on vacancy search and on its links out to jobs. It mostly re-lists jobs from other KZ sites |
| **Dribbble Jobs** | Has an RSS feed, but it's almost all US on-site jobs. A link works better |

## ❌ Tested and left out

| Source | Reason |
|---|---|
| Arbeitnow | Almost all Germany-only jobs |
| geekjob.ru | RSS feed no longer exists |
| designer.ru | Its robots.txt forbids bots on search pages |
| Telegram @designer_jobs, @uiux_jobs, @uxuidesign_jobs, KZ design channels | Channel doesn't exist or has no public preview |

## 🏢 Company career pages: what I checked

I tested about 50 companies with offices in Kazakhstan (KZ tech, banks, telecoms, and international
companies with Almaty/Astana offices) against the main hiring systems with open feeds
(Greenhouse, Lever, Ashby, Workable, SmartRecruiters) and their own career sites.

| Company | Result |
|---|---|
| **inDrive** | ✅ Connected (its own careers site has open data) |
| **Wolt** | ✅ Connected (Greenhouse, 8 KZ jobs, none in design right now) |
| **Andersen** | 🔗 Linked. Runs UI/UX design internships in KZ, but its site has no feed. Also posts on hh.kz |
| **Kaspi, Kolesa Group, Halyk, Chocofamily, Jusan, Beeline KZ, Kcell, Freedom, BTS Digital, Technodom, Air Astana** | No open feed; their careers pages are built with JavaScript or send you to hh.kz. **They post their vacancies on hh.kz**, so they'll show up automatically once the hh key works |
| JetBrains, Figma, GitLab, Miro, Canva, Xsolla, Careem, Toptal and others | Have open feeds, but no Kazakhstan jobs |

**Bottom line:** in Kazakhstan, almost every company hires through hh.kz. The hh API key is still
the single biggest improvement.

To add another company that uses Greenhouse, Lever or Ashby, add one line to `COMPANIES` in
`scripts/fetch.mjs`, e.g. `{ name: "Company", type: "lever", slug: "company" }`.

## Ideas for more KZ coverage

- **More companies.** If you know a company that hires designers, send me its careers page and I'll check for a feed.
- **More Telegram channels.** If students or colleagues know KZ design channels, send me the @names.
  If the channel has a public preview, adding one takes a minute.
