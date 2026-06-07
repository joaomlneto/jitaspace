import {
  convertEveColorTags,
  convertEveMailLineBreaks,
  convertEveUrlTags,
  sanitizeFormattedEveString,
} from "../utils/sanitize";

describe("sanitizeFormattedEveString", () => {
  describe("plain strings (no u'' wrapper)", () => {
    it("returns a plain string unchanged", () => {
      expect(sanitizeFormattedEveString("hello world")).toBe("hello world");
    });

    it("returns an empty string unchanged", () => {
      expect(sanitizeFormattedEveString("")).toBe("");
    });

    it("returns an HTML string unchanged", () => {
      const html =
        '<font color="0x0ff0000"><b>Bold red text</b></font>';
      expect(sanitizeFormattedEveString(html)).toBe(html);
    });

    it("does not treat a string starting with u but no quote as u-string", () => {
      expect(sanitizeFormattedEveString("unicode text")).toBe("unicode text");
    });
  });

  describe("unicode escape sequences (\\uHHHH) — work outside u'' wrapper", () => {
    it("converts a basic latin unicode escape", () => {
      expect(sanitizeFormattedEveString("\\u0041")).toBe("A");
    });

    it("converts a unicode escape for a space character", () => {
      expect(sanitizeFormattedEveString("\\u0020")).toBe(" ");
    });

    it("converts a unicode escape for a non-ASCII character", () => {
      expect(sanitizeFormattedEveString("\\u00e9")).toBe("é");
    });

    it("converts a unicode escape for a CJK character", () => {
      expect(sanitizeFormattedEveString("\\u4e2d")).toBe("中");
    });

    it("converts multiple unicode escapes in a row", () => {
      expect(sanitizeFormattedEveString("\\u0048\\u0065\\u006c\\u006c\\u006f")).toBe("Hello");
    });

    it("converts unicode escapes mixed with plain text", () => {
      expect(sanitizeFormattedEveString("Hello \\u0057orld")).toBe(
        "Hello World",
      );
    });

    it("handles uppercase hex digits in unicode escape", () => {
      expect(sanitizeFormattedEveString("\\u00E9")).toBe("é");
    });
  });

  describe("u'' wrapped Python unicode strings", () => {
    it("strips the u'' wrapper from a simple string", () => {
      expect(sanitizeFormattedEveString("u'hello'")).toBe("hello");
    });

    it("strips the wrapper from an empty u-string", () => {
      expect(sanitizeFormattedEveString("u''")).toBe("");
    });

    describe("hex escapes (\\xHH)", () => {
      it("converts \\x41 (ASCII 'A') inside u-string", () => {
        expect(sanitizeFormattedEveString("u'\\x41'")).toBe("A");
      });

      it("converts \\x61 (ASCII 'a') inside u-string", () => {
        expect(sanitizeFormattedEveString("u'\\x61'")).toBe("a");
      });

      it("converts a non-ASCII \\xHH escape (é = \\xe9)", () => {
        expect(sanitizeFormattedEveString("u'\\xe9'")).toBe("é");
      });

      it("converts multiple hex escapes", () => {
        expect(sanitizeFormattedEveString("u'\\x48\\x69'")).toBe("Hi");
      });

      it("converts hex escapes mixed with plain text", () => {
        expect(sanitizeFormattedEveString("u'Hello \\x57orld'")).toBe(
          "Hello World",
        );
      });

      it("handles uppercase hex digits in \\xHH escape", () => {
        expect(sanitizeFormattedEveString("u'\\xE9'")).toBe("é");
      });
    });

    describe("escaped single quotes (\\')", () => {
      it("converts \\' to a literal single quote", () => {
        expect(sanitizeFormattedEveString("u'it\\'s'")).toBe("it's");
      });

      it("converts multiple escaped quotes", () => {
        expect(sanitizeFormattedEveString("u'can\\'t won\\'t'")).toBe(
          "can't won't",
        );
      });
    });

    describe("unicode escapes inside u-string", () => {
      it("converts \\uHHHH escapes inside u-string", () => {
        expect(sanitizeFormattedEveString("u'\\u0041'")).toBe("A");
      });

      it("converts non-ASCII unicode inside u-string", () => {
        expect(sanitizeFormattedEveString("u'\\u00e9'")).toBe("é");
      });
    });

    describe("mixed content inside u-string", () => {
      it("handles plain text, hex escapes, and escaped quotes together", () => {
        expect(sanitizeFormattedEveString("u'It\\'s \\x41 test'")).toBe(
          "It's A test",
        );
      });

      it("handles a realistic EVE mail subject", () => {
        // u-string with a corporation name containing non-ASCII characters via hex
        expect(sanitizeFormattedEveString("u'\\x4a\\x69\\x74\\x61'")).toBe(
          "Jita",
        );
      });
    });
  });
});

