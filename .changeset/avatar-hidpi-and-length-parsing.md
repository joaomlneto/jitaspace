---
"@jitaspace/utils": patch
"@jitaspace/ui": patch
---

Follow-ups from an independent review of the avatar-size fix.

**HiDPI.** Requesting an image at the avatar's CSS pixel size left six avatars between 48px and 128px upscaled on 2x displays, where the old 1024 fallback had made them crisp by accident. `EveImageServerAvatar` now emits a `srcSet` with `1x` and `2x` candidates, so the browser picks by its own `devicePixelRatio` and still fetches exactly one image. Reading `devicePixelRatio` in JS instead would either mismatch on hydration or download the 1x image before upgrading it. The candidate is dropped when both collapse to the same URL at the clamp's floor or ceiling.

**Non-positive lengths.** `getAvatarSize({ size: 0 })` fell back to the default size but `getAvatarSize({ size: "0" })` returned 1024 — the exact over-fetch the original fix set out to remove. `parseCssLength` now reports a readable-but-non-positive length as its own value so both paths reach the default; only genuinely unreadable values (`"auto"`, `"100%"`) keep the 1024 fallback.

**Unit case.** CSS units are case-insensitive; the pattern was not, so `"16PX"` resolved to 1024. It now matches case-insensitively. `em` remains approximated as `rem`, which is documented at the helper — it is relative to the element's own font size, which is not knowable there, and the approximation beats the unreadable fallback.
