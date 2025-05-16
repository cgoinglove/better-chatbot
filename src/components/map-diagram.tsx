"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "ui/button";
import { Clipboard, CheckIcon } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "lib/utils";
import dynamic from "next/dynamic";

interface MapDiagramProps {
  content: string;
}

interface MapConfig {
  center: [number, number];
  zoom: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
  }>;
}

// We need to parse the map configuration from the markdown code block content
const parseMapConfig = (content: string): MapConfig => {
  try {
    // The content will be in YAML-like format
    const config: Partial<MapConfig> = {}; // Use Partial for initial construction

    // Simple parser for the expected format
    const lines = content.split("\n");

    lines.forEach((line) => {
      // Skip empty lines
      if (!line.trim()) return;

      const [key, ...valueParts] = line.split(":");
      const valuePart = valueParts.join(":").trim();

      if (key === "center") {
        // Parse center coordinates [lat, lng]
        const coords = valuePart.replace("[", "").replace("]", "").split(",").map(Number);
        if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          config.center = [coords[0], coords[1]];
        }
      } else if (key === "zoom") {
        const zoomNum = Number(valuePart);
        if (!isNaN(zoomNum)) {
          config.zoom = zoomNum;
        }
      } else if (key === "markers") {
        config.markers = [];
        // This is a simple implementation - a proper one would parse the YAML structure
        // For now, we'll look for lines with position: in them
        let currentIndex = lines.indexOf(line) + 1;
        while (currentIndex < lines.length) {
          const markerLine = lines[currentIndex];
          if (markerLine.includes("position:")) {
            const positionPart = markerLine.split("position:")[1].trim();
            const coords = positionPart
              .replace("[", "")
              .replace("]", "")
              .split(",")
              .map(Number);

            // Look for popup on the next line
            let popup = "";
            if (
              currentIndex + 1 < lines.length &&
              lines[currentIndex + 1].includes("popup:")
            ) {
              popup = lines[currentIndex + 1].split("popup:")[1].trim().replace(/"/g, "");
              currentIndex++; // Consume the popup line
            } else if (
              currentIndex + 1 < lines.length &&
              !lines[currentIndex + 1].trim().startsWith("-") &&
              !lines[currentIndex + 1].includes("position:") &&
              lines[currentIndex + 1].trim() !== "" // if next line is not a new marker or empty
            ) {
              // This handles multi-line popups if they are not explicitly keyed
              // This part is a bit fragile and depends on strict formatting
            }

            if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
              config.markers?.push({
                position: [coords[0], coords[1]],
                popup,
              });
            }
          } else if (!markerLine.trim().startsWith(" ") && markerLine.trim() !== "") {
            // If we encounter a line that's not indented and not empty, assume end of markers for this block
            break;
          }
          currentIndex++;
        }
      }
    });

    // Set defaults if not provided
    const finalConfig: MapConfig = {
      center: config.center || [51.505, -0.09], // London
      zoom: config.zoom || 13,
      markers: config.markers || [], // Ensure markers is always an array
    };

    return finalConfig;
  } catch (error) {
    console.error("Error parsing map configuration:", error);
    return {
      center: [51.505, -0.09], // Default to London
      zoom: 13,
      markers: [], // Ensure markers is an array even in error case
    };
  }
};

// We need to use NoSSR for the map component because Leaflet requires the window object
const DynamicMap = ({ config }: { config: MapConfig }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Add custom CSS for Leaflet markers
    const addLeafletStyles = () => {
      // Check if the style already exists
      if (!document.getElementById("leaflet-style-fix")) {
        const style = document.createElement("style");
        style.id = "leaflet-style-fix";
        style.innerHTML = `
          .leaflet-default-icon-path {
            background-image: url(https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png);
          }
          .leaflet-marker-icon {
            background-image: url(https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png);
            background-size: contain;
          }
        `;
        document.head.appendChild(style);
      }
    };

    // Dynamically import Leaflet only on the client side
    const initializeMap = async () => {
      // Import Leaflet dynamically
      const L = (await import("leaflet")).default;

      // Add Leaflet styles
      addLeafletStyles();

      // Make sure the map container exists
      if (!mapRef.current) return;

      // Clean up any existing map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Create the map
      const map = L.map(mapRef.current).setView(config.center, config.zoom);
      mapInstanceRef.current = map;

      // Add the tile layer (OpenStreetMap)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Fix for marker icon paths in Leaflet
      const defaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      L.Marker.prototype.options.icon = defaultIcon;

      // Add markers if they exist
      if (config.markers && config.markers.length > 0) {
        config.markers.forEach((marker) => {
          const markerObj = L.marker(marker.position).addTo(map);
          if (marker.popup) {
            markerObj.bindPopup(marker.popup);
          }
        });
      }

      // Ensure the map renders correctly by triggering a resize after it's visible
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    initializeMap();

    // Clean up function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [config]);

  return (
    <>
      {/* Import Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <div
        ref={mapRef}
        style={{ height: "400px", width: "100%" }}
        className="map-container relative z-0"
        id={`map-${Math.random().toString(36).substr(2, 9)}`} // Add unique ID to prevent conflicts
      />
    </>
  );
};

export function MapDiagram({ content }: MapDiagramProps) {
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useCopy();
  const [config, setConfig] = useState<MapConfig | null>(null); // Use MapConfig type
  const [mapKey, setMapKey] = useState<string>(
    Math.random().toString(36).substring(2, 11),
  );

  useEffect(() => {
    try {
      const parsedConfig = parseMapConfig(content);
      setConfig(parsedConfig);
      // Generate a new key when content changes to force a complete remount
      setMapKey(Math.random().toString(36).substring(2, 11));
      setError(null);
    } catch (err) {
      console.error("Map configuration error:", err);
      setError(err instanceof Error ? err.message : "Failed to parse map configuration");
    }
  }, [content]);

  // Use dynamic import to avoid SSR issues with Leaflet
  const NoSSRMap = dynamic(() => Promise.resolve(DynamicMap), {
    ssr: false,
    loading: () => (
      <div className="animate-pulse flex items-center justify-center h-80 w-full">
        <div className="text-sm text-muted-foreground">Loading map...</div>
      </div>
    ),
  });

  return (
    <div className="relative bg-accent/30 flex flex-col rounded-2xl overflow-hidden border">
      <div className="w-full flex z-20 py-2 px-4 items-center">
        <span className="text-sm text-muted-foreground">map</span>
        <Button
          size="icon"
          variant={copied ? "secondary" : "ghost"}
          className="ml-auto z-10 p-3! size-2! rounded-sm"
          onClick={() => {
            copy(content);
          }}
        >
          {copied ? <CheckIcon /> : <Clipboard className="size-3!" />}
        </Button>
      </div>
      <div className="px-6 pb-6">
        {error ? (
          <div className="text-red-500 p-4">
            <p>Error rendering map:</p>
            <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs overflow-auto">
              {error}
            </pre>
            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
              {content}
            </pre>
          </div>
        ) : (
          <div className={cn("flex justify-center transition-opacity")}>
            {config && <NoSSRMap key={mapKey} config={config} />}
          </div>
        )}
      </div>
    </div>
  );
}
