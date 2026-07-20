"use client";

import dynamic from "next/dynamic";

const MapCanvas = dynamic((): Promise<typeof import("./MapCanvas")> => import("./MapCanvas"), {
  ssr: false,
  loading: (): React.ReactElement => <div className="landing-map landing-map-loading" role="status">Cargando mapa…</div>,
});

export default function LandingMap(): React.ReactElement {
  return <MapCanvas />;
}
