---
"@jitaspace/ui": patch
---

Make `MailLabelColorSelect` safe to server-render.

The random starting colour was picked in the `useState` initialiser, so the server and the client chose different ones and hydration mismatched on every uncontrolled mount. It now starts from a deterministic swatch and seeds the random one on mount.

Scope worth being precise about: the app's only consumer, `ManageMailLabelsModal`, spreads `form.getInputProps("color")` over a form whose `initialValues.color` is already randomised, so the component is always controlled there and the seeding path never runs. This fixes a latent defect in the component rather than a symptom users were seeing, which is why it carries no `@jitaspace/web` note.
