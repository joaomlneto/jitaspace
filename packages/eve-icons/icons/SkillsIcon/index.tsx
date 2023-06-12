import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SkillsIcon = createEveIconComponent({
  name: "Skills Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
