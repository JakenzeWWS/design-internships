// Collects UX/UI, product and web design vacancies for students in Kazakhstan
// from many sources and writes data/vacancies.json for the website.
//
// Every source runs independently: if one fails, the others still update and the
// failed source keeps its previous results. Only official APIs, RSS feeds and
// public pages that allow automated access are used, with an honest User-Agent.
//
// Optional secrets (GitHub → Settings → Secrets → Actions):
//   HH_APP_TOKEN, or HH_CLIENT_ID + HH_CLIENT_SECRET  – enables hh.kz
//   HH_USER_AGENT – e.g. "DesignInternships/1.0 (you@mail.com)"

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "vacancies.json");
const MANUAL = path.join(ROOT, "data", "manual.json");
const MAX_AGE_DAYS = 60;
const UA = "DesignInternshipsKZ/1.0 (+https://jakenzewws.github.io/design-internships/)";

// ---------------------------------------------------------------- filters ---

// Job is about digital design?
const DESIGN_RE = /\bux\b|\bui\b|ux\/ui|ui\/ux|дизайн|design|figma|interface|интерфейс/i;
// ...but not these kinds of design.
const EXCLUDE_RE = /interior|интерьер|ландшафт|landscape|fashion|одежд|мебел|furniture|level design|game design|геймдиз|instructional|ювелир|jewel|маникюр|ногт|парикмах|\bhair|engineer|инженер|architect|архитект|конструкт|\bcad\b|швея|флорист|полиграф|упаковк|packaging|print|developer|разработчик|программист|frontend|front-end|automobil|automotive|автомоб|трубопровод|pipeline|монтаж|сварщ|электр/i;
const INTERN_RE = /стаж[её]р|стажир|intern\b|internship|trainee|практикант|практика/i;
const JUNIOR_RE = /junior|младш|джун|entry[- ]level|начинающ/i;
const NOEXP_RE = /без опыта|no experience|опыт не (требуется|обязателен)/i;
const REMOTE_RE = /remote|удал[её]н|удаленка|дистанц/i;
// Remote jobs that people in Kazakhstan can actually take.
const OPEN_TO_KZ_RE = /^$|worldwide|anywhere|global|kazakhstan|казахстан|central asia|asia|\bcis\b|снг|emea/i;
const KZ_CITIES = [
  ["Almaty", /алмат|almaty/i], ["Astana", /астан|astana|нур-султан/i], ["Shymkent", /шымкент|shymkent/i],
  ["Karaganda", /караганд|karaganda/i], ["Aktobe", /актоб|aktobe/i], ["Atyrau", /атырау|atyrau/i],
  ["Pavlodar", /павлодар|pavlodar/i], ["Ust-Kamenogorsk", /усть-каменогорск|oskemen/i], ["Kostanay", /костанай|kostanay/i],
  ["Taraz", /тараз|taraz/i], ["Konaev", /конаев|konaev|kunaev/i], ["Petropavl", /петропавл|petropavl/i], ["Turkistan", /т[уү]ркістан|туркестан|turkistan/i],
  ["Kyzylorda", /кызылорд|qyzylorda|kyzylorda/i], ["Semey", /семей|semey/i], ["Oral", /уральск|орал|oral\b/i], ["Aktau", /актау|aktau/i],
];

const isDesign = (t) => DESIGN_RE.test(t) && !EXCLUDE_RE.test(t);
const cityOf = (t) => (KZ_CITIES.find(([, re]) => re.test(t)) || [""])[0];
function tagsOf(text) {
  const tags = [];
  if (INTERN_RE.test(text)) tags.push("Internship");
  if (JUNIOR_RE.test(text)) tags.push("Junior");
  if (NOEXP_RE.test(text)) tags.push("No experience");
  return tags;
}

// ---------------------------------------------------------------- helpers ---

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { json = false, headers = {} } = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return json ? res.json() : res.text();
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
function decode(s = "") {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z#0-9]+);/gi, (m, e) => ENTITIES[e] ?? m);
}
const stripTags = (s = "") => decode(s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").trim();

function rssItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
    const tag = (name) => decode((body.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)) || [])[1] || "").trim();
    return { title: tag("title"), link: tag("link"), pubDate: tag("pubDate"), description: tag("description"), author: tag("author"), region: tag("region"), image: tag("image") };
  });
}

