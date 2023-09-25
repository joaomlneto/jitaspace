import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MemberIcon = createEveIconComponent({
  name: "Member Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
