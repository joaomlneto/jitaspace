import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";

// Mock TipTap-eve to avoid the complex DOM environment required by useEditor.
// We control getHTML() so we can test the link post-processing logic directly.
// Use require() below (not a static import) so the mock is guaranteed to be
// in place before the module that consumes it is loaded.
jest.mock("@mantine/modals", () => ({
  openModal: jest.fn(),
}));

jest.mock("~/components/Fitting", () => ({
  DnaShipFittingCard: () => null,
}));

const mockGetHTML = jest.fn(() =>
  '<p><a href="showinfo:1377//93345033" target="_blank" rel="noopener noreferrer nofollow">Joao Neto</a>' +
  ' and <a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">External</a>' +
  ' and <a href="joinChannel:-26572540" target="_blank" rel="noopener noreferrer nofollow">Channel</a>' +
  ' and <a href="fleet:1021212278338" target="_blank" rel="noopener noreferrer nofollow">Mining Fleet</a>' +
  ' and <a href="helpPointer:neocom.airCareerProgram">Help</a>' +
  ' and <a href="shipSkinListing:fe7ec0c3-2d02-4d3b-9cd4-b41221941951">Skin</a>' +
  ' and <a href="fitting:33470:31047;1:31011;1::">Stratios Fit</a></p>',
);

