import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SovereigntyIcon = createEveIconComponent({
  name: "Sovereignty Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
