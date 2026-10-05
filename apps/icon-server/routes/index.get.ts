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
    "EVE Online icons, renders and blueprint images by type or icon ID — a CORS-enabled alternative to images.evetech.net.",
  notes:
    "Every image endpoint accepts a power-of-two ?size= between 32 and 1024; omit it for the image's native size. All responses are CORS-enabled for use from any origin.",
};

/** The `?size=` explanation, shown as the size pill's tooltip (HTML). */
const SIZE_TIP_HTML =
  "Every image endpoint accepts a power-of-two <code>?size=</code> between 32 and 1024. Omit it for the image's native size.";

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
    (g) => `<a class="tile panel" href="${esc(g.href)}" title="${esc(g.href)}">
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
    return `<article class="card panel">
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
<title>JitaSpace Icon Server</title>
<meta name="description" content="${esc(SERVICE.description)}">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Rajdhani:wght@500;600;700&display=swap">
<style>
/* Mirrors the JitaSpace web app's "EVE v2" theme (apps/web/themes/eve-v2.ts). */
*,*::before,*::after{box-sizing:border-box}
:root{
  --bg:#07090f; --bg-2:#0d0f17;
  --text:#d5d7e0; --muted:#868b9a; --faint:#5f6678;
  --eve:#446a79; --eve-hi:#618999;
  --caldari:#3fa9ca; --gold:#c5983d;
  --brd:rgba(108,132,151,.28); --brd-top:rgba(147,214,224,.46); --brd-hi:rgba(63,169,202,.55);
  --panel:linear-gradient(180deg,rgba(26,33,45,.9) 0%,rgba(13,18,28,.93) 58%,rgba(8,11,18,.96) 100%);
  --panel-shadow:inset 0 1px 0 rgba(182,210,230,.12),inset 0 -10px 18px rgba(2,8,16,.35),0 10px 22px rgba(0,0,0,.36);
  --radius:2px;
  --sans:"Rajdhani","Inter","Segoe UI",sans-serif;
  --mono:"JetBrains Mono","SFMono-Regular",ui-monospace,monospace;
}
html{color-scheme:dark}
body{
  margin:0;min-height:100vh;color:var(--text);font-family:var(--sans);font-size:16px;line-height:1.55;
  -webkit-font-smoothing:antialiased;
  background:radial-gradient(1000px 520px at 50% -10%,rgba(68,106,121,.22),transparent 62%),var(--bg);
  background-attachment:fixed;
}
a{color:inherit;text-decoration:none}
.panel{background:var(--panel);border:1px solid var(--brd);border-top-color:var(--brd-top);border-radius:var(--radius);box-shadow:var(--panel-shadow)}
header{border-bottom:1px solid var(--brd);background:rgba(7,9,15,.82);backdrop-filter:blur(6px)}
.bar{max-width:960px;height:60px;margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:12px}
.bar img{width:32px;height:32px;display:block}
.bar .name{font-weight:700;font-size:1.25rem;letter-spacing:.02em;color:#f2f7fb}
.bar .sub{font-family:var(--mono);font-size:.8rem;color:var(--muted);padding-left:12px;border-left:1px solid var(--brd)}
.wrap{max-width:960px;margin:0 auto;padding:28px 20px 64px}
.lead{margin:0 0 16px;font-size:1.125rem;font-weight:500;color:var(--text)}
.lead a{color:var(--caldari)}
.lead a:hover{text-decoration:underline}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:32px}
.pill{position:relative;font-family:var(--mono);font-size:.75rem;color:var(--text);background:rgba(68,106,121,.18);
  border:1px solid var(--brd);border-radius:var(--radius);padding:4px 10px;white-space:nowrap}
.pill b{color:var(--gold);font-weight:600}
.pill[aria-describedby]{cursor:help;border-style:dashed}
.pill[aria-describedby]:hover,.pill[aria-describedby]:focus-visible{border-color:var(--brd-hi);border-style:solid}
.tip{position:absolute;left:0;top:calc(100% + 8px);z-index:10;width:max-content;max-width:min(320px,80vw);
  white-space:normal;font-family:var(--sans);font-size:.875rem;font-weight:500;line-height:1.35;color:#f2f7fb;
  background:#21283c;border:1px solid var(--brd);border-radius:var(--radius);padding:6px 10px;
  box-shadow:0 8px 24px rgba(1,10,20,.64);opacity:0;visibility:hidden;transform:translateY(-2px);
  transition:opacity .12s,transform .12s,visibility .12s}
