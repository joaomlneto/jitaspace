import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const AggressionIcon = createEveIconComponent({
  name: "Aggression Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
