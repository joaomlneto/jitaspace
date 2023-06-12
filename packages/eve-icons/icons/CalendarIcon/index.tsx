import { createEveIconComponent } from "../createIconComponent";
import IncarnaImage from "./incarna.png";
import RheaImage from "./rhea.png";

export const CalendarIcon = createEveIconComponent({
  name: "Calendar Icon",
  variants: {
    castor: IncarnaImage,
    incarna: IncarnaImage,
    rhea: RheaImage,
  },
});
