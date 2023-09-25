import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CorporationMapIcon = createEveIconComponent({
  name: "Corporation Map Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
