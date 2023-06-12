import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CharacterSheetIcon = createEveIconComponent({
  name: "Character Sheet Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