.tip code{font-family:var(--mono);font-size:.8em;color:var(--gold);white-space:nowrap}
.pill:hover .tip,.pill:focus-visible .tip{opacity:1;visibility:visible;transform:none}
h2{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:0 0 12px}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:12px;margin-bottom:36px}
.tile{display:flex;flex-direction:column;gap:8px;padding:12px;transition:border-color .15s}
.tile:hover{border-color:var(--brd-hi)}
.tile-img{position:relative;display:grid;place-items:center;aspect-ratio:1;border-radius:var(--radius);overflow:hidden;background:var(--bg)}
.tile-img img{max-width:100%;max-height:100%;display:block}
.tile-cap{font-family:var(--mono);font-size:.72rem;color:var(--muted);text-align:center}
.fallback{display:none;align-items:center;justify-content:center;position:absolute;inset:0;font-family:var(--mono);font-size:.68rem;color:var(--faint)}
.cards{display:grid;gap:12px}
.card{display:flex;gap:16px;align-items:flex-start;padding:16px;transition:border-color .15s}
.card:hover{border-color:var(--brd-hi)}
.thumb{flex:0 0 80px;width:80px;height:80px;position:relative;display:grid;place-items:center;border-radius:var(--radius);overflow:hidden;background:var(--bg)}
.thumb img{max-width:76%;max-height:76%;display:block}
.thumb--code code{font-family:var(--mono);font-size:.66rem;color:var(--caldari);padding:0 6px;text-align:center;word-break:break-all}
.card-body{flex:1;min-width:0}
.sig{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px}
.method{font-family:var(--mono);font-size:.68rem;font-weight:600;letter-spacing:.06em;color:#f2f7fb;background:var(--eve);border-radius:var(--radius);padding:2px 7px}
.path{font-family:var(--mono);font-size:.95rem;color:#f2f7fb;word-break:break-word}
.path .seg{color:var(--gold)}
.desc{margin:0 0 10px;font-size:1rem;color:var(--muted)}
.eg{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:.8rem;color:var(--caldari);
  border:1px solid var(--brd);border-radius:var(--radius);padding:3px 9px;transition:border-color .15s,background .15s}
.eg:hover{border-color:var(--brd-hi);background:rgba(63,169,202,.08)}
footer{margin-top:40px;padding-top:18px;border-top:1px solid var(--brd);font-size:.9rem;color:var(--faint)}
footer a{color:var(--caldari)}
footer a:hover{text-decoration:underline}
:focus-visible{outline:2px solid var(--caldari);outline-offset:2px}
@media(max-width:560px){
  .bar .sub{display:none}
  .card{gap:12px;padding:12px}
  .thumb{flex-basis:60px;width:60px;height:60px}
}
</style>
</head>
<body>
<header>
  <div class="bar">
    <a href="https://www.jita.space" aria-label="JitaSpace"><img src="/logo.png" alt="" width="32" height="32"></a>
    <span class="name">JitaSpace</span>
    <span class="sub">icon-server</span>
  </div>
</header>
<main class="wrap">
  <p class="lead">EVE Online icons, renders and blueprint images by type or icon ID — a CORS-enabled alternative to <a href="https://images.evetech.net">images.evetech.net</a>.</p>

  <div class="pills">
    <span class="pill">Any origin · <b>CORS</b></span>
    <span class="pill">PNG &amp; JPEG</span>
    <span class="pill" tabindex="0" aria-describedby="size-tip"><b>?size=</b> 32–1024<span class="tip" role="tooltip" id="size-tip">${SIZE_TIP_HTML}</span></span>
  </div>

  <h2>Live preview</h2>
  <section class="gallery">
${tiles}
  </section>

  <h2>Endpoints</h2>
  <section class="cards">
${cards}
  </section>

  <footer>Part of <a href="https://www.jita.space">JitaSpace</a>.</footer>
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
