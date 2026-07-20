---
"@jitaspace/eslint-config": patch
"@jitaspace/background-jobs": patch
---

Bring the monorepo to zero ESLint errors and establish a runnable Jest test baseline. ESLint now excludes generated client code (kubb output, generated icon components) and relaxes type-safety rules for test files only; `@jitaspace/background-jobs` is fully typed (the ESI/SDE scrapers no longer use `any`/unsafe access); per-package `test:coverage` scripts were added; and the `.githooks/pre-commit` lint gate is enabled and wired up via a root `prepare` script. No functional change.
