import { createEveIconComponent } from "../createIconComponent";
import IncarnaImage from "./incarna.png";
import RheaImage from "./rhea.png";

export const CalendarNeocomIcon = createEveIconComponent({
  name: "Calendar Neocom Icon",
  variants: {
    castor: IncarnaImage,
    incarna: IncarnaImage,
    rhea: RheaImage,
  },
});