const iso = (d) => new Date(d).toISOString();

// ---------------------------------------------------------------- sources ---
// Each source returns an array of vacancies in this shape:
// { id, title, company, logo, city, region: "Kazakhstan"|"Remote", published_at,
//   salary, format, tags, url, source }

// 1. hh.kz — official API (needs a free app token from dev.hh.ru)
async function hh() {
  let token = process.env.HH_APP_TOKEN;
  if (!token && process.env.HH_CLIENT_ID && process.env.HH_CLIENT_SECRET) {
    const res = await fetch("https://api.hh.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "HH-User-Agent": process.env.HH_USER_AGENT || UA },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: process.env.HH_CLIENT_ID, client_secret: process.env.HH_CLIENT_SECRET }),
    });
    const body = await res.json().catch(() => ({}));
    if (!body.access_token) throw new Error(`hh token error ${res.status}: ${JSON.stringify(body)}`);
    token = body.access_token;
  }
  if (!token) return { skipped: "no API key yet (see README)" };

  const terms = ["UX", "UI", "UX/UI", "UI/UX", "product designer", "продуктовый дизайнер", "web designer", "веб-дизайнер",
    "веб дизайнер", "дизайнер интерфейсов", "digital designer", "digital-дизайнер", "figma", "графический дизайнер"];
  const entry = "стажер OR стажёр OR стажировка OR intern OR internship OR trainee OR junior OR младший OR практикант";
  const byId = new Map();
  for (const term of terms) {
    for (const extra of [{ text: term, experience: "noExperience" }, { text: `(${term}) AND (${entry})` }]) {
      const url = new URL("https://api.hh.ru/vacancies");
      Object.entries({ area: "40", per_page: "100", order_by: "publication_time", period: String(MAX_AGE_DAYS), search_field: "name", ...extra })
        .forEach(([k, v]) => url.searchParams.set(k, v));
      const body = await get(url, { json: true, headers: { "HH-User-Agent": process.env.HH_USER_AGENT || UA, Authorization: `Bearer ${token}` } });
      for (const v of body.items) if (!v.archived) byId.set(v.id, v);
      await sleep(300);
    }
  }
  return [...byId.values()].filter((v) => !EXCLUDE_RE.test(v.name)).map((v) => {
    const fmt = (v.work_format || []).map((f) => f.id);
    const tags = tagsOf(v.name);
    if (v.experience?.id === "noExperience" && !tags.includes("No experience")) tags.push("No experience");
    return {
      id: `hh-${v.id}`, title: v.name, company: v.employer?.name || "", logo: v.employer?.logo_urls?.["90"] || null,
      city: v.area?.name || "", region: "Kazakhstan", published_at: v.published_at,
      salary: v.salary ? { from: v.salary.from, to: v.salary.to, currency: v.salary.currency } : null,
      format: fmt.includes("REMOTE") || v.schedule?.id === "remote" ? "Remote" : fmt.includes("HYBRID") ? "Hybrid" : "Office",
      tags, url: v.alternate_url, source: "hh.kz",
    };
  });
}

// 2. Telegram — public channel previews (t.me/s/…), newest ~20 posts per channel.
// Kazakhstan job channels: keep posts about design.
const TG_KZ = ["designkziskra", "itcom_kz", "workitkz", "itvacancykz", "itworkkz", "it_jobs_kz", "jobkz_1", "vakankz"];
// Searches run inside each Kazakhstan channel (t.me/s/<channel>?q=…), so older matching posts are found too.
const TG_SEARCHES = ["дизайнер", "#UX", "#design", "UX/UI"];
// Design job channels (mostly Russia): keep design posts that are remote, in KZ, or entry-level.
const TG_DESIGN = ["designer_ru", "designhunters", "designwork_vacansii", "designbirzha", "forproducts", "digital_hr"];

