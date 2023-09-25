import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CorporationMembersIcon = createEveIconComponent({
  name: "Corporation Members Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
