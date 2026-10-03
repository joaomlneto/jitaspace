/**
 * The operators that publish an EVE Online client. CCP runs the global clusters
 * (Tranquility, Singularity) from its own CDN; NetEase runs the Chinese clusters
 * (Serenity, Infinity) from a different set of hosts. See {@link PROVIDER_ENDPOINTS}.
 */
export type EveProvider = "ccp" | "netease";

/** EVE Online server clusters that publish a build pointer. */
export type EveServer = "tranquility" | "singularity" | "serenity" | "infinity";

/** Client platform whose resource set to browse. */
export type EvePlatform = "macos" | "windows";

/**
 * The CCP-operated clusters — the subset whose build history is tracked (via
 * hoboleaks) in {@link KNOWN_BUILDS}. The NetEase
 * clusters publish browsable assets but have no equivalent patch-history source.
 */
export const CCP_SERVERS = ["tranquility", "singularity"] as const;
export type CcpServer = (typeof CCP_SERVERS)[number];

/** Narrow an {@link EveServer} to a {@link CcpServer} (one with tracked history). */
export function isCcpServer(server: EveServer): server is CcpServer {
  return (CCP_SERVERS as readonly string[]).includes(server);
}

/**
 * The four CDN hosts a provider serves its files from. CCP collapses
 * metadata/index/app onto one host (`binaries.eveonline.com`) and serves
 * `res:/` assets from another (`resources.eveonline.com`); NetEase splits all
 * four. Every base URL ends in `/` so it concatenates directly with a hashed
 * relative path (or a pointer / app-index filename).
 */
export interface ProviderEndpoints {
  /** Base for the `eveclient_<token>.json` build-pointer document. */
  metadataBaseUrl: string;
  /** Base for the `<prefix><build>.txt` app-index file. */
  indexBaseUrl: string;
  /** Base for content-addressed `app:/` files (binaries, resfile indexes). */
  appBaseUrl: string;
  /** Base for content-addressed `res:/` asset files. */
  resBaseUrl: string;
}

export const PROVIDER_ENDPOINTS: Record<EveProvider, ProviderEndpoints> = {
  ccp: {
    metadataBaseUrl: "https://binaries.eveonline.com/",
    indexBaseUrl: "https://binaries.eveonline.com/",
    appBaseUrl: "https://binaries.eveonline.com/",
    resBaseUrl: "https://resources.eveonline.com/",
  },
  // EVE China (NetEase). Verified live 2026-06-21: the build pointers, the
  // `eveonline_<build>.txt` app index (identical layout to CCP — same
  // `app:/resfileindex.txt` / `_Windows` overlay), and the
  // content-addressed app/res files all resolve from these hosts.
  netease: {
    metadataBaseUrl:
      "https://eve-china-version-files.oss-cn-hangzhou.aliyuncs.com/",
    indexBaseUrl:
      "https://eve-china-version-files.oss-cn-hangzhou.aliyuncs.com/",
    appBaseUrl: "https://ma79.gdl.netease.com/eve/binaries/",
    resBaseUrl: "https://ma79.gdl.netease.com/eve/resources/",
  },
};

/**
 * Per-server configuration: which provider operates it, and the token CCP /
 * NetEase use in the `eveclient_<token>.json` pointer filename.
 */
export interface ServerConfig {
  /** The operator whose {@link ProviderEndpoints} this server's files live on. */
  provider: EveProvider;
  /** Token in the pointer filename: `eveclient_<metadataToken>.json`. */
  metadataToken: string;
  /** Human-readable cluster name. */
  name: string;
  /** Whether the token has been confirmed against the live CDN. */
  confirmedToken: boolean;
  /** Access-restricted cluster (the pointer / CDN may 403 without credentials). */
  protected?: boolean;
}

export const SERVER_CONFIG: Record<EveServer, ServerConfig> = {
  tranquility: {
    provider: "ccp",
    metadataToken: "TQ",
    name: "Tranquility",
    confirmedToken: true,
  },
  singularity: {
    provider: "ccp",
    metadataToken: "SISI",
    name: "Singularity",
    confirmedToken: true,
  },
  serenity: {
    provider: "netease",
    metadataToken: "SERENITY",
    name: "Serenity",
    confirmedToken: true,
  },
  infinity: {
    provider: "netease",
    metadataToken: "INFINITY",
    name: "Infinity",
    confirmedToken: true,
  },
};

/** The provider that operates a server cluster. */
export function providerOf(server: EveServer): EveProvider {
  return SERVER_CONFIG[server].provider;
}

