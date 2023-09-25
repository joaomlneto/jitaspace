import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const KillReportIcon = createEveIconComponent({
  name: "Kill Report Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
