import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const StationIcon = createEveIconComponent({
  name: "Station Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
