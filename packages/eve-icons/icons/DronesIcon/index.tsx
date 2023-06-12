import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const DronesIcon = createEveIconComponent({
  name: "Drones Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
