import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const InsuranceIcon = createEveIconComponent({
  name: "Insurance Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
