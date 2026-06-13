// The registry tests only exercise the declarative job config (ids, triggers),
// not the runtime env, so skip the zod env validation in env.ts.
process.env.SKIP_ENV_VALIDATION = "1";
