import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const UnknownIcon = createEveIconComponent({
  name: "Unknown Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
