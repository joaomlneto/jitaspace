import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ReactionsIcon = createEveIconComponent({
  name: "Reactions Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
