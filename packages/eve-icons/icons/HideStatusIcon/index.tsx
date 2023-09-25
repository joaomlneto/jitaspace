import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const HideStatusIcon = createEveIconComponent({
  name: "Hide Status Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
