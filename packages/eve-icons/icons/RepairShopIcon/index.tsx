import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const RepairShopIcon = createEveIconComponent({
  name: "Repair Shop Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
