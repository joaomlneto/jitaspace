/**
 * Regression tests for the linkifyjs v4 protocol-registration error.
 *
 * TipTap v3 uses linkifyjs v4, which validates custom protocol scheme names
 * against RFC 3986: only lowercase ASCII letters, digits and "-" are allowed.
 * EVE Online uses camelCase scheme names (warReport:, joinChannel:, …). When
 * EveLink registered those names as-is, linkifyjs threw a Runtime Error visible
 * in the Next.js dev overlay on every page that mounts MailMessageViewer.
 *
 * Fix: EveLink now registers all-lowercase names; convertEveUrlTags normalises
 * the scheme part of incoming EVE URLs to lowercase before handing to TipTap.
 */

import "@testing-library/jest-dom/jest-globals";

import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";

jest.mock("@mantine/modals", () => ({ openModal: jest.fn() }));
jest.mock("~/components/Fitting", () => ({ DnaShipFittingCard: () => null }));

// ---------------------------------------------------------------------------
// Direct linkifyjs registration test
// ---------------------------------------------------------------------------

describe("EveLink protocol names pass linkifyjs v4 validation", () => {
  it("accepts all registered EVE protocol names (all lowercase)", () => {
    // registerCustomProtocol throws if the scheme contains uppercase or fails
    // RFC 3986 validation. Calling it here exercises the exact validation path
    // that was crashing every page that mounted MailMessageViewer.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerCustomProtocol } = require("linkifyjs") as typeof import("linkifyjs");

    const protocols = [
      "showinfo",
      "warreport",
      "killreport",
      "recruitmentad",
      "contract",
      "joinchannel",
      "helppointer",
      "shipskinlisting",
      "fitting",
      "localsvc",
      "opportunity",
      "careerprogramnode",
      "fleet",
    ];

    for (const scheme of protocols) {
      expect(() => registerCustomProtocol(scheme, true)).not.toThrow();
    }
  });

  it("rejects the old camelCase names that were breaking TipTap v3", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerCustomProtocol } = require("linkifyjs") as typeof import("linkifyjs");

    const badSchemes = [
      "warReport",
      "killReport",
      "recruitmentAd",
      "joinChannel",
      "helpPointer",
      "shipSkinListing",
      "careerProgramNode",
    ];

    for (const scheme of badSchemes) {
      expect(() => registerCustomProtocol(scheme, true)).toThrow(/linkifyjs/);
    }
  });
});

// ---------------------------------------------------------------------------
// MailMessageViewer renders without error (smoke tests)
// ---------------------------------------------------------------------------

describe("MailMessageViewer renders without error", () => {
  // The component mocks useEveEditor but still exercises all link-handler
  // code paths that check href.startsWith(scheme).
  jest.mock("@jitaspace/tiptap-eve", () => ({
    useEveEditor: () => ({
      getHTML: () =>
        '<a href="joinchannel:-26572540">Channel</a>' +
        '<a href="helppointer:neocom.airCareerProgram">Help</a>' +
        '<a href="shipskinlisting:abc">Skin</a>' +
        '<a href="careerprogramnode:7:410:None">Career</a>' +
        '<a href="warreport:42">War</a>' +
        '<a href="fleet:1234">Fleet</a>' +
        '<a href="fitting:33470::">Fit</a>' +
        '<a href="https://example.com">External</a>',
    }),
    convertEveMailLineBreaks: (s: string) => s,
    convertEveColorTags: (s: string) => s,
    convertEveUrlTags: (s: string) => s,
    renderEveHref: (href: string) => href,
  }));

  it("renders with plain text without throwing", () => {
    const { MailMessageViewer } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("~/components/EveMail/MailMessageViewer") as typeof import("~/components/EveMail/MailMessageViewer");

    expect(() => {
      render(
        <MantineProvider>
          <MailMessageViewer content="No description" />
        </MantineProvider>,
      );
    }).not.toThrow();
  });

  it("renders with all EVE scheme types without throwing", () => {
    const { MailMessageViewer } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("~/components/EveMail/MailMessageViewer") as typeof import("~/components/EveMail/MailMessageViewer");

    expect(() => {
      render(
        <MantineProvider>
          <MailMessageViewer content="<a href='showinfo:1377//123'>Name</a>" />
        </MantineProvider>,
      );
    }).not.toThrow();
  });
});
