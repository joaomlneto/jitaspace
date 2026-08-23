/**
 * Thrown when EVE's SSO token endpoint rejects a token request.
 *
 * Carries the HTTP status and the RFC 6749 §5.2 error payload so callers can
 * tell a *permanent* failure from a *transient* one. The distinction matters:
 * `invalid_grant` means EVE will never honour this refresh token again (the
 * user revoked the application, or changed their password), so the only remedy
 * is re-authentication — whereas a 5xx is worth retrying. Without the payload
 * the two are indistinguishable, and a caller retries a doomed refresh forever.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
 */
export class EveSsoTokenError extends Error {
  /** HTTP status returned by the token endpoint. */
  readonly status: number;
  /** RFC 6749 `error` code, when the response carried a parseable JSON body. */
  readonly error?: string;
  /** RFC 6749 `error_description`, when present. */
  readonly errorDescription?: string;
  /** The raw response body, kept when it was not parseable JSON (EVE 5xx and CDN edges return HTML). */
  readonly body?: string;

  constructor(
    message: string,
    details: {
      status: number;
      error?: string;
      errorDescription?: string;
      body?: string;
    },
  ) {
    super(message);
    this.name = "EveSsoTokenError";
    this.status = details.status;
    this.error = details.error;
    this.errorDescription = details.errorDescription;
    this.body = details.body;
  }

  /**
   * True when EVE has permanently rejected the grant and retrying cannot help —
   * the user must authenticate again.
   */
  get requiresReauthentication(): boolean {
    return this.error === "invalid_grant";
  }
}

/**
 * Build an {@link EveSsoTokenError} from a failed token-endpoint response.
 *
 * Reads the body via `text()` and parses it inside a `try`, never with a bare
 * `response.json()`: EVE 5xx responses and CDN edge errors return HTML, and an
 * unguarded parse would replace a clean auth error with a `SyntaxError`.
 *
 * Internal — not part of the package's public API.
 */
export async function eveSsoTokenErrorFromResponse(
  response: Response,
  context: string,
): Promise<EveSsoTokenError> {
  let raw = "";
  try {
    raw = await response.text();
  } catch {
    // Body unreadable (already consumed, or the connection dropped). The status
    // on its own is still worth surfacing.
  }

  let error: string | undefined;
  let errorDescription: string | undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object") {
      const payload = parsed as Record<string, unknown>;
      if (typeof payload.error === "string") error = payload.error;
      if (typeof payload.error_description === "string") {
        errorDescription = payload.error_description;
      }
    }
  } catch {
    // Not JSON — the raw text is kept on the error instead.
  }

  const detail = errorDescription ?? error;
  return new EveSsoTokenError(
    detail
      ? `${context} (HTTP ${response.status}): ${detail}`
      : `${context} (HTTP ${response.status})`,
    {
      status: response.status,
      error,
      errorDescription,
      // Only keep the raw body when it told us nothing structured, so a well
      // formed error object does not carry a duplicate copy of itself.
      body: error === undefined && raw !== "" ? raw : undefined,
    },
  );
}
