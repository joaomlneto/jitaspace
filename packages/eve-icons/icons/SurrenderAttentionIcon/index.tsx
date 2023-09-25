import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SurrenderAttentionIcon = createEveIconComponent({
  name: "Surrender Attention Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
