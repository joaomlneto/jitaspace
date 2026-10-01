"use client";

import type { TextProps } from "@mantine/core";
import { memo, useMemo } from "react";
import { Text } from "@mantine/core";

import { diffModeForLanguage, diffText } from "~/lib/text-diff";
import classes from "./TextDiff.module.css";

export type TextDiffProps = TextProps & {
  /** The text before; omit for an added string. */
  from?: string;
  /** The text after; omit for a removed string. */
  to?: string;
  /**
   * The language, which picks the granularity: Chinese and Japanese are
   * compared character by character, everything else word by word.
   */
  lang: string;
};

/**
 * Two versions of a string as one text, with what was removed struck through
 * in red and what was added underlined in green, so neither relies on colour
 * alone. Each edit also carries visually hidden "[added: …]" / "[removed: …]"
 * text for screen readers, which do not announce `<ins>`/`<del>` themselves.
 * The markup is shown raw: a changed tag is part of the diff.
 */
export const TextDiff = memo(({ from, to, lang, ...props }: TextDiffProps) => {
  const parts = useMemo(
    () => diffText(from, to, diffModeForLanguage(lang)),
    [from, to, lang],
  );
  return (
    <Text component="div" className={classes.diff} {...props}>
      {parts.map((part, index) => {
        const key = `${index}-${part.op}`;
        if (part.op === "delete")
          return (
            <del key={key} className={classes.delete}>
              {part.text}
            </del>
          );
        if (part.op === "insert")
          return (
            <ins key={key} className={classes.insert}>
              {part.text}
            </ins>
          );
        return <span key={key}>{part.text}</span>;
      })}
    </Text>
  );
});
TextDiff.displayName = "TextDiff";
