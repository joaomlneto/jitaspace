import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const JukeboxIcon = createEveIconComponent({
  name: "Jukebox Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
