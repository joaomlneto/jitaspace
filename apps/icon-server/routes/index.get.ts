import { defineEventHandler, getHeader, setResponseHeader } from "h3";

/**
 * Service overview for `GET /`.
 *
 * Browsers (Accept: text/html) get a styled landing page that previews real
 * images served by this service; everything else (curl, fetch, …) gets the same
 * information as JSON. Kept static either way, so hitting `/` never fetches an
 * image itself — the previews are ordinary requests the browser makes to the
 * image routes.
 */

interface Endpoint {
  /** Path template, e.g. `/types/{typeId}/icon`. */
  path: string;
  /** One-line summary used for the JSON response and the card body. */
  description: string;
  /** A working example URL. */
  example: string;
  /** A live preview image to show on the card (omit for the JSON route). */
  preview?: string;
  /** Shown instead of a preview when there is none (e.g. a JSON sample). */
  sample?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    path: "/icons/{iconId}",
    description: "Image for an EVE icon ID.",
    example: "/icons/22",
    preview: "/icons/22?size=128",
  },
  {
    path: "/types/{typeId}",
    description:
      'The image variations available for a type, as a JSON array — e.g. ["icon"], ["icon","render"], or ["bp","bpc"]. 404 when a type has none.',
    example: "/types/587",
    sample: '["icon","render"]',
  },
  {
    path: "/types/{typeId}/icon",
    description:
      "Icon for a type. Tech II, faction and officer items carry their meta-group tier badge — pass ?badge=0 for the bare icon. SKINs resolve to their material icon, and ships & structures fall back to their render icon.",
    example: "/types/36/icon",
    preview: "/types/36/icon?size=128",
  },
  {
    path: "/types/{typeId}/render",
    description:
      "3D render of a type — ships, structures, drones, and the like. JPEG, 512px by default. Types with no render (e.g. modules) return 404.",
    example: "/types/587/render",
    preview: "/types/587/render?size=256",
  },
  {
    path: "/types/{typeId}/bp",
    description: "Blueprint-original image for a type. 404 for non-blueprints.",
    example: "/types/691/bp",
    preview: "/types/691/bp?size=128",
  },
  {
    path: "/types/{typeId}/bpc",
    description: "Blueprint-copy image for a type. 404 for non-blueprints.",
    example: "/types/691/bpc",
    preview: "/types/691/bpc?size=128",
  },
];

const SERVICE = {
  service: "@jitaspace/icon-server",
  description:
    "An HTTP API for EVE Online imagery — type icons, 3D renders and blueprints, addressable by type ID or icon ID.",
  notes:
    "Every image endpoint accepts a power-of-two ?size= between 32 and 1024; omit it for the image's native size. All responses are CORS-enabled for use from any origin.",
};

/** A curated set of live previews for the hero strip. */
const GALLERY: { src: string; href: string; label: string }[] = [
  {
    src: "/types/587/render?size=256",
    href: "/types/587/render",
    label: "render",
  },
  { src: "/types/36/icon?size=256", href: "/types/36/icon", label: "icon" },
  { src: "/icons/22?size=256", href: "/icons/22", label: "icon ID" },
  { src: "/types/691/bp?size=256", href: "/types/691/bp", label: "blueprint" },
  { src: "/types/691/bpc?size=256", href: "/types/691/bpc", label: "copy" },
];

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Highlight `{param}` segments within a path template. */
const fmtPath = (path: string): string =>
  esc(path).replace(/\{[^}]+\}/g, (m) => `<span class="seg">${m}</span>`);

/** Hide a broken preview and reveal its text fallback instead of a broken icon. */
const ON_ERR =
  "this.style.display='none';this.nextElementSibling.style.display='flex'";

