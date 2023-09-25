import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const NoteIcon = createEveIconComponent({
  name: "Note Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
