import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SecurityStatusIcon = createEveIconComponent({
  name: "Security Status Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
