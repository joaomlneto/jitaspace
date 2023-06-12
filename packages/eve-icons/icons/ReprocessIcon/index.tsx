import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ReprocessIcon = createEveIconComponent({
  name: "Reprocess Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
