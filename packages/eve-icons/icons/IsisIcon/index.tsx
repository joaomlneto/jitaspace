import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const IsisIcon = createEveIconComponent({
  name: "ISIS Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
