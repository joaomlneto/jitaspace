import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ShipHangarIcon = createEveIconComponent({
  name: "Ship Hangar Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
