import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const BountyOfficeIcon = createEveIconComponent({
  name: "Bounty Office Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
