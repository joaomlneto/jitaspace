---
"@jitaspace/db": patch
---

Generate the Prisma client on `postinstall` so a bare `pnpm install` produces `prisma/generated/client` (previously only the `build` / `db:generate` scripts did). This unblocks build environments that install without running the repo build — e.g. the Trigger.dev native build server. `prisma generate` is offline, so no `DATABASE_URL` is required.
