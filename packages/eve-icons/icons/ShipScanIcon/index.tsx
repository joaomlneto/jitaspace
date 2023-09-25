import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ShipScanIcon = createEveIconComponent({
  name: "Ship Scan Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
