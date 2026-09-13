// POST /api/apply  -> creates a row in 📋 Office Hours Applications (Decision = Pending) and holds the slot.
const { notion, fetchPublishedHosts, fetchHeldSlots, blockToSlots, slotStartISO, calendarLink, APPLICATIONS_DB } = require("./_notion");

const STAGES = ["Idea", "Building", "Live product", "Raising", "Researcher / Academic", "Student", "Other"];
const clean = (v, max = 500) => String(v ?? "").trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (b.website) return res.status(200).json({ ok: true }); // honeypot: bots fill it, humans never see it

    const slug = clean(b.host, 80), slot = clean(b.slot, 20);
    const name = clean(b.name, 120), email = clean(b.email, 200), discuss = clean(b.discuss, 1500);
    const company = clean(b.company, 200), role = clean(b.role, 120), linkedin = clean(b.linkedin, 300), phone = clean(b.phone, 40);
    const stage = STAGES.includes(b.stage) ? b.stage : "Other";
    const consent = b.consent === true || b.consent === "true" || b.consent === "on";

    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !discuss || !slot || !slug)
      return res.status(400).json({ error: "missing_fields" });
    if (!consent) return res.status(400).json({ error: "consent_required" });

    const host = (await fetchPublishedHosts()).find((h) => h.slug === slug);
    if (!host) return res.status(404).json({ error: "host_not_found" });
    if (!host.availability.flatMap(blockToSlots).includes(slot)) return res.status(400).json({ error: "bad_slot" });

    const held = await fetchHeldSlots(host.id);
    if (held.includes(slot)) return res.status(409).json({ error: "slot_taken" });
    if (host.maxBookings != null && held.length >= host.maxBookings) return res.status(409).json({ error: "host_full" });

    const props = {
      Name: { title: [{ text: { content: name } }] },
      Email: { email },
      Host: { relation: [{ id: host.id }] },
      Slot: { rich_text: [{ text: { content: slot } }] },
      "Slot Start": { date: { start: slotStartISO(slot) } },
      "Calendar Link": { url: calendarLink(slot, host.name) },
      Decision: { select: { name: "Pending" } },
      Stage: { select: { name: stage } },
      Consent: { checkbox: true },
      "What they want to discuss": { rich_text: [{ text: { content: discuss } }] },
    };
    if (company) props["Company / Project"] = { rich_text: [{ text: { content: company } }] };
    if (role) props["Role"] = { rich_text: [{ text: { content: role } }] };
    if (linkedin) props["LinkedIn"] = { url: /^https?:\/\//.test(linkedin) ? linkedin : "https://" + linkedin };
    if (phone) props["Phone"] = { phone_number: phone };

    await notion("/pages", { parent: { database_id: APPLICATIONS_DB }, properties: props });
    res.status(200).json({ ok: true, host: host.name, slot });
  } catch (e) {
    res.status(e.status === 503 ? 503 : 500).json({ error: e.code || "error", message: e.message });
  }
};
