export const SITE_STYLES = `
:root {
  color-scheme: dark;
  --bg: #0b0a08;
  --bg-soft: #14120d;
  --bg-elev: #1c1913;
  --bg-hero: #100e0a;
  --ink: #f4efe6;
  --muted: #9c9486;
  --faint: #6f685c;
  --line: rgba(244, 239, 230, 0.1);
  --line-strong: rgba(244, 239, 230, 0.18);
  --gold: #c9a66b;
  --gold-soft: rgba(201, 166, 107, 0.14);
  --danger: #d4654f;
  --ok: #8aa67a;
  --shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  --sans: "IBM Plex Sans", "Source Han Sans SC", "Noto Sans SC", ui-sans-serif, system-ui, sans-serif;
  --serif: "Fraunces", "Source Han Serif SC", "Songti SC", ui-serif, Georgia, serif;
  --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); }
body {
  min-height: 100vh;
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.6;
  letter-spacing: 0.01em;
}
a { color: inherit; text-decoration: none; }
a:hover { color: var(--gold); }
.shell { max-width: 1180px; margin: 0 auto; padding: 0 28px 80px; }
.topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
  padding: 18px 0 16px;
  background: color-mix(in oklab, var(--bg) 86%, transparent);
  backdrop-filter: blur(16px);
}
.topbar::after {
  content: "";
  position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--line-strong), transparent);
}
.brand { display: flex; flex-direction: column; gap: 2px; min-width: 140px; }
.brand-mark {
  font-family: var(--serif);
  font-size: 22px;
  font-weight: 560;
  letter-spacing: -0.03em;
  line-height: 1;
}
.brand-mark span { color: var(--gold); font-style: italic; font-weight: 500; }
.brand-sub { color: var(--faint); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; }
.nav { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.nav a, .lang-switch a {
  padding: 7px 12px;
  border-radius: 999px;
  color: var(--muted);
  border: 1px solid transparent;
  font-size: 13px;
}
.nav a:hover, .nav a.active, .lang-switch a.active, .lang-switch a:hover {
  color: var(--ink);
  background: var(--bg-elev);
  border-color: var(--line);
}
.lang-switch {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: #080705;
}
.lang-switch a { min-width: 44px; text-align: center; }
.hero { padding: 56px 0 28px; max-width: 760px; }
.eyebrow {
  color: var(--gold);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin: 0 0 14px;
}
h1, h2, h3 { font-family: var(--serif); font-weight: 560; letter-spacing: -0.03em; line-height: 1.15; }
h1 { font-size: clamp(40px, 6vw, 64px); margin: 0 0 16px; }
h2 { font-size: 28px; margin: 0; }
h3 { font-size: 20px; margin: 0 0 8px; }
.lede { font-size: 18px; color: var(--muted); max-width: 40rem; margin: 0 0 22px; }
.muted { color: var(--muted); }
.faint { color: var(--faint); }
.band {
  margin: 28px 0;
  padding: 22px 22px 24px;
  border-radius: 22px;
  border: 1px solid var(--line);
}
.band-search { background: linear-gradient(180deg, #1a160f 0%, #120f0b 100%); border-color: color-mix(in oklab, var(--gold) 28%, var(--line)); }
.band-stats { background: #0e1612; border-color: color-mix(in oklab, var(--ok) 28%, var(--line)); }
.band-caps { background: #10131a; border-color: rgba(140, 164, 196, 0.28); }
.band-featured { background: #18140c; border-color: color-mix(in oklab, var(--gold) 34%, var(--line)); }
.band-catalog { background: var(--bg-soft); }
.band-detail { background: var(--bg-hero); }
.section-head { display: flex; justify-content: space-between; align-items: end; gap: 16px; margin-bottom: 14px; }
.search-panel { display: flex; flex-direction: column; gap: 14px; }
.search-query {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px;
  gap: 10px;
}
.search-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 14px;
}
.search-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.search-field span {
  color: var(--faint);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.search-panel input, .search-panel select, .search-panel button, .copy {
  width: 100%;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px solid var(--line-strong);
  background: #080705;
  color: var(--ink);
  font: inherit;
}
.search-panel button, .copy {
  background: var(--gold);
  color: #1b140a;
  border-color: transparent;
  font-weight: 600;
  cursor: pointer;
}
.search-panel button:hover, .copy:hover { filter: brightness(1.05); }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.stat { padding: 16px 18px; background: rgba(8, 7, 5, 0.35); border: 1px solid var(--line); border-radius: 16px; }
.stat b { display: block; font-family: var(--serif); font-size: 28px; letter-spacing: -0.04em; }
.stat span { color: var(--muted); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.chip {
  display: inline-flex; align-items: center;
  padding: 8px 12px; border-radius: 999px; font-size: 13px; color: var(--muted);
  background: rgba(8, 7, 5, 0.28); border: 1px solid var(--line);
}
.chip:hover { color: var(--ink); border-color: var(--gold); background: var(--gold-soft); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.card {
  display: flex; flex-direction: column; gap: 8px;
  padding: 18px 18px 16px; min-height: 168px;
  background: #080705;
  border: 1px solid var(--line);
  border-radius: 18px;
  transition: transform .2s ease, border-color .2s ease, background .2s ease;
}
.card:hover { transform: translateY(-2px); border-color: color-mix(in oklab, var(--gold) 45%, var(--line)); background: var(--bg-elev); }
.card p { margin: 0; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.meta { display: flex; flex-wrap: wrap; gap: 8px; color: var(--faint); font-size: 12px; letter-spacing: 0.04em; }
.pill {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 999px;
  background: var(--gold-soft); color: var(--gold); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
}
.pill.blocked, .card.blocked { border-color: color-mix(in oklab, var(--danger) 50%, var(--line)); }
.pill.blocked { background: rgba(212, 101, 79, 0.12); color: var(--danger); }
.trust-featured { color: var(--gold); }
.trust-installable { color: var(--ok); }
.trust-blocked { color: var(--danger); }
.board-switch { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 22px; }
.board-switch a {
  padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line); color: var(--muted); background: var(--bg-soft);
}
.board-switch a.active, .board-switch a:hover { color: var(--ink); border-color: var(--gold); background: var(--gold-soft); }
.rank-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.rank-list li {
  display: grid; grid-template-columns: 48px 1fr auto; gap: 16px; align-items: center;
  padding: 14px 16px; border: 1px solid var(--line); border-radius: 16px; background: var(--bg-soft);
}
.rank-list b { font-family: var(--serif); font-size: 22px; color: var(--gold); font-weight: 500; }
.rank-list span { color: var(--muted); font-variant-numeric: tabular-nums; }
.install-box { padding: 18px; background: #100e0a; border: 1px solid var(--line); border-radius: 18px; }
.install-box pre {
  margin: 10px 0 0; padding: 14px 16px; overflow: auto;
  background: #080705; border-radius: 12px; border: 1px solid var(--line);
}
code, pre { font-family: var(--mono); font-size: 13px; }
.matrix { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.matrix div { padding: 14px 16px; border: 1px solid var(--line); border-radius: 14px; background: var(--bg-soft); }
.matrix small { display: block; color: var(--faint); letter-spacing: 0.08em; text-transform: uppercase; font-size: 11px; }
.pager { display: flex; gap: 8px; align-items: center; margin: 24px 0 0; }
.pager a, .pager span { padding: 8px 12px; border-radius: 10px; border: 1px solid var(--line); color: var(--muted); }
.pager a:hover { color: var(--ink); }
.notice {
  padding: 14px 16px; border-radius: 14px; border: 1px solid var(--line);
  background: var(--gold-soft); color: var(--ink); margin: 16px 0;
}
.notice.danger { background: rgba(212, 101, 79, 0.1); border-color: color-mix(in oklab, var(--danger) 40%, var(--line)); }
footer.site-foot {
  margin-top: 72px; padding-top: 22px; border-top: 1px solid var(--line);
  color: var(--faint); font-size: 13px;
}
.empty { padding: 36px 8px; color: var(--muted); }
@media (max-width: 860px) {
  .shell { padding: 0 18px 64px; }
  .search-query, .search-filters, .stats, .matrix { grid-template-columns: 1fr; }
  .topbar { flex-direction: column; align-items: flex-start; }
  h1 { font-size: 40px; }
}
`;
