"use client";

import type { CSSProperties } from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { EveIconMetadata } from "@jitaspace/eve-icons";
import {
  EVE_ICON_SETS,
  EVE_ICONS,
  EVE_ICONS_BUILD,
} from "@jitaspace/eve-icons";

import type { Appearance } from "./icons";
import { IconDetail } from "./IconDetail";
import { bestWidth, iconFile, matches, shortName } from "./icons";

const SIZES = [16, 24, 32, 48, 64] as const;
const BACKGROUNDS = ["dark", "light", "checker"] as const;
type Background = (typeof BACKGROUNDS)[number];

const setLabels = new Map<string, string>(
  EVE_ICON_SETS.map((set) => [set.id, set.label]),
);
const byId = new Map<string, EveIconMetadata>(
  EVE_ICONS.map((icon) => [icon.id, icon]),
);

function writeUrl(query: string, set: string | null, icon: string | null) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (set) params.set("set", set);
  if (icon) params.set("icon", icon);
  const search = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${search ? `?${search}` : ""}`,
  );
}

function Tile({
  icon,
  appearance,
  onOpen,
}: {
  icon: EveIconMetadata;
  appearance: Appearance;
  onOpen: () => void;
}) {
  const src = iconFile(icon, bestWidth(icon, appearance.size));
  const box: CSSProperties = {
    width: appearance.size,
    height: appearance.size,
  };
  return (
    <button type="button" className="tile" onClick={onOpen} title={icon.id}>
      <span className="tile-art">
        {appearance.tint && icon.monochrome ? (
          <span
            className="tinted"
            style={{
              ...box,
              backgroundColor: appearance.tint,
              mask: `url("${src}") center / contain no-repeat`,
              WebkitMask: `url("${src}") center / contain no-repeat`,
            }}
          />
        ) : (
          // Static gallery: the PNGs are served as-is, there is nothing for
          // next/image to optimise.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" decoding="async" style={box} />
        )}
      </span>
      <span className="tile-name">{shortName(icon)}</span>
    </button>
  );
}

export function Gallery() {
  // The search, set filter and open icon live in the query string, so a view
  // can be shared. They are read once; afterwards the URL mirrors the state.
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [set, setSet] = useState<string | null>(() => {
    const value = params.get("set");
    return value && setLabels.has(value) ? value : null;
  });
  const [openId, setOpenId] = useState<string | null>(() => {
    const value = params.get("icon");
    return value && byId.has(value) ? value : null;
  });
  const [size, setSize] = useState<number>(32);
  const [tintOn, setTintOn] = useState(false);
  const [tintColor, setTintColor] = useState("#e8a33d");
  const [background, setBackground] = useState<Background>("dark");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    writeUrl(query, set, openId);
  }, [query, set, openId]);

  // "/" jumps to the search box, as on most icon sites.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || target?.closest("input, textarea")) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const deferredQuery = useDeferredValue(query);
  const searched = useMemo(
    () =>
      EVE_ICONS.filter((icon) =>
        matches(icon, setLabels.get(icon.set) ?? "", deferredQuery),
      ),
    [deferredQuery],
  );
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const icon of searched) {
      result.set(icon.set, (result.get(icon.set) ?? 0) + 1);
    }
    return result;
  }, [searched]);
  const visibleSets = EVE_ICON_SETS.filter(
    (entry) => (set === null || entry.id === set) && counts.get(entry.id),
  );

  const appearance: Appearance = { size, tint: tintOn ? tintColor : null };
  const openIcon = openId ? byId.get(openId) : undefined;
  const tintable = EVE_ICONS.filter((icon) => icon.monochrome).length;

  return (
    <div className="page" data-background={background}>
      <header className="masthead">
        <div className="title">
          <h1>EVE Icons</h1>
          <p>
            {EVE_ICONS.length} UI icons from the EVE Online client, build{" "}
            {EVE_ICONS_BUILD}, as React components in{" "}
            <code>@jitaspace/eve-icons</code>. {tintable} of them are
            single-colour glyphs you can tint.
          </p>
        </div>
      </header>

      <div className="toolbar" role="search">
        <input
          ref={searchRef}
          id="search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search icons, e.g. arrow, fleet, amarr   ( / )"
          aria-label="Search icons"
          autoComplete="off"
        />
        <div className="controls">
          <label className="control">
            <span>Size</span>
            <select
              id="size"
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            >
              {SIZES.map((option) => (
                <option key={option} value={option}>
                  {option}px
                </option>
              ))}
            </select>
          </label>
          <label className="control">
            <input
              id="tint"
              type="checkbox"
              checked={tintOn}
              onChange={(event) => setTintOn(event.target.checked)}
            />
            <span>Tint</span>
            <input
              id="tint-color"
              type="color"
              value={tintColor}
              onChange={(event) => {
                setTintColor(event.target.value);
                setTintOn(true);
              }}
              aria-label="Tint colour"
            />
          </label>
          <label className="control">
            <span>Background</span>
            <select
              id="background"
              value={background}
              onChange={(event) =>
                setBackground(event.target.value as Background)
              }
            >
              {BACKGROUNDS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <nav className="sets" aria-label="Filter by set">
          <button
            type="button"
            className="chip"
            aria-pressed={set === null}
            onClick={() => setSet(null)}
          >
            All <span className="count">{searched.length}</span>
          </button>
          {EVE_ICON_SETS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="chip"
              aria-pressed={set === entry.id}
              disabled={!counts.get(entry.id)}
              onClick={() => setSet(set === entry.id ? null : entry.id)}
            >
              {entry.label}{" "}
              <span className="count">{counts.get(entry.id) ?? 0}</span>
            </button>
          ))}
        </nav>
      </div>

      <main>
        {visibleSets.length === 0 && (
          <p className="empty">
            No icon matches “{deferredQuery}”. Try a shorter word, or clear the
            set filter.
          </p>
        )}
        {visibleSets.map((entry) => {
          const icons = searched.filter((icon) => icon.set === entry.id);
          return (
            <section
              key={entry.id}
              className="set"
              aria-labelledby={`set-${entry.id}`}
            >
              <div className="set-head">
                <h2 id={`set-${entry.id}`}>{entry.label}</h2>
                <span className="set-meta">
                  <code>{`${entry.id}/*`}</code> · {icons.length}
                </span>
                <p>{entry.description}</p>
              </div>
              <div
                className="grid"
                style={
                  { "--tile": `${Math.max(size + 64, 104)}px` } as CSSProperties
                }
              >
                {icons.map((icon) => (
                  <Tile
                    key={icon.id}
                    icon={icon}
                    appearance={appearance}
                    onOpen={() => setOpenId(icon.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <footer className="footer">
        <p>
          Unofficial fan project, not affiliated with or endorsed by CCP hf. or
          Fenris Creations. The icons are © CCP hf. (Fenris Creations), all
          rights reserved, and are not covered by the package&apos;s MIT
          licence: see its{" "}
          <a href="https://github.com/joaomlneto/jitaspace/blob/main/packages/eve-icons/LICENSE">
            LICENSE
          </a>
          .
        </p>
        <p>
          © 2014 CCP hf. All rights reserved. &quot;EVE&quot;, &quot;EVE
          Online&quot;, &quot;CCP&quot;, and all related logos and images are
          trademarks or registered trademarks of CCP hf.
        </p>
      </footer>

      {openIcon && (
        <IconDetail
          key={openIcon.id}
          icon={openIcon}
          setLabel={setLabels.get(openIcon.set) ?? openIcon.set}
          appearance={appearance}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
