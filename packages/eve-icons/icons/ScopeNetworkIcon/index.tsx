import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ScopeNetworkIcon = createEveIconComponent({
  name: "Scope Network Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
