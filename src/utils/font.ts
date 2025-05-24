import {
  Bebas_Neue,
  Montserrat,
  Poppins,
  Lato,
  Oswald,
  Roboto_Condensed,
  Raleway,
  Playfair_Display,
  Barlow,
  Anton,
} from "next/font/google";

export const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"] });
export const montserrat = Montserrat({ weight: "500", subsets: ["latin"] });
export const poppins = Poppins({ weight: "500", subsets: ["latin"] });
export const lato = Lato({ weight: "400", subsets: ["latin"] });
export const oswald = Oswald({ weight: "500", subsets: ["latin"] });
export const robotoCondensed = Roboto_Condensed({
  weight: "400",
  subsets: ["latin"],
});
export const raleway = Raleway({ weight: "500", subsets: ["latin"] });
export const playfairDisplay = Playfair_Display({
  weight: "600",
  subsets: ["latin"],
});
export const barlow = Barlow({ weight: "500", subsets: ["latin"] });
export const anton = Anton({ weight: "400", subsets: ["latin"] });

export const fontOptions = [
  { name: "Bebas Neue", value: "bebas-neue", font: bebasNeue },
  { name: "Montserrat", value: "montserrat", font: montserrat },
  { name: "Poppins", value: "poppins", font: poppins },
  { name: "Lato", value: "lato", font: lato },
  { name: "Oswald", value: "oswald", font: oswald },
  {
    name: "Roboto Condensed",
    value: "roboto-condensed",
    font: robotoCondensed,
  },
  { name: "Raleway", value: "raleway", font: raleway },
  {
    name: "Playfair Display",
    value: "playfair-display",
    font: playfairDisplay,
  },
  { name: "Barlow", value: "barlow", font: barlow },
  { name: "Anton", value: "anton", font: anton },
];
