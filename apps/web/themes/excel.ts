import type { MantineColorsTuple } from "@mantine/core";
import { createTheme } from "@mantine/core";

import { contrastComponents, variantColorResolver } from "./contrast";
import classes from "./excel.module.css";
import { lightDark } from "./lightDark";
import { EXCEL_GRID } from "./wallpapers";

/**
 * Excel — for fun: the app as a spreadsheet.
 *
 * A white sheet ruled into Excel's default 64×20px cells under the green
 * title bar; Aptos (Excel's default since 2023) or Calibri where installed;
 * tables formatted like "Format as Table" (Table Style Medium 2: blue header
 * row, banded rows), headings like the Title / Heading 1–3 cell styles, and
 * hyperlinks in the Hyperlink style's blue. Square cells, a green focus
 * outline like the active cell's.
 *
 * Not an EVE theme: an override over the plain base theme, which ./index.ts
 * merges it over. Excel's dark mode supplies the dark scheme.
 */

const rem = (px: number): string => `${px / 16}rem`;

// No web font: Aptos and Calibri are Microsoft's, so the stack uses them where
// the system has them (Windows, or Office on a Mac) and falls back to Carlito
// (metric-compatible with Calibri) and the system UI font.
const font =
  'Aptos, Calibri, Carlito, "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif';
const displayFont = `"Aptos Display", "Calibri Light", ${font}`;

/* ---- Color tuples (index 0 = lightest … 9 = darkest) ---------- */

// Excel green. Shade 6, the brand green (#217346), is the light scheme's
// primary, with white text at 5.9:1; the dark one's is shade 4 (#57af7e),
// which reads at 5.8:1 as text on the dark sheet and takes black text when
// filled.
const excel: MantineColorsTuple = [
  "#e9f5ee",
  "#cde9d9",
  "#a6d6bb",
  "#7cc29b",
  "#57af7e",
  "#3c9a67",
  "#217346",
  "#1d6640",
  "#185c37",
  "#10432a",
];

// The sheet: white, or the #1f1f1f of Excel's dark mode.
const sheet = lightDark("#ffffff", "#1f1f1f");

// Office's neutral greys, for Mantine's `gray`: its dimmed text is gray.6,
// which in Mantine's own scale (#868e96) is 3.3:1 on white and 2.5:1 on the
// banded table rows. Office's secondary text, #605e5c, is 6.5:1 and 4.9:1.
const gray: MantineColorsTuple = [
  "#faf9f8",
  "#f3f2f1",
  "#edebe9",
  "#e1dfdd",
  "#c8c6c4",
  "#a19f9d",
  "#605e5c",
  "#484644",
  "#323130",
  "#201f1e",
];

/* ---- Theme --------------------------------------------------- */

export const excelTheme = createTheme({
  primaryColor: "excel",
  primaryShade: { light: 6, dark: 4 },
  colors: { excel, gray },
  // Readable text on every filled colour (./contrast.ts).
  autoContrast: true,
  variantColorResolver,

  white: "#ffffff",
  black: "#000000",

  fontFamily: font,
  headings: {
    fontFamily: displayFont,
    fontWeight: "700",
    sizes: {
      // The Title cell style is 18pt; Heading 1–3 are 15, 13 and 11pt.
      h1: { fontSize: rem(24), lineHeight: "1.3", fontWeight: "300" },
      h2: { fontSize: rem(20), lineHeight: "1.3" },
      h3: { fontSize: rem(17), lineHeight: "1.3" },
      h4: { fontSize: rem(15), lineHeight: "1.3" },
      h5: { fontSize: rem(14), lineHeight: "1.3" },
      h6: { fontSize: rem(13), lineHeight: "1.3" },
    },
  },

  // Square cells; buttons and inputs get Office's slight 2px rounding.
  defaultRadius: "xs",
  radius: {
    xs: rem(2),
    sm: rem(2),
    md: rem(4),
    lg: rem(4),
    xl: rem(8),
  },

  shadows: {
    xs: "0 0 0 1px rgba(0, 0, 0, 0.08)",
    sm: "0 1.6px 3.6px rgba(0, 0, 0, 0.13), 0 0.3px 0.9px rgba(0, 0, 0, 0.11)",
    md: "0 3.2px 7.2px rgba(0, 0, 0, 0.13), 0 0.6px 1.8px rgba(0, 0, 0, 0.11)",
    lg: "0 6.4px 14.4px rgba(0, 0, 0, 0.13), 0 1.2px 3.6px rgba(0, 0, 0, 0.11)",
    xl: "0 25.6px 57.6px rgba(0, 0, 0, 0.22), 0 4.8px 14.4px rgba(0, 0, 0, 0.18)",
  },

  focusRing: "auto",

  components: {
    ...contrastComponents,

    AppShell: {
      classNames: { header: classes.titleBar },
    },

    // A panel is a range of cells: the sheet's colour, a thin border.
    Paper: {
      defaultProps: { radius: 0, withBorder: true, bg: sheet },
    },
    Card: {
      defaultProps: { radius: 0, withBorder: true, bg: sheet },
    },

    Title: {
      classNames: { root: classes.title },
    },

    Anchor: {
      classNames: { root: classes.hyperlink },
    },

    Table: {
      defaultProps: {
        withTableBorder: true,
        withColumnBorders: true,
        striped: true,
        stripedColor: lightDark("#d9e1f2", "#22304a"),
        highlightOnHover: true,
        highlightOnHoverColor: lightDark("#c6efce", "#1f3d2b"),
      },
      classNames: { table: classes.table },
    },

    Tooltip: {
      defaultProps: { withArrow: true },
    },
  },

  // The gridlines, ruled into Excel's default 64×20px cells.
  other: {
    ...EXCEL_GRID,
  },
});
