import Image, { type ImageProps } from "next/image";

import RheaImage from "./rhea.png";

export function TrashEveIcon({ alt, ...otherProps }: Omit<ImageProps, "src">) {
  return <Image src={RheaImage} alt={alt ?? "Trash Icon"} {...otherProps} />;
}
