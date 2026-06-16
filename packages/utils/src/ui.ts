export function getAvatarSize<
  Sizes extends Record<string, number>,
  Size extends string | number | undefined,
>({ size, sizes }: { size: Size; sizes: Sizes }): number {
  // if we don't have a size, and we don't have a default size, default to the biggest size
  if (!size) {
    return sizes.md ?? 1024;
  }

  if (size in sizes) {
    // `size in sizes` guarantees the entry exists; the `?? 1024` only satisfies
    // `noUncheckedIndexedAccess` (which widens the lookup to `number | undefined`)
    // and is never actually taken.
    return sizes[size] ?? 1024;
  }

  return 1024;
}
