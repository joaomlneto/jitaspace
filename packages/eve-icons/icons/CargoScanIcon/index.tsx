import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CargoScanIcon = createEveIconComponent({
  name: "Cargo Scan Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
