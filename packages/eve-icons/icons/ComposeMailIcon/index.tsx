import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ComposeMailIcon = createEveIconComponent({
  name: "Compose EVEMail Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
