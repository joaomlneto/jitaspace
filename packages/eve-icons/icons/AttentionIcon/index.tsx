import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const AttentionIcon = createEveIconComponent({
  name: "Attention Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
