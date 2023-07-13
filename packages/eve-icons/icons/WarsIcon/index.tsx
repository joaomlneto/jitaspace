import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const WarsIcon = createEveIconComponent({
  name: "Wars Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
