---
"@jitaspace/sde-utils": minor
"@jitaspace/background-jobs": minor
"@jitaspace/cli": patch
---

Decide SDE freshness by build number instead of the legacy S3 checksum file.

`SDE_CHECKSUM_URL` pointed at the old `fsd/`+`bsd/` S3 export, so its multi-line
digest could never equal `sdeZipChecksum()` of the flat archive we download from
`SDE_DOWNLOAD_URL` — the "archive is up to date" branch was dead and every call
re-downloaded ~100 MB. `ensureSdePresentAndExtracted` now compares CCP's SDE
build number (`x-sde-build-number` on the archive's redirect, falling back to
`latest.jsonl`) against the `_sde.yaml` inside the cached `sde.zip` or extracted
`sde/` folder, so both are reused when current and replaced when not — including
the extracted folder, which was previously skipped without any verification. A
stale folder is now wiped before re-extraction so files dropped between builds
can't survive and be read back as current data.

Adds `latestSdeBuild`, `sdeZipBuild` and `sdeFolderBuild`; removes
`SDE_CHECKSUM_URL` and `latestSdeLastModified`. `ensureSdePresentAndExtracted`
takes an options object (`onLog`, `onDownloadProgress`, `onExtractProgress`) in
place of its positional `onLog` callback, and the CLI now delegates to it rather
than keeping a second copy of the same logic.

`watch-sde` compares the published build number against the build recorded under
the `sde:ingest` Redis key. `ingest-sde-all` claims that key when it starts and
stamps it complete only after every step has succeeded, so the marker now means
"this build is really loaded" rather than "a trigger was sent": an ingest that
dies partway is retried once its claim goes stale, while an in-flight one still
suppresses a duplicate queued run. The build number comes from the archive's own
`_sde.yaml`, read through the extract the ingests already share.

The key replaces the previous `sde:last-modified-ingested`, so the first poll
after deploying runs one ingest — idempotent — and then settles.
