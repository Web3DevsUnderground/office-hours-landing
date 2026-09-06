# Mid-Chain Office Hours Day — landing page

Static, self-contained page (`index.html`). Source of truth for edits: the `HOSTS` list and two flags at the top of the `<script>` block.

- `published: true` on a host → their card renders (set only after the host confirmed text + Consent ✓ in Notion 🎤 Office Hours Hosts).
- `APPLICATIONS_OPEN = true` → cards link to the booking site (officehours.web3devs.org). Flip when ≥4 hosts are Approved + Published.

Every push to `main` deploys to Vercel. Versioned copy of each release lives in the Web3 Devs Underground Cowork project (`events/Office-Hours-Landing-Page-vX.Y.html`).
