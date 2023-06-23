import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const RecruitmentIcon = createEveIconComponent({
  name: "Recruitment Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