describe("convertEveMailLineBreaks", () => {
  describe("basic conversion", () => {
    it("converts a single \\r\\n to <br>", () => {
      expect(convertEveMailLineBreaks("line1\r\nline2")).toBe(
        "line1<br>line2",
      );
    });

    it("converts \\r\\n\\r\\n (blank line between paragraphs) to <br><br>", () => {
      expect(convertEveMailLineBreaks("para1\r\n\r\npara2")).toBe(
        "para1<br><br>para2",
      );
    });

    it("converts three consecutive \\r\\n to <br><br><br>", () => {
      expect(convertEveMailLineBreaks("a\r\n\r\n\r\nb")).toBe(
        "a<br><br><br>b",
      );
    });

    it("converts multiple single-line breaks throughout the body", () => {
      expect(convertEveMailLineBreaks("a\r\nb\r\nc\r\nd")).toBe(
        "a<br>b<br>c<br>d",
      );
    });
  });

  describe("no-op cases", () => {
    it("returns an empty string unchanged", () => {
      expect(convertEveMailLineBreaks("")).toBe("");
    });

    it("returns a string with no line breaks unchanged", () => {
      expect(convertEveMailLineBreaks("Hello, capsuleer!")).toBe(
        "Hello, capsuleer!",
      );
    });

    it("does not convert bare \\n (Unix newline) — only \\r\\n", () => {
      expect(convertEveMailLineBreaks("a\nb")).toBe("a\nb");
    });

    it("does not convert bare \\r (old Mac newline) — only \\r\\n", () => {
      expect(convertEveMailLineBreaks("a\rb")).toBe("a\rb");
    });

    it("leaves existing <br> tags untouched", () => {
      expect(convertEveMailLineBreaks("a<br>b")).toBe("a<br>b");
    });
  });

  describe("mixed HTML content", () => {
    it("converts \\r\\n inside EVE-format color tags", () => {
      expect(
        convertEveMailLineBreaks(
          "<color=0xffFF0000>Hello</color>\r\n<b>World</b>",
        ),
      ).toBe("<color=0xffFF0000>Hello</color><br><b>World</b>");
    });

    it("converts \\r\\n between EVE url tags", () => {
      expect(
        convertEveMailLineBreaks(
          "<url=showinfo:1377//12345>Name</url>\r\n<url=showinfo:2//98765>Corp</url>",
        ),
      ).toBe(
        "<url=showinfo:1377//12345>Name</url><br><url=showinfo:2//98765>Corp</url>",
      );
    });

    it("handles a realistic multi-paragraph EVE mail body", () => {
      const raw =
        "Good afternoon Capsuleer,\r\n\r\nYour contract has been moved.\r\n\r\n-Pilot";
      expect(convertEveMailLineBreaks(raw)).toBe(
        "Good afternoon Capsuleer,<br><br>Your contract has been moved.<br><br>-Pilot",
      );
    });
  });
});

