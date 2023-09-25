import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const PersonalStandingsIcon = createEveIconComponent({
  name: "Personal Standings Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
