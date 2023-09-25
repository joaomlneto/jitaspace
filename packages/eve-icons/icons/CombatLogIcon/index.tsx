import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CombatLogIcon = createEveIconComponent({
  name: "Combat Log Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
