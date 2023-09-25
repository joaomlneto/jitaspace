import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CorporationDecorationsIcon = createEveIconComponent({
  name: "Corporation Decorations Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
