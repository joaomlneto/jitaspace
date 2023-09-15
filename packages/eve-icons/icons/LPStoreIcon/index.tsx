import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const LPStoreIcon = createEveIconComponent({
  name: "LP Store Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
