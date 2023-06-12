import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CloneBayIcon = createEveIconComponent({
  name: "Clone Bay Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
