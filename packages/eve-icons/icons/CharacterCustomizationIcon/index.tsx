import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CharacterCustomizationIcon = createEveIconComponent({
  name: "Character Customization Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
