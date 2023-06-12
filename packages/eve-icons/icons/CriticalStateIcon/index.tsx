import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CriticalStateIcon = createEveIconComponent({
  name: "Critical State Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
