import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SkinsIcon = createEveIconComponent({
  name: "Skins Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
