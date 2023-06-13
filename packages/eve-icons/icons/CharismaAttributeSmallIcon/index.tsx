import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CharismaAttributeSmallIcon = createEveIconComponent({
  name: "Charisma Attribute Small Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
