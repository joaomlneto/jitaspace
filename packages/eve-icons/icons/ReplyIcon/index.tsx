import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ReplyIcon = createEveIconComponent({
  name: "Reply Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
