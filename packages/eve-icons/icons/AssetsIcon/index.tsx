import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const AssetsIcon = createEveIconComponent({
  name: "Assets Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
