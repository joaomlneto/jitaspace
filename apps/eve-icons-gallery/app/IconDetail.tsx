"use client";

import { useEffect, useRef, useState } from "react";

import type { EveIconComponent, EveIconMetadata } from "@jitaspace/eve-icons";

import type { Appearance } from "./icons";
import { iconFile } from "./icons";

interface Loaded {
  Component: EveIconComponent;
  /** Other exported names for the same icon (pre-generation aliases). */
  aliases: string[];
  /** Client files each native size was copied from. */
  sources: string[];
}

function isIcon(value: unknown): value is EveIconComponent {
  return typeof value === "function" && "icon" in value;
}

/**
 * Load the real component, plus where it came from. The whole package is
 * fetched on the first open (one chunk, then cached) so the grid itself only
 * needs the lightweight metadata and static PNGs.
 */
async function load(icon: EveIconMetadata): Promise<Loaded> {
  const icons = await import("@jitaspace/eve-icons");
  const exports = icons as unknown as Record<string, unknown>;
  const Component = exports[icon.component];
  if (!isIcon(Component)) throw new Error(`${icon.component} is not exported`);
  const aliases = Object.entries(exports)
    .filter(
      ([name, value]) =>
        name !== icon.component && isIcon(value) && value.icon.id === icon.id,
    )
    .map(([name]) => name);
  const sources = Component.icon.sources.map((source) => source.path);
  return { Component, aliases, sources };
}

function snippet(icon: EveIconMetadata, appearance: Appearance): string {
  const props = [`size={${appearance.size}}`];
  if (appearance.tint && icon.monochrome) {
    props.push(`color="${appearance.tint}"`);
  }
  return `import { ${icon.component} } from "@jitaspace/eve-icons";\n\n<${icon.component} ${props.join(" ")} />`;
}

export function IconDetail({
  icon,
  setLabel,
  appearance,
  onClose,
}: {
  icon: EveIconMetadata;
  setLabel: string;
  appearance: Appearance;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  // Reset the "Copied" label after a moment; the cleanup cancels the timer if
  // the panel closes first.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    // The parent keys this component by icon, so state starts empty for each.
    let cancelled = false;
    load(icon).then(
      (result) => {
        if (!cancelled) setLoaded(result);
      },
      (cause: unknown) => {
        if (!cancelled) setError(String(cause));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [icon]);

  const code = snippet(icon, appearance);
  const copy = () => {
    navigator.clipboard.writeText(code).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  const Component = loaded?.Component;
  const color = appearance.tint ?? undefined;

  return (
    <dialog
      ref={dialog}
      className="detail"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close();
      }}
      aria-labelledby="detail-title"
    >
      <div className="detail-body">
        <div className="detail-top">
          <h2 id="detail-title">
            <code>{icon.id}</code>
          </h2>
          <button
            type="button"
            className="close"
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </div>

        <div className="preview">
          {Component ? (
            <Component size={Math.max(appearance.size, 64)} color={color} />
          ) : (
            <span className="loading">{error ?? "Loading component…"}</span>
          )}
        </div>

        <div className="natives">
          {icon.sizes.map((width) => (
            <figure key={width}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconFile(icon, width)} alt="" width={width} />
              <figcaption>{width}px</figcaption>
            </figure>
          ))}
        </div>

        <div className="code">
          <pre>{code}</pre>
          <button type="button" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <dl>
          <dt>Component</dt>
          <dd>
            <code>{icon.component}</code>
          </dd>
          {loaded && loaded.aliases.length > 0 && (
            <>
              <dt>Also exported as</dt>
              <dd>
                <code>{loaded.aliases.join(", ")}</code>
              </dd>
            </>
          )}
          <dt>Set</dt>
          <dd>{setLabel}</dd>
          <dt>Tintable</dt>
          <dd>
            {icon.monochrome
              ? "Yes: the color prop recolours it"
              : "No: full-colour artwork, color is ignored"}
          </dd>
          <dt>Client files</dt>
          <dd>
            {loaded
              ? loaded.sources.map((source) => (
                  <code key={source} className="source">
                    {source}
                  </code>
                ))
              : "…"}
          </dd>
        </dl>
      </div>
    </dialog>
  );
}
