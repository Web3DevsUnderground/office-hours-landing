// Shared Notion helpers for the Office Hours booking API.
// Env: NOTION_TOKEN (internal integration secret, shared with both databases below).
const NOTION = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

const HOSTS_DB = "319c5e73cce44a06b1f3b96cc0c3c5bb";        // 🎤 Office Hours Hosts
const APPLICATIONS_DB = "0f4c6a52deee4ead8472e7a93aef2406"; // 📋 Office Hours Applications

const EVENT_DATE = "2026-10-25";     // Sunday
const TZ_OFFSET = "+02:00";          // Israel is on IST (UTC+2) on 25 Oct 2026 — clocks go back the night before
const SLOT_MINUTES = 20;

async function notion(path, body, method = "POST") {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw Object.assign(new Error("NOTION_TOKEN is not set"), { status: 503, code: "not_configured" });
  const res = await fetch(NOTION + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": VERSION, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.message || "Notion error"), { status: res.status, code: json.code });
  return json;
}

const text = (p) => (p?.rich_text || p?.title || []).map((t) => t.plain_text).join("");
const multi = (p) => (p?.multi_select || []).map((o) => o.name);

function slugify(s) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

// "14:00-15:00" -> ["14:00-14:20","14:20-14:40","14:40-15:00"]
function blockToSlots(block) {
  const m = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(block.trim());
  if (!m) return [];
  const start = +m[1] * 60 + +m[2], end = +m[3] * 60 + +m[4];
  const out = [];
  for (let t = start; t + SLOT_MINUTES <= end; t += SLOT_MINUTES) {
    const f = (x) => String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(x % 60).padStart(2, "0");
    out.push(`${f(t)}-${f(t + SLOT_MINUTES)}`);
  }
  return out;
}

function slotStartISO(slot) {
  const hhmm = slot.split("-")[0];
  return `${EVENT_DATE}T${hhmm}:00${TZ_OFFSET}`;
}

function calendarLink(slot, hostName) {
  // Google Calendar template link; times converted to UTC (IST = UTC+2 on the day).
  const [a, b] = slot.split("-");
  const toUTC = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(Date.UTC(2026, 9, 25, h - 2, m, 0));
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  };
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `Office Hours 1:1 with ${hostName} — Web3 Devs Underground`,
    dates: `${toUTC(a)}/${toUTC(b)}`,
    details: "20-minute 1:1 at Startup Nation Central, Lilienblum 28, Tel Aviv. Come a few minutes early — slots run back to back.",
    location: "Startup Nation Central, Lilienblum St 28, Tel Aviv-Yafo",
  });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}

async function fetchPublishedHosts() {
  const res = await notion(`/databases/${HOSTS_DB}/query`, {
    filter: { and: [
      { property: "Status", select: { equals: "Approved" } },
      { property: "Published", checkbox: { equals: true } },
    ] },
    sorts: [{ property: "Sort Order", direction: "ascending" }],
    page_size: 50,
  });
  return res.results.map((pg) => {
    const p = pg.properties;
    const name = text(p["Name"]);
    return {
      id: pg.id,
      name,
      slug: text(p["Slug"]) || slugify(name),
      role: text(p["Role"]),
      company: text(p["Company"]),
      bio: text(p["Bio"]),
      pitch: text(p["One-line pitch"]),
      topics: multi(p["Topics"]),
      who: multi(p["Who should book"]),
      languages: multi(p["Languages"]),
      remoteOk: !!p["Remote OK"]?.checkbox,
      maxBookings: p["Max Bookings"]?.number ?? null,
      photo: p["Photo URL"]?.url || null,
      linkedin: p["LinkedIn"]?.url || null,
      availability: multi(p["Availability"]).sort(),
    };
  });
}

// Slots already held for a host (Pending or Approved). Declined slots are free again.
async function fetchHeldSlots(hostPageId) {
  const res = await notion(`/databases/${APPLICATIONS_DB}/query`, {
    filter: { and: [
      { property: "Host", relation: { contains: hostPageId } },
      { property: "Decision", select: { does_not_equal: "Declined" } },
    ] },
    page_size: 100,
  });
  return res.results.map((pg) => text(pg.properties["Slot"])).filter(Boolean);
}

module.exports = { notion, text, multi, slugify, blockToSlots, slotStartISO, calendarLink, fetchPublishedHosts, fetchHeldSlots, APPLICATIONS_DB, HOSTS_DB, EVENT_DATE };
