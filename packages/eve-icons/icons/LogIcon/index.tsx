import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const LogIcon = createEveIconComponent({
  name: "Log Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
