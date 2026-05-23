/**
 * @jest-environment jsdom
 */
import { htmlToEveMail } from "../utils/serialize";

describe("htmlToEveMail", () => {
  describe("plain text", () => {
    it("returns plain text unchanged", () => {
      expect(htmlToEveMail("<p>Hello world</p>")).toBe("Hello world");
    });

    it("handles an empty paragraph", () => {
      expect(htmlToEveMail("<p></p>")).toBe("");
    });
  });

  describe("line breaks", () => {
    it("converts <br> inside a paragraph to \\r\\n", () => {
      expect(htmlToEveMail("<p>Line 1<br>Line 2</p>")).toBe("Line 1\r\nLine 2");
    });

    it("converts two consecutive <br> to \\r\\n\\r\\n (blank line)", () => {
      expect(htmlToEveMail("<p>Line 1<br><br>Line 3</p>")).toBe(
        "Line 1\r\n\r\nLine 3",
      );
    });

    it("converts multiple <p> blocks to content separated by \\r\\n", () => {
      expect(htmlToEveMail("<p>Para 1</p><p>Para 2</p>")).toBe(
        "Para 1\r\nPara 2",
      );
    });

    it("does not add a trailing \\r\\n after the last paragraph", () => {
      const result = htmlToEveMail("<p>Hello</p>");
      expect(result.endsWith("\r\n")).toBe(false);
    });
  });

  describe("bold", () => {
    it("converts <strong> to <b>", () => {
      expect(htmlToEveMail("<p><strong>bold</strong></p>")).toBe("<b>bold</b>");
    });

    it("converts <b> to <b>", () => {
      expect(htmlToEveMail("<p><b>bold</b></p>")).toBe("<b>bold</b>");
    });
  });

  describe("italic", () => {
    it("converts <em> to <i>", () => {
      expect(htmlToEveMail("<p><em>italic</em></p>")).toBe("<i>italic</i>");
    });

    it("converts <i> to <i>", () => {
      expect(htmlToEveMail("<p><i>italic</i></p>")).toBe("<i>italic</i>");
    });
  });

  describe("underline", () => {
    it("preserves <u> tags", () => {
      expect(htmlToEveMail("<p><u>underline</u></p>")).toBe(
        "<u>underline</u>",
      );
    });
  });

  describe("strikethrough", () => {
    it("preserves <s> tags", () => {
      expect(htmlToEveMail("<p><s>strike</s></p>")).toBe("<s>strike</s>");
    });
  });

  describe("links", () => {
    it("converts <a href='showinfo:...'> to <url=...>", () => {
      expect(
        htmlToEveMail(
          '<p><a href="showinfo:1377//93345033">Joao Neto</a></p>',
        ),
      ).toBe("<url=showinfo:1377//93345033>Joao Neto</url>");
    });

    it("converts external https links to <url=...>", () => {
      expect(
        htmlToEveMail('<p><a href="https://example.com">Example</a></p>'),
      ).toBe("<url=https://example.com>Example</url>");
    });

    it("converts killReport links to <url=...>", () => {
      expect(
        htmlToEveMail(
          '<p><a href="killReport:13807613:abc123">Kill</a></p>',
        ),
      ).toBe("<url=killReport:13807613:abc123>Kill</url>");
    });

    it("converts contract links to <url=...>", () => {
      expect(
        htmlToEveMail('<p><a href="contract:0//196428637">My Contract</a></p>'),
      ).toBe("<url=contract:0//196428637>My Contract</url>");
    });

    it("converts joinChannel links to <url=...>", () => {
      expect(
        htmlToEveMail('<p><a href="joinChannel:-26572540">Channel</a></p>'),
      ).toBe("<url=joinChannel:-26572540>Channel</url>");
    });

    it("strips rel and target attributes — EVE mail does not support them", () => {
      expect(
        htmlToEveMail(
          '<p><a href="showinfo:1377//93345033" target="_blank" rel="noopener noreferrer nofollow">Joao Neto</a></p>',
        ),
      ).toBe("<url=showinfo:1377//93345033>Joao Neto</url>");
    });
  });

  describe("color spans", () => {
    it("converts a span with EVE color attribute to <color=...>", () => {
      expect(
        htmlToEveMail(
          '<p><span color="0xffFF0000" style="color:#FF0000">red text</span></p>',
        ),
      ).toBe("<color=0xffFF0000>red text</color>");
    });

    it("converts a span with 0x0RRGGBB color to <color=...>", () => {
      expect(
        htmlToEveMail(
          '<p><span color="0x0FF0000" style="color:#FF0000">text</span></p>',
        ),
      ).toBe("<color=0x0FF0000>text</color>");
    });

    it("ignores spans without a color attribute", () => {
      expect(htmlToEveMail('<p><span class="foo">text</span></p>')).toBe(
        "text",
      );
    });
  });

  describe("round-trip fidelity", () => {
    it("round-trips a full mail body with mixed content", () => {
      const tiptapHtml =
        '<p>Hello,<br>Please see <a href="showinfo:1377//93345033">Joao Neto</a>.</p>' +
        '<p><span color="0xffFF0000" style="color:#FF0000"><b>Important</b></span><br>Regards</p>';

      expect(htmlToEveMail(tiptapHtml)).toBe(
        "Hello,\r\nPlease see <url=showinfo:1377//93345033>Joao Neto</url>.\r\n" +
          "<color=0xffFF0000><b>Important</b></color>\r\nRegards",
      );
    });

    it("round-trips a mail with a blank line between paragraphs", () => {
      const tiptapHtml = "<p>Para 1<br><br>Para 2</p>";
      expect(htmlToEveMail(tiptapHtml)).toBe("Para 1\r\n\r\nPara 2");
    });
  });
});
