import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const EveMailTagIcon = createEveIconComponent({
  name: "EVEMail Tag Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
