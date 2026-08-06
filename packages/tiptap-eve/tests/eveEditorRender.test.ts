/**
 * @jest-environment jsdom
 *
 * Exercises the real editor extension set through the full parse→render
 * round-trip (`editor.getHTML()`), the path MailMessageViewer relies on. The
 * isolated fromEveColor unit tests never built an actual editor, so a color-less
 * <font> tag crashing renderHTML went unnoticed and broke the Description tab on
 * /type/44992 (PLEX) and any mail/bio using `<font size=...>` headers.
 */
import { Editor } from "@tiptap/core";

import {
  convertEveColorTags,
  convertEveMailLineBreaks,
  convertEveUrlTags,
  eveEditorExtensions,
} from "../index";

const renderToHtml = (content: string): string =>
  new Editor({ extensions: eveEditorExtensions, content }).getHTML();

// jsdom re-serializes inline styles ("font-size: 14pt;"), so drop whitespace
// before matching style declarations.
const stripWs = (s: string): string => s.replace(/\s+/g, "");

describe("eveEditorExtensions render round-trip", () => {
  it("renders a <font> tag with size but no color without throwing", () => {
    let html = "";
    expect(() => {
      html = renderToHtml('<font size="14"><b>Getting PLEX</b></font>');
    }).not.toThrow();
    expect(html).toContain("Getting PLEX");
    expect(stripWs(html)).toContain("font-size:14pt");
  });

  it("renders a <font> tag with color but no size", () => {
    const html = renderToHtml('<font color="0x0ff0000">danger</font>');
    expect(html).toContain("danger");
    // The original EVE color attribute round-trips and fromEveColor("0x0ff0000")
    // resolves to #ff0000 (jsdom serializes it as rgb(255, 0, 0)).
    expect(html).toContain('color="0x0ff0000"');
    expect(stripWs(html)).toContain("color:rgb(255,0,0)");
  });

  describe("EVE ARGB colors", () => {
    it("decodes a #AARRGGBB color instead of letting CSS read it as #RRGGBBAA", () => {
      // From the real PLEX description. EVE means opaque #3399cc; CSS reads the
      // raw value as rgba(255, 51, 153, 0.8) — hot pink.
      const html = renderToHtml('<font color="#ff3399cc">TIP</font>');
      expect(html).toContain("TIP");
      expect(stripWs(html)).toContain("color:rgb(51,153,204)");
      expect(stripWs(html)).not.toContain("rgba(255,51,153");
    });

    it("lets EVE's default body-text white inherit the theme color", () => {
      // #bfffffff is EVE's standard description/mail text color. Pinned to white
      // it is invisible on the light theme, so no `color` declaration is emitted.
      const html = renderToHtml('<font color="#bfffffff">body text</font>');
      expect(html).toContain("body text");
      expect(html).not.toContain("color: rgb(255, 255, 255)");
      expect(html).not.toContain("#bfffffff;");
    });

    it("still round-trips white through the color attribute for mail composition", () => {
      // htmlToEveMail reads the original EVE string off the `color` attribute, so
      // suppressing the CSS declaration must not make composed mail lossy.
      const html = renderToHtml('<font color="0xbfffffff">body text</font>');
      expect(html).toContain('color="0xbfffffff"');
    });

    it("keeps rendering a non-white color alongside a suppressed white one", () => {
      const html = renderToHtml(
        '<font color="#bfffffff">plain</font><font color="0x0ff0000">danger</font>',
      );
      expect(stripWs(html)).toContain("color:rgb(255,0,0)");
      expect(html).toContain("plain");
    });
  });

  it("clamps an oversized font-size to the maximum", () => {
    const html = renderToHtml('<font size="9999">huge</font>');
    expect(html).toContain("huge");
    expect(stripWs(html)).toContain("font-size:72pt");
    expect(stripWs(html)).not.toContain("font-size:9999pt");
  });

  describe("CSS injection hardening", () => {
    // `color`/`size` come from attacker-controlled EVE HTML (other players' mail
    // bodies, character bios). A crafted value must never break out of the CSS
    // declaration and inject page-wide styling or an external tracking request.
    const injectionMarkers = [
      "position",
      "background",
      "url(",
      "inset",
      "z-index",
      "fixed",
    ];

    it("strips a CSS breakout smuggled through the color attribute", () => {
      const html = renderToHtml(
        '<font color="blue;position:fixed;inset:0;z-index:99999;background:url(https://attacker/beacon)">x</font>',
      );
      expect(html).toContain("x");
      for (const marker of injectionMarkers) {
        expect(html).not.toContain(marker);
      }
    });

    it("strips a CSS breakout smuggled through the size attribute", () => {
      const html = renderToHtml(
        '<font size="14pt;position:fixed;top:0;background:red">x</font>',
      );
      expect(html).toContain("x");
      // Number.parseFloat("14pt;...") is 14, so a plain clamped size survives...
      expect(stripWs(html)).toContain("font-size:14pt");
      // ...but none of the injected declarations leak through.
      for (const marker of injectionMarkers) {
        expect(html).not.toContain(marker);
      }
    });

    it("still renders a legitimate size + EVE color correctly", () => {
      const html = renderToHtml('<font size="14" color="0x0FF0000">ok</font>');
      expect(html).toContain("ok");
      expect(stripWs(html)).toContain("font-size:14pt");
      // jsdom serializes #FF0000 as rgb(255, 0, 0).
      expect(stripWs(html)).toContain("color:rgb(255,0,0)");
    });
  });

  it("renders the PLEX description (mixed size-only and color-only fonts)", () => {
    // Trimmed, real ESI description for type 44992 — the content that crashed.
    const description =
      "PLEX is an item that can be traded between players on the market.\r\n\r\n" +
      '<font size="14"><b>Getting PLEX</b></font>\r\n' +
      "PLEX can be purchased on the market for ISK, or securely on " +
      "<url=https://store.eveonline.com/#plex>https://store.eveonline.com/#plex</url>.\r\n\r\n" +
      '<font color="#ff3399cc">TIP: Selling PLEX for ISK kickstarts your career!</font>';

    const prepared = convertEveUrlTags(
      convertEveColorTags(convertEveMailLineBreaks(description)),
    );

    let html = "";
    expect(() => {
      html = renderToHtml(prepared);
    }).not.toThrow();

    expect(html).toContain("Getting PLEX");
    expect(stripWs(html)).toContain("font-size:14pt");
    expect(html).toContain("TIP: Selling PLEX for ISK");
    expect(html).toContain('href="https://store.eveonline.com/#plex"');
  });
});
