import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SubSystemsIcon = createEveIconComponent({
  name: "SubSystems Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
