import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const AgentIcon = createEveIconComponent({
  name: "Agent Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
