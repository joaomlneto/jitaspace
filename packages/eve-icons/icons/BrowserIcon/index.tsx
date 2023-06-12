import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const BrowserIcon = createEveIconComponent({
  name: "Browser Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
