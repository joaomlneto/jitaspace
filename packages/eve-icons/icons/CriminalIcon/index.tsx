import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CriminalIcon = createEveIconComponent({
  name: "Criminal Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
