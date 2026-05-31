import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CCPGamesIcon = createEveIconComponent({
  name: "CCP Games Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
