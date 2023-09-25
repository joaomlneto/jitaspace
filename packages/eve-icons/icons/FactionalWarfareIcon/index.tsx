import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const FactionalWarfareIcon = createEveIconComponent({
  name: "Factional Warfare Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
