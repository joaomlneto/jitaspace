import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const OpportunitiesTreeIcon = createEveIconComponent({
  name: "Opportunities Tree Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
