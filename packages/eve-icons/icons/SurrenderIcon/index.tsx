import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SurrenderIcon = createEveIconComponent({
  name: "Surrender Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
