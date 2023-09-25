import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const PoliticsIcon = createEveIconComponent({
  name: "Politics Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