describe("convertEveUrlTags", () => {
  describe("basic conversion", () => {
    it("converts a simple url tag to an anchor tag", () => {
      expect(
        convertEveUrlTags("<url=showinfo:1377//93345033>Joao Neto</url>"),
      ).toBe('<a href="showinfo:1377//93345033">Joao Neto</a>');
    });

    it("converts a url tag with an https href", () => {
      expect(
        convertEveUrlTags("<url=https://example.com>Example</url>"),
      ).toBe('<a href="https://example.com">Example</a>');
    });

    it("normalises a camelCase scheme (warReport → warreport)", () => {
      expect(convertEveUrlTags("<url=warReport:1234567>War</url>")).toBe(
        '<a href="warreport:1234567">War</a>',
      );
    });

    it("converts multiple url tags in the same string", () => {
      expect(
        convertEveUrlTags(
          "<url=showinfo:2//98000001>My Corp</url> and <url=showinfo:16159//498125261>My Alliance</url>",
        ),
      ).toBe(
        '<a href="showinfo:2//98000001">My Corp</a> and <a href="showinfo:16159//498125261">My Alliance</a>',
      );
    });

    it("converts a url tag with an empty href", () => {
      expect(convertEveUrlTags("<url=>Click here</url>")).toBe(
        '<a href="">Click here</a>',
      );
    });
  });

  describe("no-op cases", () => {
    it("returns an empty string unchanged", () => {
      expect(convertEveUrlTags("")).toBe("");
    });

    it("returns plain text unchanged", () => {
      expect(convertEveUrlTags("Hello, capsuleer!")).toBe(
        "Hello, capsuleer!",
      );
    });

    it("leaves existing <a> tags untouched", () => {
      expect(
        convertEveUrlTags('<a href="https://example.com">link</a>'),
      ).toBe('<a href="https://example.com">link</a>');
    });

    it("does not match unclosed url tags", () => {
      expect(convertEveUrlTags("<url=showinfo:34>Tritanium")).toBe(
        "<url=showinfo:34>Tritanium",
      );
    });
  });

  describe("nested and multiline content", () => {
    it("converts a url tag whose body contains HTML formatting", () => {
      expect(
        convertEveUrlTags(
          "<url=showinfo:34><b>Tritanium</b></url>",
        ),
      ).toBe('<a href="showinfo:34"><b>Tritanium</b></a>');
    });

    it("converts url tags that span multiple lines", () => {
      expect(
        convertEveUrlTags("<url=showinfo:34>Tri\r\ntanium</url>"),
      ).toBe('<a href="showinfo:34">Tri\r\ntanium</a>');
    });
  });

  describe("scheme normalisation (linkifyjs v4 compatibility)", () => {
    it.each([
      ["killReport", "<url=killReport:13807613:abc>Kill</url>", '<a href="killreport:13807613:abc">Kill</a>'],
      ["recruitmentAd", "<url=recruitmentAd:98645206//155600>Ad</url>", '<a href="recruitmentad:98645206//155600">Ad</a>'],
      ["joinChannel", "<url=joinChannel:-26572540>Channel</url>", '<a href="joinchannel:-26572540">Channel</a>'],
      ["helpPointer", "<url=helpPointer:neocom.airCareerProgram>Help</url>", '<a href="helppointer:neocom.airCareerProgram">Help</a>'],
      ["shipSkinListing", "<url=shipSkinListing:fe7ec0c3>Skin</url>", '<a href="shipskinlisting:fe7ec0c3">Skin</a>'],
      ["careerProgramNode", "<url=careerProgramNode:7:410:None>Career</url>", '<a href="careerprogramnode:7:410:None">Career</a>'],
    ])("lowercases %s scheme", (_name, input, expected) => {
      expect(convertEveUrlTags(input)).toBe(expected);
    });

    it("leaves already-lowercase schemes unchanged (idempotent)", () => {
      expect(convertEveUrlTags("<url=showinfo:1377//93345033>Name</url>")).toBe(
        '<a href="showinfo:1377//93345033">Name</a>',
      );
      expect(convertEveUrlTags("<url=fitting:33470:31047;1::>Fit</url>")).toBe(
        '<a href="fitting:33470:31047;1::">Fit</a>',
      );
    });

    it("leaves https:// URLs unchanged (uppercase only in scheme portion, which is already lowercase)", () => {
      expect(convertEveUrlTags("<url=https://example.com>Link</url>")).toBe(
        '<a href="https://example.com">Link</a>',
      );
    });
  });

  describe("realistic EVE mail content", () => {
    it("converts a character link in a full sentence", () => {
      const raw =
        "Contract from <url=showinfo:1377//401563624>Joao Neto</url> has been accepted.";
      expect(convertEveUrlTags(raw)).toBe(
        'Contract from <a href="showinfo:1377//401563624">Joao Neto</a> has been accepted.',
      );
    });

    it("handles a body with both url tags and line breaks (after convertEveMailLineBreaks)", () => {
      const raw =
        "Hello,<br><url=showinfo:2//98000001>My Corp</url><br>Regards";
      expect(convertEveUrlTags(raw)).toBe(
        'Hello,<br><a href="showinfo:2//98000001">My Corp</a><br>Regards',
      );
    });
  });
});