async function telegramChannel(ch, kz) {
  const pages = [await get(`https://t.me/s/${ch}`)];
  if (kz) {
    for (const q of TG_SEARCHES) {
      await sleep(400);
      pages.push(await get(`https://t.me/s/${ch}?q=${encodeURIComponent(q)}`).catch(() => ""));
    }
  }
  const channelTitle = stripTags((pages[0].match(/tgme_channel_info_header_title[^>]*>([\s\S]*?)<\/div>/) || [])[1] || ch);
  const posts = pages.flatMap((html) => html.split('class="tgme_widget_message_wrap').slice(1));
  const out = [];
  const seenPosts = new Set();
  for (const p of posts) {
    const post = (p.match(/data-post="([^"]+)"/) || [])[1];
    if (!post || seenPosts.has(post)) continue;
    seenPosts.add(post);
    const date = (p.match(/datetime="([^"]+)"/) || [])[1];
    const textHtml = (p.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/) || [])[1];
    if (!post || !date || !textHtml) continue;
    const text = stripTags(textHtml);
    const lines = text.split("\n")
      .map((l) => l.replace(/[\u200b\u200c\u200d]/g, "").trim())
      .filter((l) => !l.startsWith("#"))
      .map((l) => l.replace(/^[\s\p{Extended_Pictographic}\u{FE0F}•\-–—:|*]+/u, "").trim())
      .filter((l) => l.length > 2);
    const position = (text.match(/(?:должность|позиция|position|role|вакансия)\s*[:\-–]\s*([^\n]{3,100})/i) || [])[1]?.trim();
    const head = position || lines.slice(0, 3).join(" ");
    if (!isDesign(head)) continue;
    const kzMention = /казахстан|kazakhstan|алмат|almaty|астан|astana|шымкент/i.test(text);
    const remote = REMOTE_RE.test(text);
    const tags = tagsOf(text);
    if (!kz && !(remote || kzMention || tags.length)) continue;
    const title = (position || lines.find((l) => isDesign(l)) || lines[0]).replace(/^(вакансия|hiring)\s*[:\-–]\s*/i, "").split(/\s+\|\s+/)[0].split(/(?<=[.!?])\s|:\s/)[0];
    const shortTitle = title.length > 90 ? title.slice(0, 87).replace(/\s+\S*$/, "") + "…" : title;
    const company = (text.match(/(?:компания|company|работодатель)\s*[:\-–]\s*([^\n]{2,60})/i) || [])[1]?.trim();
    out.push({
      id: `tg-${post.replace("/", "-")}`, title: shortTitle, company: company || channelTitle, logo: null,
      city: cityOf(text), region: kz || kzMention ? "Kazakhstan" : "Remote", published_at: iso(date), salary: null,
      format: remote ? "Remote" : "Office", tags, url: `https://t.me/${post}`, source: `Telegram @${ch}`, accumulate: true,
    });
  }
  return out;
}

// 3. Habr Career — official RSS. Keep jobs in Kazakhstan or remote.
async function habr() {
  const queries = ["UX", "UI дизайнер", "product designer", "продуктовый дизайнер", "веб-дизайнер", "дизайнер интерфейсов", "web designer"];
  const byUrl = new Map();
  for (const q of queries) {
    const xml = await get(`https://career.habr.com/vacancies/rss?type=all&q=${encodeURIComponent(q)}`);
    for (const it of rssItems(xml)) byUrl.set(it.link, it);
    await sleep(500);
  }
  return [...byUrl.values()].flatMap((it) => {
    const role = (it.title.match(/«(.+)»/) || [, it.title])[1];
    const kz = /казахстан/i.test(it.description);
    const remote = /можно удал/i.test(it.description);
    if (!isDesign(role) || !(kz || remote)) return [];
    return [{
      id: `habr-${it.link.split("/").pop()}`, title: role, company: it.author, logo: it.image || null,
      city: kz ? cityOf(it.description) : "", region: kz ? "Kazakhstan" : "Remote", published_at: iso(it.pubDate),
      salary: null, format: remote ? "Remote" : "Office", tags: tagsOf(role), url: it.link, source: "Habr Career",
    }];
  });
}

// 4–9. International remote boards (public APIs / RSS). Keep design jobs open worldwide / Asia / CIS.
function remoteJob({ id, title, company, logo, date, url, source, location = "" }) {
  if (!isDesign(title) || !OPEN_TO_KZ_RE.test(location.trim())) return [];
  return [{ id, title, company, logo: logo || null, city: "", region: "Remote", published_at: iso(date), salary: null,
    format: "Remote", tags: tagsOf(title), url, source }];
}

