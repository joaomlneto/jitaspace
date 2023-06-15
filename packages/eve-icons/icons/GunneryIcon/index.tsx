import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const GunneryIcon = createEveIconComponent({
  name: "Gunnery Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
