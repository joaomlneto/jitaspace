import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const FittingManagementIcon = createEveIconComponent({
  name: "Fitting Management Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
