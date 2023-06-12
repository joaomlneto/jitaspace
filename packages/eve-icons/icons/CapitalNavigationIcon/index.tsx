import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CapitalNavigationIcon = createEveIconComponent({
  name: "Capital Navigation Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
