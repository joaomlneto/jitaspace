export function getAvatarSize<
  Sizes extends Record<string, number>,
  Size extends string | number | undefined,
>({ size, sizes }: { size: Size; sizes: Sizes }): number {
  // if we don't have a size, and we don't have a default size, default to the biggest size
  if (!size) {
    return sizes["md"] ?? 1024;
  }

  if (size in sizes) {
    return sizes[size] as number;
  }

  if (typeof size === "number") {
    size;
  }

  return 1024;
}
