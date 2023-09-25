import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ItemHangarIcon = createEveIconComponent({
  name: "Item Hangar Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
