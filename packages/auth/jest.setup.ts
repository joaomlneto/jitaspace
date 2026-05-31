// Provide the env the package expects, before any module imports `./env`.
// @hapi/iron requires a password of at least 32 characters.
process.env.SKIP_ENV_VALIDATION = "1";
process.env.NEXTAUTH_SECRET = "0123456789abcdef0123456789abcdef";
process.env.EVE_CLIENT_ID = "test-client-id";
process.env.EVE_CLIENT_SECRET = "test-client-secret";
