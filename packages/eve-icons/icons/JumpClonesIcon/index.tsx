import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const JumpClonesIcon = createEveIconComponent({
  name: "Jump Clones Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
