import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CargoIcon = createEveIconComponent({
  name: "Cargo Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
