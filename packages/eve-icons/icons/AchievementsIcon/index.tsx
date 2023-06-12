import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const AchievementsIcon = createEveIconComponent({
  name: "Achievements Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
