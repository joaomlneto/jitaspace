"use client";

import type { RichTextEditorProps } from "@mantine/tiptap";
import { openModal } from "@mantine/modals";

import {
  convertEveColorTags,
  convertEveMailLineBreaks,
  convertEveUrlTags,
  renderEveHref,
  useEveEditor,
} from "@jitaspace/tiptap-eve";

import { DnaShipFittingCard } from "~/components/Fitting";
import styles from "./MailMessageViewer.module.css";

type MailMessageViewerProps = Omit<
  RichTextEditorProps,
  "editor" | "children"
> & {
  content: string;
  /** Color for internal EVE links (/character, /corporation, etc.). */
  internalLinkColor?: string;
  /** Color for external links (http/https URLs). */
  externalLinkColor?: string;
  /** Color for chat channel links (/channel/...). */
  channelLinkColor?: string;
};

export function MailMessageViewer({
  content,
  internalLinkColor = "#d98d00",
  externalLinkColor = "#ffd700",
  channelLinkColor = "#6270dc",
}: MailMessageViewerProps) {
  const editor = useEveEditor({
    content: convertEveUrlTags(
      convertEveColorTags(convertEveMailLineBreaks(content)),
    ),
  });

  const getLinkColor = (href: string, translatedHref: string) => {
    if (href.startsWith("joinChannel:") || href.startsWith("fleet:")) {
      return channelLinkColor;
    }
    if (href.startsWith("fitting:")) return internalLinkColor;
    if (translatedHref.startsWith("/")) return internalLinkColor;
    return externalLinkColor;
  };

  // `editor` is null on the first render (TipTap creates it in an effect after
  // mount; see useEveEditor). Render empty until then — the editor re-renders
  // this component with the real HTML once it exists.
  const html = (editor?.getHTML() ?? "").replace(
    /<a\b([^>]*)\bhref="([^"]*)"([^>]*)>/g,
    (_, before: string, href: string, after: string) => {
      const translatedHref = renderEveHref(href);
      const color = getLinkColor(href, translatedHref);
      return `<a${before}href="${translatedHref}"${after} style="color:${color};font-weight:600;">`;
    },
  );

  const handleLinkInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
  ) => {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (href?.startsWith("helpPointer:")) {
      e.preventDefault();
      const topic = href.slice("helpPointer:".length);
      globalThis.alert(
        `This is a help pointer link to "${topic}". Open it in the EVE Online client.`,
      );
    } else if (href?.startsWith("joinChannel:")) {
      e.preventDefault();
      const channelId = href.slice("joinChannel:".length);
      globalThis.alert(
        `This is a chat channel (ID: ${channelId}). Join it from within the EVE Online client.`,
      );
    } else if (href?.startsWith("fitting:")) {
      e.preventDefault();
      const dna = href.slice("fitting:".length);
      const name = anchor.textContent;
      openModal({
        title: name,
        size: "lg",
        children: <DnaShipFittingCard dna={dna} name={name} />,
      });
    } else if (href?.startsWith("shipSkinListing:")) {
      e.preventDefault();
      globalThis.alert(
        "This is a ship skin listing. Open it in the EVE Online client to preview or purchase.",
      );
    } else if (href?.startsWith("localsvc:")) {
      e.preventDefault();
      globalThis.alert(
        "This link opens a window in the EVE Online client. Use the EVE client to open it.",
      );
    } else if (href?.startsWith("opportunity:")) {
      e.preventDefault();
      globalThis.alert(
        "This is an opportunity link. Open it in the EVE Online client.",
      );
    } else if (href?.startsWith("careerProgramNode:")) {
      e.preventDefault();
      globalThis.alert(
        "This is an AIR Career Program link. Open it in the EVE Online client.",
      );
    } else if (href?.startsWith("fleet:")) {
      e.preventDefault();
      globalThis.alert(
        "This is a fleet invite link. Open it in the EVE Online client to join the fleet.",
      );
    }
  };

  return (
    <div
      className={styles.content}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleLinkInteraction}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleLinkInteraction(e);
      }}
      role="presentation"
    />
  );
}
