import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const BiographyIcon = createEveIconComponent({
  name: "Biography Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
