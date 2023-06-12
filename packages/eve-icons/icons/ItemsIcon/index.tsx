import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ItemsIcon = createEveIconComponent({
  name: "Items Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
