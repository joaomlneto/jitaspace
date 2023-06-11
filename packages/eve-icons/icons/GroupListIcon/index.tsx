import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const GroupListIcon = createEveIconComponent({
  name: "Group List Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
