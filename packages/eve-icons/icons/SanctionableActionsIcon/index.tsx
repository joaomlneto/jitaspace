import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SanctionableActionsIcon = createEveIconComponent({
  name: "Sanctionable Actions Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
