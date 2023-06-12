import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const DroneBayIcon = createEveIconComponent({
  name: "Drone Bay Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
