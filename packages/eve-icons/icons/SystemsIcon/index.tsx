import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SystemsIcon = createEveIconComponent({
  name: "Systems Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