async function remoteok() {
  const data = await get("https://remoteok.com/api?tag=design", { json: true });
  return data.filter((j) => j.id).flatMap((j) => remoteJob({ id: `rok-${j.id}`, title: j.position, company: j.company,
    logo: j.company_logo, date: j.date, url: j.url, source: "RemoteOK", location: j.location || "" }));
}

async function jobicy() {
  const data = await get("https://jobicy.com/api/v2/remote-jobs?count=100&industry=design-multimedia", { json: true });
  return (data.jobs || []).flatMap((j) => remoteJob({ id: `jcy-${j.id}`, title: j.jobTitle, company: j.companyName,
    logo: j.companyLogo, date: j.pubDate, url: j.url, source: "Jobicy", location: j.jobGeo === "Anywhere" ? "" : j.jobGeo || "" }));
}

async function himalayas() {
  const out = [];
  for (const q of ["product designer", "ux designer", "ui designer", "web designer"]) {
    const data = await get(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&worldwide=true`, { json: true });
    for (const j of data.jobs || []) {
      out.push(...remoteJob({ id: `him-${j.guid}`, title: j.title, company: j.companyName, logo: j.companyLogo,
        date: j.pubDate * 1000, url: j.applicationLink, source: "Himalayas", location: (j.locationRestrictions || []).join(", ") }));
    }
    await sleep(500);
  }
  return out;
}

async function weworkremotely() {
  const xml = await get("https://weworkremotely.com/categories/remote-design-jobs.rss");
  return rssItems(xml).flatMap((it) => {
    const [company, ...rest] = it.title.split(":");
    const location = /anywhere/i.test(it.region) ? "" : it.region;
    return remoteJob({ id: `wwr-${it.link.split("/").pop()}`, title: rest.join(":").trim() || it.title, company: company.trim(),
      date: it.pubDate, url: it.link, source: "We Work Remotely", location });
  });
}

async function workingnomads() {
  const data = await get("https://www.workingnomads.com/api/exposed_jobs/", { json: true });
  return data.filter((j) => /design/i.test(j.category_name)).flatMap((j) => remoteJob({ id: `wn-${j.url.split("/").filter(Boolean).pop()}`,
    title: j.title, company: j.company_name, date: j.pub_date, url: j.url, source: "Working Nomads", location: j.location || "" }));
}

async function remotive() {
  const data = await get("https://remotive.com/api/remote-jobs?category=design", { json: true });
  return (data.jobs || []).flatMap((j) => remoteJob({ id: `rmt-${j.id}`, title: j.title, company: j.company_name, logo: j.company_logo,
    date: j.publication_date, url: j.url, source: "Remotive", location: j.candidate_required_location || "" }));
}

// 10. Company career pages with open job feeds. Company jobs stay on the site for as
// long as the company still lists them (no 60-day limit).
// To add a company, add one line. Types: "greenhouse", "lever", "ashby", "wordpress".
const KZ_RE = /kazakh|казахстан|almaty|алматы|astana|астана|nur-sultan|shymkent|шымкент/i;
const COMPANIES = [
  { name: "inDrive", type: "wordpress", url: "https://careers.indrive.com" },
  { name: "Wolt", type: "greenhouse", slug: "wolt" },
];

function companyJob(c, { id, title, location, date, url }) {
  if (!isDesign(title) || !KZ_RE.test(`${title} ${location}`)) return [];
  return [{ id: `co-${c.name}-${id}`, title: title.replace(/\s+[–-]\s+Kazakhstan$/i, ""), company: c.name, logo: null,
    city: cityOf(`${title} ${location}`), region: "Kazakhstan", published_at: iso(date), salary: null,
    format: REMOTE_RE.test(location) ? "Remote" : "Office", tags: tagsOf(title), url, source: `${c.name} careers`, evergreen: true }];
}

async function company(c) {
  if (c.type === "greenhouse") {
    const d = await get(`https://boards-api.greenhouse.io/v1/boards/${c.slug}/jobs`, { json: true });
    return d.jobs.flatMap((j) => companyJob(c, { id: j.id, title: j.title, location: j.location?.name || "", date: j.updated_at, url: j.absolute_url }));
  }
  if (c.type === "lever") {
    const d = await get(`https://api.lever.co/v0/postings/${c.slug}?mode=json`, { json: true });
    return d.flatMap((j) => companyJob(c, { id: j.id, title: j.text, location: j.categories?.location || "", date: j.createdAt, url: j.hostedUrl }));
  }
  if (c.type === "ashby") {
    const d = await get(`https://api.ashbyhq.com/posting-api/job-board/${c.slug}`, { json: true });
    return d.jobs.flatMap((j) => companyJob(c, { id: j.id, title: j.title,
      location: [j.location, ...(j.secondaryLocations || []).map((x) => x.location)].join(", "), date: j.publishedAt, url: j.jobUrl }));
  }
  if (c.type === "wordpress") {
    const out = [];
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`${c.url}/wp-json/wp/v2/open_position?per_page=100&page=${page}&_fields=id,date_gmt,link,title`, { headers: { "User-Agent": UA } });
      if (!res.ok) break;
      const list = await res.json();
      for (const j of list) out.push(...companyJob(c, { id: j.id, title: decode(j.title.rendered), location: "", date: `${j.date_gmt}Z`, url: j.link }));
      if (page >= Number(res.headers.get("x-wp-totalpages") || 1)) break;
      await sleep(300);
    }
    return out;
  }
  throw new Error(`unknown company type ${c.type}`);
}