/** The CDN endpoints for the provider that operates a server cluster. */
export function serverEndpoints(server: EveServer): ProviderEndpoints {
  return PROVIDER_ENDPOINTS[providerOf(server)];
}

/**
 * Base URL for CCP's "app" files (game binaries, plus the resfile index itself),
 * content-addressed by a hashed relative path. Convenience alias for the CCP
 * provider's {@link ProviderEndpoints.appBaseUrl}; per-server resolution should
 * go through {@link serverEndpoints} / {@link binariesUrl} instead.
 */
export const BINARIES_BASE_URL = PROVIDER_ENDPOINTS.ccp.appBaseUrl;

/**
 * Base URL for CCP's "res" files (game assets: textures, models, static data,
 * localization, audio, ...), content-addressed by a hashed path. Convenience
 * alias for the CCP provider's {@link ProviderEndpoints.resBaseUrl}.
 *
 * Note: the CDN serves these files *uncompressed* (the `content-type:
 * application/gzip` header it sometimes returns is bogus — trust the `res:/`
 * file extension instead).
 */
export const RESOURCES_BASE_URL = PROVIDER_ENDPOINTS.ccp.resBaseUrl;

/** Virtual path of the base resource-file index within the Windows app index. */
export const RESFILE_INDEX_PATH = "app:/resfileindex.txt";

/**
 * Virtual path of the **Windows-specific** resource-file index — an overlay of
 * resources that ship only with the Windows client (the DX11/DX12 compiled
 * shaders). The Windows resource set is the base index + this overlay.
 */
export const RESFILE_INDEX_WINDOWS_PATH = "app:/resfileindex_Windows.txt";

/**
 * Where a given platform's resources live on the CDN. EVE ships a *separate*
 * app index per platform — `eveonline_<build>.txt` (Windows) vs
 * `eveonlinemacOS_<build>.txt` (macOS) — each with native binaries and its own
 * pair of resfile indexes. The base resfile index has
 * identical *contents* on both platforms (same md5, different hashed path); the
 * real per-platform difference is the binary tree and the shader overlay
 * (`effect.dx11` on Windows, `effect.metal` on macOS).
 *
 * This layout is provider-agnostic: the NetEase (Windows-only) clients use the
 * same `eveonline_<build>.txt` prefix and `app:/resfileindex.txt` paths.
 */
export interface PlatformResourceLayout {
  /** App-index filename prefix: `<prefix><build>.txt` under {@link ProviderEndpoints.indexBaseUrl}. */
  appIndexPrefix: string;
  /** Virtual path of the base resfile index inside this platform's app index. */
  resfileIndexPath: string;
  /** Virtual path of the platform-specific resfile overlay (compiled shaders). */
  resfileOverlayPath: string;
}

export const PLATFORM_LAYOUT: Record<EvePlatform, PlatformResourceLayout> = {
  windows: {
    appIndexPrefix: "eveonline_",
    resfileIndexPath: RESFILE_INDEX_PATH,
    resfileOverlayPath: RESFILE_INDEX_WINDOWS_PATH,
  },
  macos: {
    appIndexPrefix: "eveonlinemacOS_",
    resfileIndexPath: "app:/EVE.app/Contents/Resources/build/resfileindex.txt",
    resfileOverlayPath:
      "app:/EVE.app/Contents/Resources/build/resfileindex_macOS.txt",
  },
};

/**
 * Default platform when a caller doesn't specify one. Windows is the historical
 * default — `fetchAppIndex`/`fetchResfileIndex` have always fetched
 * `eveonline_<build>.txt` — so non-platform-aware callers (history diffs, icon
 * resolution, the CLI sweeps) keep their existing behaviour.
 */
export const DEFAULT_PLATFORM: EvePlatform = "windows";

/** The `eveclient_<token>.json` build-pointer filename for a server. */
export function pointerFilename(server: EveServer): string {
  return `eveclient_${SERVER_CONFIG[server].metadataToken}.json`;
}

/**
 * The per-server "current build" pointer document, relative to that server's
 * {@link ProviderEndpoints.metadataBaseUrl}. e.g. `eveclient_TQ.json`.
 */
export const EVE_CLIENT_POINTER: Record<EveServer, string> = {
  tranquility: pointerFilename("tranquility"),
  singularity: pointerFilename("singularity"),
  serenity: pointerFilename("serenity"),
  infinity: pointerFilename("infinity"),
};
