// Fetches design internships / entry-level vacancies in Kazakhstan from the
// official HeadHunter API and writes data/vacancies.json for the website.
//
// HeadHunter requires an application token for vacancy search.
// Provide ONE of these as environment variables (GitHub Secrets in production):
//   HH_APP_TOKEN                       – an application token you already have, or
//   HH_CLIENT_ID + HH_CLIENT_SECRET    – the script exchanges them for a token.
// Optional: HH_USER_AGENT, e.g. "DesignInternships/1.0 (you@yourmail.com)".
//
// Manually added vacancies (from Telegram, Instagram, LinkedIn...) can be put in
// data/manual.json and are merged into the output.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "vacancies.json");
const MANUAL = path.join(ROOT, "data", "manual.json");

const API = "https://api.hh.ru";
const AREA_KAZAKHSTAN = "40";
const MAX_AGE_DAYS = 60;
const USER_AGENT = process.env.HH_USER_AGENT || "DesignInternshipsKZ/1.0";

// Job-title search terms (searched in the vacancy title only, to avoid noise).
const TERMS = [
  "UX", "UI", "UX/UI", "UI/UX",
  "product designer", "продуктовый дизайнер",
  "web designer", "веб-дизайнер", "веб дизайнер",
  "дизайнер интерфейсов", "digital designer", "digital-дизайнер",
  "figma",
];
const ENTRY_WORDS = "стажер OR стажёр OR стажировка OR intern OR internship OR trainee OR junior OR младший OR практикант";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getToken() {
  if (process.env.HH_APP_TOKEN) return process.env.HH_APP_TOKEN;
  const { HH_CLIENT_ID: id, HH_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) return null;
  const res = await fetch("https://api.hh.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "HH-User-Agent": USER_AGENT },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(`Could not get app token (${res.status}): ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

async function search(token, params) {
  const url = new URL(`${API}/vacancies`);
  const all = { area: AREA_KAZAKHSTAN, per_page: "100", order_by: "publication_time", period: String(MAX_AGE_DAYS), ...params };
  for (const [k, v] of Object.entries(all)) url.searchParams.set(k, v);
  const items = [];
  for (let page = 0; page < 5; page++) {
    url.searchParams.set("page", String(page));
    const res = await fetch(url, {
      headers: { "HH-User-Agent": USER_AGENT, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`hh.ru ${res.status} for ${url.search}: ${text.slice(0, 300)}`);
    }
    const body = await res.json();
    items.push(...body.items);
    if (page + 1 >= body.pages) break;
    await sleep(300);
  }
  return items;
}

const INTERN_RE = /стаж[её]р|стажир|intern|trainee|практикант/i;
const JUNIOR_RE = /junior|младш|джуниор/i;

function workFormat(v) {
  const ids = (v.work_format || []).map((f) => f.id);
  if (ids.includes("REMOTE") || v.schedule?.id === "remote") return "Remote";
  if (ids.includes("HYBRID")) return "Hybrid";
  return "Office";
}

function normalize(v) {
  const tags = [];
  if (INTERN_RE.test(v.name)) tags.push("Internship");
  if (JUNIOR_RE.test(v.name)) tags.push("Junior");
  if (v.experience?.id === "noExperience") tags.push("No experience");
  return {
    id: `hh-${v.id}`,
    title: v.name,
    company: v.employer?.name || "Company not specified",
    logo: v.employer?.logo_urls?.["90"] || null,
    city: v.area?.name || "",
    published_at: v.published_at,
    salary: v.salary ? { from: v.salary.from, to: v.salary.to, currency: v.salary.currency } : null,
    format: workFormat(v),
    tags,
    url: v.alternate_url,
    source: "hh.kz",
  };
}

async function readManual() {
  try {
    const list = JSON.parse(await readFile(MANUAL, "utf8"));
    return list.map((v, i) => ({ id: `manual-${i}`, tags: [], format: "Office", source: "Added by teacher", ...v }));
  } catch {
    return [];
  }
}

async function main() {
  const token = await getToken();
  const manual = await readManual();
  const byId = new Map();
  let hhOk = false;

  if (!token) {
    console.warn("No HeadHunter credentials set (HH_APP_TOKEN or HH_CLIENT_ID/HH_CLIENT_SECRET). Only manual vacancies will be published.");
  } else {
    for (const term of TERMS) {
      const runs = [
        { text: term, search_field: "name", experience: "noExperience" },
        { text: `(${term}) AND (${ENTRY_WORDS})`, search_field: "name" },
      ];
      for (const params of runs) {
        const items = await search(token, params);
        for (const v of items) if (!v.archived) byId.set(v.id, v);
        await sleep(300);
      }
    }
    hhOk = true;
  }

  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const vacancies = [...[...byId.values()].map(normalize), ...manual]
    .filter((v) => v.url && Date.parse(v.published_at) >= cutoff)
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));

  // If hh.ru failed or isn't configured, keep the previous hh data instead of wiping the page.
  if (!hhOk) {
    try {
      const prev = JSON.parse(await readFile(OUT, "utf8"));
      const prevHh = (prev.vacancies || []).filter((v) => v.source === "hh.kz" && Date.parse(v.published_at) >= cutoff);
      vacancies.push(...prevHh);
      vacancies.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
    } catch {}
  }

  const out = { updated_at: new Date().toISOString(), live: hhOk, count: vacancies.length, vacancies };
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`Saved ${vacancies.length} vacancies (${byId.size} from hh.kz, ${manual.length} manual).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
