import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const AttributesIcon = createEveIconComponent({
  name: "Attributes Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
