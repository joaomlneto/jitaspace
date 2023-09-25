import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const LimitedEngagementIcon = createEveIconComponent({
  name: "Limited Engagement Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