// 11. designjobs.kz — Kazakhstan design job board. Reads the job lists' structured data
// (schema.org), then each new job page once; known jobs are reused from the last run.
const DESIGNJOBS_LISTS = ["https://designjobs.kz/", "https://designjobs.kz/jobs/junior", "https://designjobs.kz/jobs/ux-ui",
  "https://designjobs.kz/jobs/product-designer", "https://designjobs.kz/jobs/ui-designer", "https://designjobs.kz/jobs/ux-research"];

function ldJson(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap(([, j]) => { try { const d = JSON.parse(j); return Array.isArray(d) ? d : [d]; } catch { return []; } });
}

async function designjobs(old) {
  const urls = new Set();
  for (const list of DESIGNJOBS_LISTS) {
    for (const block of ldJson(await get(list))) {
      if (block["@type"] === "ItemList") for (const it of block.itemListElement || []) if (it.url) urls.add(it.url);
    }
    await sleep(500);
  }
  const known = new Map(old.map((v) => [v.url, v]));
  const out = [];
  for (const url of urls) {
    let v = known.get(url);
    if (!v) {
      const job = ldJson(await get(url)).find((b) => b["@type"] === "JobPosting");
      await sleep(400);
      if (!job) continue;
      const addr = job.jobLocation?.address || {};
      const sal = job.baseSalary?.value;
      const tags = tagsOf(job.title);
      if (job.employmentType === "INTERN" && !tags.includes("Internship")) tags.push("Internship");
      v = {
        id: `dj-${url.split("/").pop()}`, title: job.title, company: job.hiringOrganization?.name || "",
        logo: job.hiringOrganization?.logo || null, city: cityOf(addr.addressLocality || "") || addr.addressLocality || "",
        region: !addr.addressCountry || addr.addressCountry === "KZ" ? "Kazakhstan" : "Remote", published_at: iso(job.datePosted),
        valid_through: job.validThrough || null,
        salary: sal && (sal.minValue || sal.maxValue) ? { from: sal.minValue || null, to: sal.maxValue || null, currency: job.baseSalary.currency } : null,
        format: job.jobLocationType === "TELECOMMUTE" ? "Remote" : "Office", tags, url, source: "designjobs.kz", evergreen: true,
      };
    }
    if (EXCLUDE_RE.test(v.title)) continue;
    if (v.valid_through && Date.parse(v.valid_through) < Date.now() - 864e5) continue;
    out.push(v);
  }
  return out;
}

