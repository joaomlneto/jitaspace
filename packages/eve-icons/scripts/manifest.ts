/** Shape of `manifest.json`, written by `sync.ts` and read by `generate.ts`. */
export interface Manifest {
  /** The EVE cluster the files were taken from. */
  server: string;
  /** The client build the files were taken from. */
  build: string;
  icons: ManifestIcon[];
}

export interface ManifestIcon {
  /** `<set>/<name>`, e.g. `system/arrow-down`. */
  id: string;
  set: string;
  name: string;
  /** Every file is a single-colour glyph, so the icon can be tinted. */
  monochrome: boolean;
  /** One entry per native size, smallest first. */
  files: ManifestFile[];
}

export interface ManifestFile {
  /** Path under `assets/`. */
  file: string;
  width: number;
  height: number;
  /** The client file it was copied from. */
  source: string;
  /** MD5 of the file, as listed in the client's resource index. */
  md5: string;
}
