import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const NotepadIcon = createEveIconComponent({
  name: "Notepad Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
