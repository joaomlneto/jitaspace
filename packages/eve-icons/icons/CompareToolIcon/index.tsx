import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CompareToolIcon = createEveIconComponent({
  name: "Compare Tool Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
