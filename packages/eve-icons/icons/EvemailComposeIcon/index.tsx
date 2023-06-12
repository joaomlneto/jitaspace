import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const EvemailComposeIcon = createEveIconComponent({
  name: "EVEMail Compose Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
