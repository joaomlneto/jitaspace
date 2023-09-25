import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const TutorialIcon = createEveIconComponent({
  name: "Tutorial Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