describe("convertEveColorTags", () => {
  describe("basic conversion", () => {
    it("converts a simple color tag to a font tag", () => {
      expect(
        convertEveColorTags("<color=0xffFF0000>New JF Service Pricing Model</color>"),
      ).toBe('<font color="0xffFF0000">New JF Service Pricing Model</font>');
    });

    it("converts fully opaque white (0xffffffff)", () => {
      expect(convertEveColorTags("<color=0xffffffff>white text</color>")).toBe(
        '<font color="0xffffffff">white text</font>',
      );
    });

    it("converts semi-transparent color (0xbfffffff)", () => {
      expect(
        convertEveColorTags("<color=0xbfffffff>semi-transparent</color>"),
      ).toBe('<font color="0xbfffffff">semi-transparent</font>');
    });

    it("converts multiple color tags in the same string", () => {
      expect(
        convertEveColorTags(
          "<color=0xffFF0000>red</color> and <color=0xff0000ff>blue</color>",
        ),
      ).toBe(
        '<font color="0xffFF0000">red</font> and <font color="0xff0000ff">blue</font>',
      );
    });

    it("handles uppercase hex digits in the color value", () => {
      expect(convertEveColorTags("<color=0xFFFF0000>red</color>")).toBe(
        '<font color="0xFFFF0000">red</font>',
      );
    });
  });

  describe("no-op cases", () => {
    it("returns an empty string unchanged", () => {
      expect(convertEveColorTags("")).toBe("");
    });

    it("returns plain text unchanged", () => {
      expect(convertEveColorTags("Hello, capsuleer!")).toBe(
        "Hello, capsuleer!",
      );
    });

    it("leaves existing <font> tags untouched", () => {
      expect(
        convertEveColorTags('<font color="#ff0000">red</font>'),
      ).toBe('<font color="#ff0000">red</font>');
    });

    it("does not match unclosed color tags", () => {
      expect(convertEveColorTags("<color=0xffFF0000>no close tag")).toBe(
        "<color=0xffFF0000>no close tag",
      );
    });
  });

  describe("nested and multiline content", () => {
    it("converts a color tag whose body contains HTML formatting", () => {
      expect(
        convertEveColorTags("<color=0xffFF0000><b>bold red</b></color>"),
      ).toBe('<font color="0xffFF0000"><b>bold red</b></font>');
    });

    it("converts color tags that span multiple lines", () => {
      expect(
        convertEveColorTags("<color=0xffFF0000>line1<br>line2</color>"),
      ).toBe('<font color="0xffFF0000">line1<br>line2</font>');
    });
  });

  describe("realistic EVE mail content", () => {
    it("converts the exact example from the bug report", () => {
      expect(
        convertEveColorTags(
          "<color=0xffFF0000>New JF Service Pricing Model</color>",
        ),
      ).toBe(
        '<font color="0xffFF0000">New JF Service Pricing Model</font>',
      );
    });

    it("handles a body with color tags alongside line breaks (after convertEveMailLineBreaks)", () => {
      const raw =
        "<color=0xffffffff>Hello,</color><br><color=0xffFF0000>Important!</color>";
      expect(convertEveColorTags(raw)).toBe(
        '<font color="0xffffffff">Hello,</font><br><font color="0xffFF0000">Important!</font>',
      );
    });
  });
});