function renderHtml(): string {
  const tiles = GALLERY.map(
    (g) => `<a class="tile" href="${esc(g.href)}" title="${esc(g.href)}">
      <span class="tile-img"><img src="${esc(g.src)}" alt="${esc(g.label)} preview" loading="lazy" decoding="async" onerror="${ON_ERR}"><span class="fallback">${esc(g.label)}</span></span>
      <span class="tile-cap">${esc(g.label)}</span>
    </a>`,
  ).join("\n");

  const cards = ENDPOINTS.map((e) => {
    const thumb = e.preview
      ? `<a class="thumb" href="${esc(e.example)}" aria-hidden="true" tabindex="-1">
          <img src="${esc(e.preview)}" alt="" loading="lazy" decoding="async" onerror="${ON_ERR}"><span class="fallback">img</span>
        </a>`
      : `<div class="thumb thumb--code"><code>${esc(e.sample ?? "[…]")}</code></div>`;
    return `<article class="card">
      ${thumb}
      <div class="card-body">
        <div class="sig"><span class="method">GET</span><span class="path">${fmtPath(e.path)}</span></div>
        <p class="desc">${esc(e.description)}</p>
        <a class="eg" href="${esc(e.example)}"><span class="arrow">↗</span>${esc(e.example)}</a>
      </div>
    </article>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(SERVICE.service)}</title>
<meta name="description" content="${esc(SERVICE.description)}">
<style>
*,*::before,*::after{box-sizing:border-box}
:root{
  --bg:#05070d;
  --text:#dce7f6; --muted:#8295b2; --faint:#5d6e8c;
  --cyan:#5cc8ff; --amber:#ffc24b;
  --panel:rgba(146,180,224,.045); --brd:rgba(120,180,255,.14); --brd-hi:rgba(120,200,255,.34);
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;
}
html{color-scheme:dark}
body{
  margin:0;min-height:100vh;color:var(--text);font-family:var(--sans);line-height:1.55;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
  background:
    radial-gradient(1100px 560px at 50% -12%, rgba(38,124,194,.20), transparent 60%),
    radial-gradient(820px 480px at 88% 6%, rgba(255,160,40,.07), transparent 55%),
    var(--bg);
  background-attachment:fixed;
}
a{color:inherit;text-decoration:none}
.wrap{max-width:960px;margin:0 auto;padding:60px 22px 84px}
.brand{display:flex;align-items:center;gap:13px;margin-bottom:30px}
.brand .name{font-family:var(--mono);font-size:.92rem;letter-spacing:.04em;color:var(--muted)}
.brand .name b{color:var(--text);font-weight:600}
.kicker{font-family:var(--mono);font-size:.72rem;letter-spacing:.32em;text-transform:uppercase;color:var(--cyan);opacity:.85;margin:0 0 14px}
h1{margin:0 0 18px;font-size:clamp(2rem,5.2vw,3.1rem);line-height:1.05;letter-spacing:-.02em;font-weight:680;
   background:linear-gradient(96deg,#fff 14%,#bfe2ff 52%,#ffd98a 104%);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{max-width:62ch;margin:0 0 26px;font-size:1.075rem;color:var(--muted)}
.pills{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:46px}
.pill{font-family:var(--mono);font-size:.74rem;color:var(--text);background:var(--panel);
  border:1px solid var(--brd);border-radius:999px;padding:6px 13px;white-space:nowrap}
.pill b{color:var(--amber);font-weight:600}
h2{font-size:.78rem;letter-spacing:.22em;text-transform:uppercase;color:var(--faint);font-weight:600;margin:0 0 18px}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:14px;margin-bottom:54px}
.tile{display:flex;flex-direction:column;gap:9px;padding:14px;border:1px solid var(--brd);border-radius:14px;
  background:var(--panel);transition:border-color .18s,transform .18s,box-shadow .18s}
.tile:hover{border-color:var(--brd-hi);transform:translateY(-3px);box-shadow:0 14px 34px -22px rgba(92,200,255,.6)}
.tile-img{position:relative;display:grid;place-items:center;aspect-ratio:1;border-radius:9px;overflow:hidden;
  background:
    linear-gradient(135deg,rgba(120,180,255,.08),rgba(255,180,60,.05)),
    repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0 9px,transparent 9px 18px),#070b14}
.tile-img img{max-width:100%;max-height:100%;display:block}
.tile-cap{font-family:var(--mono);font-size:.72rem;color:var(--muted);text-align:center}
.fallback{display:none;align-items:center;justify-content:center;position:absolute;inset:0;
  font-family:var(--mono);font-size:.68rem;color:var(--faint)}
.cards{display:grid;gap:14px}
.card{display:flex;gap:18px;align-items:flex-start;padding:18px;border:1px solid var(--brd);border-radius:15px;
  background:var(--panel);transition:border-color .18s,box-shadow .18s}
.card:hover{border-color:var(--brd-hi);box-shadow:0 16px 40px -30px rgba(92,200,255,.55)}
.thumb{flex:0 0 84px;width:84px;height:84px;position:relative;display:grid;place-items:center;border-radius:11px;overflow:hidden;
  background:
    linear-gradient(135deg,rgba(120,180,255,.08),rgba(255,180,60,.05)),
    repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0 9px,transparent 9px 18px),#070b14}
.thumb img{max-width:76%;max-height:76%;display:block}
.thumb--code{font-family:var(--mono)}
.thumb--code code{font-size:.66rem;color:var(--cyan);padding:0 6px;text-align:center;word-break:break-all}
.card-body{flex:1;min-width:0}
.sig{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:7px}
.method{font-family:var(--mono);font-size:.66rem;letter-spacing:.08em;font-weight:700;color:#06121d;
  background:linear-gradient(180deg,#7dd6ff,#37a6e6);border-radius:6px;padding:3px 8px}
.path{font-family:var(--mono);font-size:.98rem;color:var(--text);word-break:break-word}
.path .seg{color:var(--amber)}
.desc{margin:0 0 11px;font-size:.92rem;color:var(--muted)}
.eg{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:.8rem;color:var(--cyan);
  border:1px solid var(--brd);border-radius:8px;padding:5px 11px;transition:border-color .16s,background .16s}
.eg:hover{border-color:var(--brd-hi);background:rgba(92,200,255,.07)}
.eg .arrow{opacity:.7}
footer{margin-top:56px;padding-top:24px;border-top:1px solid var(--brd);font-size:.84rem;color:var(--faint)}
footer a{color:var(--muted);border-bottom:1px solid transparent;transition:color .16s,border-color .16s}
footer a:hover{color:var(--cyan);border-color:var(--brd-hi)}
:focus-visible{outline:2px solid var(--cyan);outline-offset:3px;border-radius:6px}
@media(max-width:560px){
  .card{gap:14px;padding:15px}
  .thumb{flex-basis:64px;width:64px;height:64px}
}
</style>
</head>
<body>
<main class="wrap">
  <div class="brand">
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#5cc8ff"/><stop offset="1" stop-color="#ffc24b"/>
      </linearGradient></defs>
      <polygon points="16,2.6 27.6,9.3 27.6,22.7 16,29.4 4.4,22.7 4.4,9.3" fill="none" stroke="url(#m)" stroke-width="1.6"/>
      <circle cx="16" cy="16" r="3.2" fill="#ffc24b"/>
      <circle cx="27.6" cy="9.3" r="1.7" fill="#5cc8ff"/>
    </svg>
    <span class="name"><b>jitaspace</b> / icon-server</span>
  </div>

  <p class="kicker">EVE Online Image API</p>
  <h1>Every icon in New Eden,<br>one request away.</h1>
  <p class="lead">${esc(SERVICE.description)}</p>

  <div class="pills">
    <span class="pill">Any origin · <b>CORS</b></span>
    <span class="pill">PNG &amp; JPEG</span>
    <span class="pill"><b>?size=</b> 32–1024</span>
    <span class="pill">By type ID &amp; icon ID</span>
  </div>

  <h2>Live preview</h2>
  <section class="gallery">
${tiles}
  </section>

  <h2>Endpoints</h2>
  <section class="cards">
${cards}
  </section>

  <footer>
    ${esc(SERVICE.notes)}<br>
    Part of the <a href="https://jita.space">JitaSpace</a> project.
  </footer>
</main>
</body>
</html>`;
}

// Short browser cache so doc updates show quickly, with a longer shared/edge
// cache and a day of stale-while-revalidate behind it.
const OVERVIEW_CACHE_CONTROL =
  "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400";

export default defineEventHandler((event) => {
  const accept = getHeader(event, "accept") ?? "";
  setResponseHeader(event, "Cache-Control", OVERVIEW_CACHE_CONTROL);

  // Browsers ask for HTML; programmatic clients (curl, fetch) get JSON.
  if (accept.includes("text/html")) {
    setResponseHeader(event, "Content-Type", "text/html; charset=utf-8");
    return renderHtml();
  }

  return {
    ...SERVICE,
    routes: Object.fromEntries(
      ENDPOINTS.map((e) => [`GET ${e.path}`, e.description]),
    ),
  };
});
