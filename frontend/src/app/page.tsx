import localFont from "next/font/local";
import LandingPage from "./landing/LandingPage";
import "./landing/landing.css";

const barlow = localFont({
  src: [
    { path: "../../public/fonts/barlow-400.woff2", weight: "400" },
    { path: "../../public/fonts/barlow-500.woff2", weight: "500" },
    { path: "../../public/fonts/barlow-600.woff2", weight: "600" },
    { path: "../../public/fonts/barlow-700.woff2", weight: "700" },
    { path: "../../public/fonts/barlow-800.woff2", weight: "800" },
  ],
  variable: "--font-landing-barlow",
  display: "swap",
});

const graduate = localFont({ src: "../../public/fonts/graduate-400.woff2", variable: "--font-landing-graduate", display: "swap" });
const playfair = localFont({ src: "../../public/fonts/playfair-display-600.woff2", variable: "--font-landing-playfair", display: "swap" });

export default function HomePage(): React.ReactElement {
  return <div className={`${barlow.variable} ${graduate.variable} ${playfair.variable}`}><LandingPage /></div>;
}
