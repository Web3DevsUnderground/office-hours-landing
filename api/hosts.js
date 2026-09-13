// GET /api/hosts            -> all published hosts with open slots
// GET /api/hosts?slug=x     -> one host
const { fetchPublishedHosts, fetchHeldSlots, blockToSlots } = require("./_notion");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  try {
    const hosts = await fetchPublishedHosts();
    const slug = (req.query && req.query.slug) || null;
    const wanted = slug ? hosts.filter((h) => h.slug === slug) : hosts;
    if (slug && wanted.length === 0) return res.status(404).json({ error: "host_not_found" });
    const out = [];
    for (const h of wanted) {
      const held = await fetchHeldSlots(h.id);
      const all = h.availability.flatMap(blockToSlots);
      const open = all.filter((s) => !held.includes(s));
      const capReached = h.maxBookings != null && held.length >= h.maxBookings;
      const { id, ...pub } = h;
      out.push({ ...pub, slots: all, openSlots: capReached ? [] : open, capReached });
    }
    res.status(200).json({ hosts: out });
  } catch (e) {
    res.status(e.status === 503 ? 503 : 500).json({ error: e.code || "error", message: e.message });
  }
};
