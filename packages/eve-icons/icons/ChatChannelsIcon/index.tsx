import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ChatChannelsIcon = createEveIconComponent({
  name: "Chat Channels Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
