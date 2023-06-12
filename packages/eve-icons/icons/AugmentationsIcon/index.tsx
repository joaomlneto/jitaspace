import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const AugmentationsIcon = createEveIconComponent({
  name: "Augmentations Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
