import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const OtherIcon = createEveIconComponent({
  name: "Other Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
