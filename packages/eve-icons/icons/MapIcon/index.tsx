import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MapIcon = createEveIconComponent({
  name: "Map Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
