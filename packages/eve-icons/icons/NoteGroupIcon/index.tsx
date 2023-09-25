import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const NoteGroupIcon = createEveIconComponent({
  name: "Note Group Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
