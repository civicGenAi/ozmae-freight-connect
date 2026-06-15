import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import { format } from "date-fns";
import { MapPin } from "lucide-react";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Vite bundles leaflet's default marker images under hashed URLs; point the
// default icon at them so plain <Marker /> usages render correctly.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const currentIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:22px;height:22px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#F26B2A;opacity:0.35;animation:shipment-pulse 1.6s ease-out infinite;"></div>
      <div style="position:absolute;top:5px;left:5px;width:12px;height:12px;border-radius:50%;background:#F26B2A;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
    </div>
    <style>@keyframes shipment-pulse{0%{transform:scale(0.6);opacity:0.5;}100%{transform:scale(2.2);opacity:0;}}</style>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const checkpointIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:4px;background:#0f1d35;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);transform:rotate(45deg);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const historyIcon = L.divIcon({
  className: "",
  html: `<div style="width:9px;height:9px;border-radius:50%;background:#94a3b8;border:1.5px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.3);"></div>`,
  iconSize: [9, 9],
  iconAnchor: [4, 4],
});

export interface ShipmentMapPoint {
  lat: number;
  lng: number;
  location?: string | null;
  status?: string | null;
  update_text?: string;
  is_checkpoint?: boolean;
  checkpoint_type?: string | null;
  created_at: string;
}

export function ShipmentMap({ points, height = 320 }: { points: ShipmentMapPoint[]; height?: number }) {
  const validPoints = points.filter(
    (p) => typeof p.lat === "number" && typeof p.lng === "number" && !Number.isNaN(p.lat) && !Number.isNaN(p.lng)
  );

  if (validPoints.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 text-center"
        style={{ height }}
      >
        <MapPin className="h-6 w-6 text-muted-foreground" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Live location not available yet
        </p>
        <p className="text-[10px] text-muted-foreground max-w-xs px-6">
          The map will appear here as soon as a GPS-tagged progress update or checkpoint is logged for this shipment.
        </p>
      </div>
    );
  }

  const sorted = [...validPoints].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const path: [number, number][] = sorted.map((p) => [p.lat, p.lng]);
  const current = sorted[sorted.length - 1];

  return (
    <div className="overflow-hidden rounded-2xl border border-border" style={{ height }}>
      <MapContainer
        center={[current.lat, current.lng]}
        zoom={sorted.length > 1 ? 7 : 9}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {path.length > 1 && (
          <Polyline positions={path} pathOptions={{ color: "#F26B2A", weight: 3, dashArray: "6 8", opacity: 0.7 }} />
        )}
        {sorted.map((p, idx) => {
          const isLast = idx === sorted.length - 1;
          const icon = isLast ? currentIcon : p.is_checkpoint ? checkpointIcon : historyIcon;
          return (
            <Marker key={idx} position={[p.lat, p.lng]} icon={icon}>
              <Popup>
                <div className="space-y-1 text-xs">
                  <p className="font-bold uppercase tracking-wide">
                    {isLast ? "Current position" : p.is_checkpoint ? "Checkpoint" : "Past update"}
                  </p>
                  {p.location && <p>{p.location}</p>}
                  {p.is_checkpoint && p.checkpoint_type && (
                    <p className="text-muted-foreground capitalize">Type: {p.checkpoint_type.replace(/_/g, " ")}</p>
                  )}
                  {p.update_text && <p className="text-muted-foreground">{p.update_text}</p>}
                  <p className="text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
