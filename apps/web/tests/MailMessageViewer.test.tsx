import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";

// Mock TipTap-eve to avoid the complex DOM environment required by useEditor.
// We control getHTML() so we can test the link post-processing logic directly.
// Use require() below (not a static import) so the mock is guaranteed to be
// in place before the module that consumes it is loaded.
jest.mock("@jitaspace/tiptap-eve", () => ({
  useEveEditor: () => ({
    getHTML: () =>
      '<p><a href="showinfo:1377//93345033" target="_blank" rel="noopener noreferrer nofollow">Joao Neto</a>' +
      ' and <a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">External</a>' +
      ' and <a href="joinChannel:-26572540" target="_blank" rel="noopener noreferrer nofollow">Channel</a></p>',
  }),
  convertEveMailLineBreaks: (s: string) => s,
  convertEveColorTags: (s: string) => s,
  convertEveUrlTags: (s: string) => s,
  renderEveHref: (href: string) => {
    if (href.startsWith("showinfo:1377//")) return `/character/${href.split("//")[1]}`;
    if (href.startsWith("joinChannel:")) return `/channel/${href.slice("joinChannel:".length)}`;
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

    it("translates joinChannel hrefs to /channel/ paths", () => {
      render(<MailMessageViewer content="" />);
      const channelLink = screen.getByRole("link", { name: "Channel" });
      expect(channelLink).toHaveAttribute("href", "/channel/-26572540");
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
  });
});
