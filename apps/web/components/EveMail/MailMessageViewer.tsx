import type { RichTextEditorProps } from "@mantine/tiptap";

import styles from "./MailMessageViewer.module.css";

import {
  convertEveColorTags,
  convertEveMailLineBreaks,
  convertEveUrlTags,
  renderEveHref,
  useEveEditor,
} from "@jitaspace/tiptap-eve";

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
      const color = translatedHref.startsWith("/channel/")
        ? channelLinkColor
        : translatedHref.startsWith("/")
          ? internalLinkColor
          : externalLinkColor;
      return `<a${before}href="${translatedHref}"${after} style="color:${color};font-weight:600;">`;
    },
  );

  return <div className={styles.content} dangerouslySetInnerHTML={{ __html: html }} />;
}
