import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const AgentFinderIcon = createEveIconComponent({
  name: "Agent Finder Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
