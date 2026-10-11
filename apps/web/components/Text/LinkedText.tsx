"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

import { renderEveHref } from "@jitaspace/tiptap-eve";

const LINK = /<a href="([^"<>]+)">([^<>]*)<\/a>/g;

/**
 * Plain text with EVE-style links (`<a href="showinfo:587">Rifter</a>`, or a
 * site path), rendered without an editor: each link becomes a Next.js link to
 * the page tiptap-eve's `renderEveHref` maps it to. Meant for text we write
 * ourselves, such as `DogmaEffect.customDescription`, which holds nothing but
 * text and links; a link that maps outside the site is shown as plain text.
 */
export function LinkedText({ text }: Readonly<{ text: string }>) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const [whole, href = "", inner = ""] = match;
    if (match.index > last) parts.push(text.slice(last, match.index));
    const target = renderEveHref(href);
    parts.push(
      target.startsWith("/") ? (
        <Anchor key={match.index} component={Link} href={target} inherit>
          {inner}
        </Anchor>
      ) : (
        inner
      ),
    );
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
