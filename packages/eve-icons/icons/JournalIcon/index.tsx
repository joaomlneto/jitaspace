import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const JournalIcon = createEveIconComponent({
  name: "Journal Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
