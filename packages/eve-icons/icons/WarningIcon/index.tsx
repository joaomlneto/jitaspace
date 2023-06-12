import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const WarningIcon = createEveIconComponent({
  name: "Warning Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
