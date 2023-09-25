import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ChatChannelIcon = createEveIconComponent({
  name: "Chat Channel Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
