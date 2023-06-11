import { createEveIconComponent } from "../createIconComponent";
import IncarnaImage from "./incarna.png";
import RheaImage from "./rhea.png";

export const EveMailNeocomIcon = createEveIconComponent({
  name: "EVEMail Neocom Icon",
  variants: {
    castor: IncarnaImage,
    incarna: IncarnaImage,
    rhea: RheaImage,
  },
});
