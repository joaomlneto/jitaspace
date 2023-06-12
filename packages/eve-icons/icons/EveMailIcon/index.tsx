import { createEveIconComponent } from "../createIconComponent";
import IncarnaImage from "./incarna.png";
import RheaImage from "./rhea.png";

export const EveMailIcon = createEveIconComponent({
  name: "EVEMail Icon",
  variants: {
    castor: IncarnaImage,
    incarna: IncarnaImage,
    rhea: RheaImage,
  },
});
