import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ResearchIcon = createEveIconComponent({
  name: "Research Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
