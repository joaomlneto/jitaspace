import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ReprocessingIcon = createEveIconComponent({
  name: "Reprocessing Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
