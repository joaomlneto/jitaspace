import sharp from "sharp";

/**
 * Stamp a meta-group tier badge onto the top-left corner of a flat type icon,
 * reproducing what `images.evetech.net/types/{id}/icon` bakes in for Tech II,
 * faction, officer, … items. The bare resfile icon carries no badge — CCP's
 * client (and image server) composites the metaGroup's overlay at render time.
 *
 * Badge overlays are authored against a 64px icon (the corner triangles are
 * 16×16), so we scale the badge by `iconWidth / 64` and pin it to the (0, 0)
 * corner — matching the in-client convention at whatever native size the icon
 * happens to be.
 */
export async function compositeBadge(
  baseIcon: Buffer,
  badge: Buffer,
): Promise<Buffer> {
  const [baseMeta, badgeMeta] = await Promise.all([
    sharp(baseIcon).metadata(),
    sharp(badge).metadata(),
  ]);

  const scale = baseMeta.width / 64;
  const width = Math.max(1, Math.round(badgeMeta.width * scale));
  const height = Math.max(1, Math.round(badgeMeta.height * scale));

  const scaledBadge = await sharp(badge)
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();

  return sharp(baseIcon)
    .ensureAlpha()
    .composite([{ input: scaledBadge, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
