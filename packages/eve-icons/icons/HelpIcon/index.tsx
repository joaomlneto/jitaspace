import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const HelpIcon = createEveIconComponent({
  name: "Help Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