// 12. hackathon.kz — internships board. Keeps internships that include design;
// the date is the first time we saw the listing (the board doesn't publish one).
async function hackathonkz(old) {
  const items = await get("https://api.hackathon.kz/api/internships", { json: true });
  const firstSeen = new Map(old.map((v) => [v.id, v.published_at]));
  return (Array.isArray(items) ? items : []).flatMap((x) => {
    const text = `${x.title} ${(x.stack || []).join(" ")} ${x.summary || ""}`;
    if (!isDesign(`${x.title} ${(x.stack || []).join(" ")}`) && !/ux\/ui|ui\/ux|дизайн/i.test(text)) return [];
    const id = `hk-${x.slug}`;
    const tags = ["Internship"];
    if (x.paid) tags.push("Paid");
    return [{
      id, title: x.title, company: x.company || "", logo: null, city: cityOf(x.city || "") || x.city || "", region: "Kazakhstan",
      published_at: firstSeen.get(id) || new Date().toISOString(), salary: null, format: x.remote ? "Remote" : "Office",
      tags, url: `https://hackathon.kz/internship?slug=${encodeURIComponent(x.slug)}`, source: "hackathon.kz", evergreen: true,
    }];
  });
}

// 13. Teacher-added vacancies (data/manual.json)
async function manual() {
  try {
    const list = JSON.parse(await readFile(MANUAL, "utf8"));
    return list.map((v, i) => ({ id: `manual-${i}`, tags: [], format: "Office", region: "Kazakhstan", city: "", logo: null,
      salary: null, ...v, source: "Added by teacher" }));
  } catch {
    return [];
  }
}

const SOURCES = [
  { name: "hh.kz", run: hh },
  ...TG_KZ.map((ch) => ({ name: `Telegram @${ch}`, run: () => telegramChannel(ch, true) })),
  ...TG_DESIGN.map((ch) => ({ name: `Telegram @${ch}`, run: () => telegramChannel(ch, false) })),
  { name: "Habr Career", run: habr },
  { name: "RemoteOK", run: remoteok },
  { name: "Jobicy", run: jobicy },
  { name: "Himalayas", run: himalayas },
  { name: "We Work Remotely", run: weworkremotely },
  { name: "Working Nomads", run: workingnomads },
  { name: "Remotive", run: remotive },
  ...COMPANIES.map((c) => ({ name: `${c.name} careers`, run: () => company(c) })),
  { name: "designjobs.kz", run: designjobs },
  { name: "hackathon.kz", run: hackathonkz },
  { name: "Added by teacher", run: manual },
];

// ------------------------------------------------------------------- main ---

async function main() {
  let previous = [];
  try { previous = JSON.parse(await readFile(OUT, "utf8")).vacancies || []; } catch {}
  const prevBySource = Map.groupBy ? Map.groupBy(previous, (v) => v.source) : new Map();

  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const all = new Map();
  const status = [];

  for (const src of SOURCES) {
    const old = prevBySource.get(src.name) || [];
    let items;
    try {
      const result = await src.run(old);
      if (result?.skipped) {
        status.push({ name: src.name, ok: false, note: result.skipped, count: old.length });
        items = old;
      } else {
        // Telegram previews only show the latest posts, so keep older ones we saw before.
        items = src.name.startsWith("Telegram") ? [...old, ...result] : result;
        status.push({ name: src.name, ok: true, count: result.length });
      }
    } catch (err) {
      console.warn(`! ${src.name}: ${err.message}`);
      status.push({ name: src.name, ok: false, note: "temporarily unavailable", count: old.length });
      items = old;
    }
    for (const v of items) {
      if (!v.url || !(v.evergreen || Date.parse(v.published_at) >= cutoff)) continue;
      delete v.accumulate;
      all.set(v.id, v);
    }
    console.log(`${status.at(-1).ok ? "✓" : "–"} ${src.name}: ${status.at(-1).count}${status.at(-1).note ? ` (${status.at(-1).note})` : ""}`);
  }

  // Same job posted on several boards → keep the first (sources are ordered by priority).
  const seen = new Set();
  const vacancies = [...all.values()]
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
    .filter((v) => {
      const key = `${v.title}|${v.company}`.toLowerCase().replace(/[^\p{L}\p{N}|]/gu, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const out = { updated_at: new Date().toISOString(), live: status.some((s) => s.ok && s.count), count: vacancies.length, sources: status, vacancies };
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`Saved ${vacancies.length} vacancies from ${status.filter((s) => s.count).length} sources.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