jest.mock("@jitaspace/tiptap-eve", () => ({
  useEveEditor: () => ({ getHTML: mockGetHTML }),
  convertEveMailLineBreaks: (s: string) => s,
  convertEveColorTags: (s: string) => s,
  convertEveUrlTags: (s: string) => s,
  renderEveHref: (href: string) => {
    if (href.startsWith("showinfo:1377//")) return `/character/${href.split("//")[1]}`;
    if (href.startsWith("helpPointer:")) return href;
    return href;
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MailMessageViewer } = require("~/components/EveMail/MailMessageViewer") as typeof import("~/components/EveMail/MailMessageViewer");

describe("MailMessageViewer", () => {
  describe("link styling", () => {
    it("renders internal EVE links with the internal link color", () => {
      render(<MailMessageViewer content="" />);
      const internalLink = screen.getByRole("link", { name: "Joao Neto" });
      expect(internalLink).toHaveStyle("color: #d98d00");
    });

    it("renders external links with the external link color", () => {
      render(<MailMessageViewer content="" />);
      const externalLink = screen.getByRole("link", { name: "External" });
      expect(externalLink).toHaveStyle("color: #ffd700");
    });

    it("uses the internalLinkColor prop when provided", () => {
      render(<MailMessageViewer content="" internalLinkColor="#ff0000" />);
      const internalLink = screen.getByRole("link", { name: "Joao Neto" });
      expect(internalLink).toHaveStyle("color: #ff0000");
    });

    it("uses the externalLinkColor prop when provided", () => {
      render(<MailMessageViewer content="" externalLinkColor="#00ff00" />);
      const externalLink = screen.getByRole("link", { name: "External" });
      expect(externalLink).toHaveStyle("color: #00ff00");
    });

    it("renders channel links with the channel link color", () => {
      render(<MailMessageViewer content="" />);
      const channelLink = screen.getByRole("link", { name: "Channel" });
      expect(channelLink).toHaveStyle("color: #6270dc");
    });

    it("uses the channelLinkColor prop when provided", () => {
      render(<MailMessageViewer content="" channelLinkColor="#0000ff" />);
      const channelLink = screen.getByRole("link", { name: "Channel" });
      expect(channelLink).toHaveStyle("color: #0000ff");
    });

    it("preserves joinChannel hrefs unchanged", () => {
      render(<MailMessageViewer content="" />);
      const channelLink = screen.getByRole("link", { name: "Channel" });
      expect(channelLink).toHaveAttribute("href", "joinChannel:-26572540");
    });

    it("renders links with bold font weight", () => {
      render(<MailMessageViewer content="" />);
      for (const link of screen.getAllByRole("link")) {
        expect(link).toHaveStyle("font-weight: 600");
      }
    });

    it("does not set text-decoration:none inline so CSS hover can apply underline", () => {
      render(<MailMessageViewer content="" />);
      for (const link of screen.getAllByRole("link")) {
        // text-decoration must not be locked via inline style — the CSS module
        // controls it so that :hover { text-decoration: underline } can fire.
        expect(link.style.textDecoration).toBe("");
      }
    });

    it("wraps content in a div with the CSS module class for hover underline", () => {
      const { container } = render(<MailMessageViewer content="" />);
      const wrapper = container.firstChild as HTMLElement;
      // jsdom doesn't process CSS modules, but the class attribute must be present
      // so the browser can apply the .content a:hover { text-decoration: underline } rule.
      expect(wrapper.className).not.toBe("");
    });

    it("translates internal showinfo hrefs to web paths", () => {
      render(<MailMessageViewer content="" />);
      const internalLink = screen.getByRole("link", { name: "Joao Neto" });
      expect(internalLink).toHaveAttribute("href", "/character/93345033");
    });

    it("preserves external hrefs unchanged", () => {
      render(<MailMessageViewer content="" />);
      const externalLink = screen.getByRole("link", { name: "External" });
      expect(externalLink).toHaveAttribute("href", "https://example.com");
    });

    it("renders fleet invite links with the channel link color", () => {
      render(<MailMessageViewer content="" />);
      const fleetLink = screen.getByRole("link", { name: "Mining Fleet" });
      expect(fleetLink).toHaveStyle("color: #6270dc");
    });

    it("uses the channelLinkColor prop for fleet invite links", () => {
      render(<MailMessageViewer content="" channelLinkColor="#0000ff" />);
      const fleetLink = screen.getByRole("link", { name: "Mining Fleet" });
      expect(fleetLink).toHaveStyle("color: #0000ff");
    });

    it("renders fleet invite links with channel color even when wrapped in a color tag", () => {
      mockGetHTML.mockReturnValueOnce(
        '<p><span style="color:#ff0000"><a href="fleet:1021212278338">Mining Fleet</a></span></p>',
      );
      render(<MailMessageViewer content="" />);
      const fleetLink = screen.getByRole("link", { name: "Mining Fleet" });
      expect(fleetLink).toHaveStyle("color: #6270dc");
    });

    it("renders channel links with channel color even when wrapped in a color tag", () => {
      mockGetHTML.mockReturnValueOnce(
        '<p><span style="color:#ff0000"><a href="joinChannel:-26572540">Channel</a></span></p>',
      );
      render(<MailMessageViewer content="" />);
      const channelLink = screen.getByRole("link", { name: "Channel" });
      expect(channelLink).toHaveStyle("color: #6270dc");
    });
  });

  describe("channel links (joinChannel:)", () => {
    it("shows an alert with the channel ID when a channel link is clicked", async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      render(<MailMessageViewer content="" />);
      await user.click(screen.getByRole("link", { name: "Channel" }));
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("-26572540"),
      );
      alertSpy.mockRestore();
    });
  });

  describe("shipSkinListing links", () => {
    it("shows an alert when a ship skin listing link is clicked", async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      render(<MailMessageViewer content="" />);
      await user.click(screen.getByRole("link", { name: "Skin" }));
      expect(alertSpy).toHaveBeenCalledTimes(1);
      alertSpy.mockRestore();
    });
  });

  describe("fitting links", () => {
    it("opens a modal when a fitting link is clicked", async () => {
      const user = userEvent.setup();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { openModal } = require("@mantine/modals") as { openModal: ReturnType<typeof jest.fn> };
      render(<MailMessageViewer content="" />);
      await user.click(screen.getByRole("link", { name: "Stratios Fit" }));
      expect(openModal).toHaveBeenCalledTimes(1);
    });

    it("passes the DNA string (without 'fitting:' prefix) to the modal", async () => {
      const user = userEvent.setup();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { openModal } = require("@mantine/modals") as { openModal: ReturnType<typeof jest.fn> };
      render(<MailMessageViewer content="" />);
      await user.click(screen.getByRole("link", { name: "Stratios Fit" }));
      const call = (openModal as ReturnType<typeof jest.fn>).mock.calls[0]?.[0] as { children: React.ReactElement };
      expect(call.children.props.dna).toBe("33470:31047;1:31011;1::");
    });

    it("uses the link text as the modal title", async () => {
      const user = userEvent.setup();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { openModal } = require("@mantine/modals") as { openModal: ReturnType<typeof jest.fn> };
      render(<MailMessageViewer content="" />);
      await user.click(screen.getByRole("link", { name: "Stratios Fit" }));
      const call = (openModal as ReturnType<typeof jest.fn>).mock.calls[0]?.[0] as { title: string };
      expect(call.title).toBe("Stratios Fit");
    });

    it("renders fitting links with the internal link color", () => {
      render(<MailMessageViewer content="" />);
      const fittingLink = screen.getByRole("link", { name: "Stratios Fit" });
      expect(fittingLink).toHaveStyle("color: #d98d00");
    });
  });

  describe("helpPointer links", () => {
    it("shows an alert with the topic name when a helpPointer link is clicked", async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      render(<MailMessageViewer content="" />);
      await user.click(screen.getByRole("link", { name: "Help" }));
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("neocom.airCareerProgram"),
      );
      alertSpy.mockRestore();
    });

    it("does not navigate when a helpPointer link is clicked", async () => {
      render(<MailMessageViewer content="" />);
      const helpLink = screen.getByRole("link", { name: "Help" });
      expect(helpLink).toHaveAttribute("href", "helpPointer:neocom.airCareerProgram");
    });
  });
});
