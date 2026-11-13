# Vacancy sources: what's connected and why

Researched and tested 13 November 2026. "Connected" means the site collects from it automatically
every hour. Every connection uses an official API, an RSS feed, or a public page the site allows bots
to read. No login, no faking a browser.

## ✅ Connected automatically

| # | Source | What it gives | How | Notes |
|---|---|---|---|---|
| 1 | **hh.kz** | The biggest KZ job board. Internships, junior and no-experience design roles across all of Kazakhstan | Official API | **Waiting on your free API key** from dev.hh.ru. Expected to be the largest KZ source |
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
| 22 | **Your own list** (`data/manual.json`) | Anything you find yourself | File you edit | Shows on the site within a minute |

Telegram previews show only each channel's ~20 newest posts. The updater remembers older posts, so
nothing gets lost between runs. Listings older than 60 days are removed.

## 🔗 Linked on the site ("More places to look"), not collected

| Source | Why it isn't automatic |
|---|---|
| **Enbek.kz** (state labor exchange) | Its robots.txt forbids bots on vacancy pages, and it has no public API |
| **Astana Hub** (astanahub.com/vacancy) | Blocks automated requests (403) and forbids its API in robots.txt |
| **LinkedIn Jobs** | Its terms forbid automated collection, and there's no public jobs API |
| **OLX.kz** | Its API is only for partners |
| **Behance Jobs** | Loaded by JavaScript; no feed |
| **Dribbble Jobs** | Has an RSS feed, but it's almost all US on-site jobs. A link works better |

## ❌ Tested and left out

| Source | Reason |
|---|---|
| Arbeitnow | Almost all Germany-only jobs |
| geekjob.ru | RSS feed no longer exists |
| designer.ru | Its robots.txt forbids bots on search pages |
| Telegram @designer_jobs, @uiux_jobs, @uxuidesign_jobs, KZ design channels | Channel doesn't exist or has no public preview |

## Ideas for more KZ coverage

- **Company career pages.** Large KZ tech companies (Kaspi, Kolesa Group, Chocofamily, inDrive, Halyk,
  Beeline KZ, Freedom) often post design internships on their own sites. Many use hiring systems with
  open feeds (Greenhouse, Lever, Huntflow). Send me a list of companies and I can check and connect them.
- **More Telegram channels.** If students or colleagues know KZ design channels, send me the @names.
  If the channel has a public preview, adding one takes a minute.
