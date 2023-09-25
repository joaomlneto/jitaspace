import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MemberDelayIcon = createEveIconComponent({
  name: "Member Delay Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
