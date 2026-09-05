/**
 * Generates the OpenGraph card shown when a JitaSpace link is pasted into
 * Discord, Slack, WhatsApp, Twitter, etc.
 *
 * Every page passes what it already loaded in `generateMetadata` (see
 * `lib/metadata.ts`) as query params, so this route never does a data fetch of
 * its own — it only lays out text plus, optionally, one image from the EVE CDN.
 *
 * NOTE: this uses Next's built-in `next/og`, NOT the standalone `@vercel/og`
 * package. An earlier iteration of a site-wide card was removed because
 * `@vercel/og`'s native module failed to bundle and 500'd in production; the
 * first-party export has no such dependency.
 */

import { ImageResponse } from "next/og";

import type { OgCardParams } from "~/lib/og";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, parseOgImageParams } from "~/lib/og";

// Matches the app's dark chrome (`themes/index.ts` eve panel + manifest
// theme_color) so a shared link looks like the page it opens.
const BACKGROUND = "#04070c";
const PANEL_EDGE = "rgba(147, 214, 224, 0.28)";
const ACCENT = "#93d6e0";
const TEXT = "#f1f5f9";
const MUTED = "#94a3b8";

/**
 * Cards are pure functions of the query string, so they're safe to cache hard.
 * Crawlers refetch og:image on every unfurl; without this each paste of a
 * popular link would re-render the card.
 */
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, immutable";

/**
 * Long EVE names (station names run 60+ characters) step down a size rather
 * than being ellipsised, so the whole name still fits the card.
 */
function titleFontSize(title: string): number {
  if (title.length > 42) return 54;
  if (title.length > 26) return 68;
  return 82;
}

function Card({
  title,
  subtitle,
  badge,
  image,
  facts = [],
}: Readonly<OgCardParams>) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BACKGROUND,
        backgroundImage: `radial-gradient(1100px 620px at 12% -10%, rgba(84, 194, 201, 0.16), rgba(4, 7, 12, 0) 60%), linear-gradient(160deg, #0b1220 0%, #04070c 55%, #01030a 100%)`,
        padding: "60px 68px",
        fontFamily: "sans-serif",
        color: TEXT,
      }}
    >
      {/* Brand row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 12,
            background: ACCENT,
            boxShadow: `0 0 22px ${ACCENT}`,
          }}
        />
        <div
          style={{
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          Jitaspace
        </div>
      </div>

      {/* Body: text on the left, entity artwork on the right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 56,
          flex: 1,
          paddingTop: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
          }}
        >
          {badge ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                border: `1px solid ${PANEL_EDGE}`,
                borderRadius: 6,
                padding: "7px 16px",
                marginBottom: 22,
                fontSize: 22,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: ACCENT,
                background: "rgba(84, 194, 201, 0.08)",
              }}
            >
              {badge}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              fontSize: titleFontSize(title),
              lineHeight: 1.1,
              color: TEXT,
            }}
          >
            {title}
          </div>

          {subtitle ? (
            <div
              style={{
                display: "flex",
                marginTop: 20,
                fontSize: 28,
                lineHeight: 1.35,
                color: MUTED,
              }}
            >
              {subtitle}
            </div>
          ) : null}

          {facts.length ? (
            <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    border: `1px solid ${PANEL_EDGE}`,
                    borderRadius: 8,
                    padding: "12px 18px",
                    background: "rgba(13, 18, 28, 0.75)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: MUTED,
                    }}
                  >
                    {fact.label}
                  </div>
                  <div style={{ fontSize: 26, color: TEXT }}>{fact.value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {image ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 300,
              height: 300,
              flexShrink: 0,
              borderRadius: 16,
              border: `1px solid ${PANEL_EDGE}`,
              background: "rgba(8, 11, 17, 0.9)",
              boxShadow: "0 18px 50px rgba(0, 0, 0, 0.55)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders raw <img>; next/image has no meaning here. */}
            <img
              src={image}
              alt=""
              width={268}
              height={268}
              style={{ objectFit: "contain", borderRadius: 10 }}
            />
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `1px solid ${PANEL_EDGE}`,
          paddingTop: 22,
          fontSize: 24,
          color: MUTED,
        }}
      >
        <div style={{ display: "flex" }}>jita.space</div>
        <div style={{ display: "flex" }}>EVE Online companion app</div>
      </div>
    </div>
  );
}

export function GET(request: Request) {
  const params = parseOgImageParams(new URL(request.url).searchParams);

  // A card with no title would render as empty chrome — worse than no card at
  // all, since crawlers would still show it. Let those unfurl text-only.
  if (!params.title) {
    return new Response("Missing title", { status: 400 });
  }

  // A failed artwork fetch does NOT reach this catch — satori resolves images
  // while streaming the body and simply leaves the frame empty, which is why
  // callers resolve the variation up front (`resolveTypeImage`) instead of
  // guessing. This guards layout errors during construction.
  try {
    return new ImageResponse(<Card {...params} />, {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch {
    return new Response("Failed to render card", { status: 500 });
  }
}
