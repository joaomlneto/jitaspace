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

    it("converts contract links to <url=...>", () => {
      expect(
        htmlToEveMail('<p><a href="contract:0//196428637">My Contract</a></p>'),
      ).toBe("<url=contract:0//196428637>My Contract</url>");
    });

    it("strips rel and target attributes — EVE mail does not support them", () => {
      expect(
        htmlToEveMail(
          '<p><a href="showinfo:1377//93345033" target="_blank" rel="noopener noreferrer nofollow">Joao Neto</a></p>',
        ),
      ).toBe("<url=showinfo:1377//93345033>Joao Neto</url>");
    });

    // TipTap stores hrefs in lowercase (linkifyjs v4 requires RFC 3986 lowercase
    // schemes).  The serializer must restore the canonical EVE camelCase names so
    // outgoing mail matches what the EVE client originally produced.
    describe("camelCase scheme restoration", () => {
      it.each([
        ["joinchannel", "joinchannel:-26572540", "joinChannel:-26572540"],
        ["killreport", "killreport:13807613:abc123", "killReport:13807613:abc123"],
        ["warreport", "warreport:42", "warReport:42"],
        ["recruitmentad", "recruitmentad:98645206//155600", "recruitmentAd:98645206//155600"],
        ["helppointer", "helppointer:neocom.airCareerProgram", "helpPointer:neocom.airCareerProgram"],
        ["shipskinlisting", "shipskinlisting:fe7ec0c3", "shipSkinListing:fe7ec0c3"],
        ["careerprogramnode", "careerprogramnode:7:410:None", "careerProgramNode:7:410:None"],
      ])(
        "restores %s → original camelCase on serialization",
        (_scheme, lowercase, camelCase) => {
          expect(
            htmlToEveMail(`<p><a href="${lowercase}">Link</a></p>`),
          ).toBe(`<url=${camelCase}>Link</url>`);
        },
      );

      it("leaves already-lowercase EVE schemes unchanged (showinfo, contract, fitting, …)", () => {
        expect(htmlToEveMail('<p><a href="showinfo:1377//93345033">Name</a></p>')).toBe(
          "<url=showinfo:1377//93345033>Name</url>",
        );
        expect(htmlToEveMail('<p><a href="contract:0//196428637">Contract</a></p>')).toBe(
          "<url=contract:0//196428637>Contract</url>",
        );
        expect(htmlToEveMail('<p><a href="fitting:33470:31047;1::">Fit</a></p>')).toBe(
          "<url=fitting:33470:31047;1::>Fit</url>",
        );
      });

      it("leaves https:// links unchanged", () => {
        expect(htmlToEveMail('<p><a href="https://example.com">Example</a></p>')).toBe(
          "<url=https://example.com>Example</url>",
        );
      });
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
