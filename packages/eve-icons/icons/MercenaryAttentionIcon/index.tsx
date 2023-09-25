import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MercenaryAttentionIcon = createEveIconComponent({
  name: "Mercenary Attention Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
