import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ForwardIcon = createEveIconComponent({
  name: "Forward Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
