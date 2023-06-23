import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ChannelOperatorIcon = createEveIconComponent({
  name: "Channel Operator Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
