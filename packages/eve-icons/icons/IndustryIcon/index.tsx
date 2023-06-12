import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const IndustryIcon = createEveIconComponent({
  name: "Industry Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
