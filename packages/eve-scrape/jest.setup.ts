// These tests only exercise the declarative Inngest config (function registry),
// not the runtime env, so skip the zod env validation in client/env.ts.
process.env.SKIP_ENV_VALIDATION = "1";
