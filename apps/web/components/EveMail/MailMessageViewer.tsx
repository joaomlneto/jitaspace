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

  const html = (editor?.getHTML() ?? "Loading...").replace(
    /<a\b([^>]*)\bhref="([^"]*)"([^>]*)>/g,
    (_, before: string, href: string, after: string) => {
      const translatedHref = renderEveHref(href);
      const color =
        href.startsWith("joinChannel:") || href.startsWith("fleet:") ? channelLinkColor
        : href.startsWith("fitting:") ? internalLinkColor
        : translatedHref.startsWith("/") ? internalLinkColor
        : externalLinkColor;
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
      window.alert(
        `This is a help pointer link to "${topic}". Open it in the EVE Online client.`,
      );
    } else if (href?.startsWith("joinChannel:")) {
      e.preventDefault();
      const channelId = href.slice("joinChannel:".length);
      window.alert(
        `This is a chat channel (ID: ${channelId}). Join it from within the EVE Online client.`,
      );
    } else if (href?.startsWith("fitting:")) {
      e.preventDefault();
      const dna = href.slice("fitting:".length);
      const name = anchor.textContent ?? undefined;
      openModal({
        title: name ?? "Ship Fitting",
        size: "lg",
        children: <DnaShipFittingCard dna={dna} name={name} />,
      });
    } else if (href?.startsWith("shipSkinListing:")) {
      e.preventDefault();
      window.alert(
        "This is a ship skin listing. Open it in the EVE Online client to preview or purchase.",
      );
    } else if (href?.startsWith("localsvc:")) {
      e.preventDefault();
      window.alert(
        "This link opens a window in the EVE Online client. Use the EVE client to open it.",
      );
    } else if (href?.startsWith("opportunity:")) {
      e.preventDefault();
      window.alert(
        "This is an opportunity link. Open it in the EVE Online client.",
      );
    } else if (href?.startsWith("careerProgramNode:")) {
      e.preventDefault();
      window.alert(
        "This is an AIR Career Program link. Open it in the EVE Online client.",
      );
    } else if (href?.startsWith("fleet:")) {
      e.preventDefault();
      window.alert(
        "This is a fleet invite link. Open it in the EVE Online client to join the fleet.",
      );
    }
  };

  return (
    <div
      className={styles.content}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleLinkInteraction}
      onKeyDown={(e) => { if (e.key === "Enter") handleLinkInteraction(e); }}
      role="presentation"
    />
  );
}
