import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const NewsPostIcon = createEveIconComponent({
  name: "News Post Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
