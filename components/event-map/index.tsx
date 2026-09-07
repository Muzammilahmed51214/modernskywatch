"use client"

import dynamic from "next/dynamic"

import type { EventMarker } from "./event-map"
import type { GeomagneticStorm, SolarFlare } from "@/lib/donki"

export type { EventMarker, EventSeverity } from "./event-map"

const EventMapCanvas = dynamic(() => import("./event-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#05070b] text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
})

export default function EventMap({
  markers,
  center,
  zoom,
  onMarkerSelect,
  searchTarget,
  spaceSelection,
}: {
  markers: EventMarker[]
  center: [number, number]
  zoom: number
  onMarkerSelect?: (marker: EventMarker) => void
  searchTarget?: [number, number] | null
  spaceSelection?: { type: "flare"; event: SolarFlare } | { type: "storm"; event: GeomagneticStorm } | null
}) {
  return (
    <EventMapCanvas
      markers={markers}
      center={center}
      zoom={zoom}
      onMarkerSelect={onMarkerSelect}
      searchTarget={searchTarget}
      spaceSelection={spaceSelection}
    />
  )
}
