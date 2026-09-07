"use client"

import "leaflet/dist/leaflet.css"
import "./event-map.css"

import { useEffect } from "react"
import { Circle, CircleMarker, MapContainer, Popup, Rectangle, TileLayer, useMap } from "react-leaflet"
import type { SkywatchEvent } from "@/lib/eonet"
import type { GeomagneticStorm, SolarFlare } from "@/lib/donki"

export type EventSeverity = "high" | "med" | "low"
export type EventMarker = SkywatchEvent

const severityColors: Record<EventSeverity, string> = {
  high: "#f43f5e",
  med: "#f59e0b",
  low: "#22d3ee",
}

type EventMapProps = {
  markers: EventMarker[]
  center: [number, number]
  zoom: number
  onMarkerSelect?: (marker: EventMarker) => void
  searchTarget?: [number, number] | null
  spaceSelection?: { type: "flare"; event: SolarFlare } | { type: "storm"; event: GeomagneticStorm } | null
}

function subsolarLongitude(peakTime: string): number {
  const timestamp = new Date(peakTime)
  if (Number.isNaN(timestamp.getTime())) return 0
  const utcHour = timestamp.getUTCHours() + timestamp.getUTCMinutes() / 60
  return ((12 - utcHour) * 15 + 540) % 360 - 180
}

function auroralLatitude(kpIndex: number | null): number {
  if (kpIndex === null) return 65
  if (kpIndex >= 9) return 40
  if (kpIndex >= 7) return 50
  if (kpIndex >= 5) return 60
  return 65
}

function MapController({ center, zoom, searchTarget, spaceSelection }: Pick<EventMapProps, "center" | "zoom" | "searchTarget" | "spaceSelection">) {
  const map = useMap()

  useEffect(() => {
    map.flyTo(center, zoom, { animate: true, duration: 0.8 })
  }, [center, map, zoom])

  useEffect(() => {
    if (searchTarget) map.flyTo(searchTarget, 10, { animate: true, duration: 1.2 })
  }, [map, searchTarget])

  useEffect(() => {
    if (spaceSelection) map.flyTo([0, 0], 2, { animate: true, duration: 1.1 })
  }, [map, spaceSelection])

  return null
}

export default function EventMap({
  markers,
  center,
  zoom,
  onMarkerSelect,
  searchTarget,
  spaceSelection = null,
}: EventMapProps) {
  return (
    <MapContainer
      className="event-map"
      center={[0, 0]}
      zoom={2}
      minZoom={2}
      worldCopyJump
      zoomControl={false}
      attributionControl
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
      <MapController center={center} zoom={zoom} searchTarget={searchTarget} spaceSelection={spaceSelection} />
      {spaceSelection?.type === "flare" ? (
        <Circle
          center={[0, subsolarLongitude(spaceSelection.event.peakTime)]}
          radius={5_000_000}
          pathOptions={{
            color: spaceSelection.event.severity === "high" ? "#f43f5e" : "#f59e0b",
            fillColor: spaceSelection.event.severity === "high" ? "#f43f5e" : "#f59e0b",
            fillOpacity: 0.18,
            weight: 2,
          }}
        >
          <Popup>Solar flare {spaceSelection.event.classType} impact zone</Popup>
        </Circle>
      ) : null}
      {spaceSelection?.type === "storm" ? (
        <>
          <Rectangle
            bounds={[[auroralLatitude(spaceSelection.event.kpIndex), -180], [90, 180]]}
            pathOptions={{ color: "#a855f7", fillColor: "#22c55e", fillOpacity: 0.16, weight: 2 }}
          >
            <Popup>North auroral oval · Kp {spaceSelection.event.kpIndex ?? "--"}</Popup>
          </Rectangle>
          <Rectangle
            bounds={[[-90, -180], [-auroralLatitude(spaceSelection.event.kpIndex), 180]]}
            pathOptions={{ color: "#a855f7", fillColor: "#22c55e", fillOpacity: 0.16, weight: 2 }}
          >
            <Popup>South auroral oval · Kp {spaceSelection.event.kpIndex ?? "--"}</Popup>
          </Rectangle>
        </>
      ) : null}
      {markers.map((marker) => {
        const color = severityColors[marker.severity ?? "low"]
        return (
          <CircleMarker
            key={marker.id}
            center={marker.position}
            radius={8}
            eventHandlers={{ click: () => onMarkerSelect?.(marker) }}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            {(marker.title || marker.detail || marker.kind) && (
              <Popup>
                {marker.kind ? (
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {marker.kind}
                  </p>
                ) : null}
                {marker.title ? (
                  <p className="text-sm font-semibold leading-tight">{marker.title}</p>
                ) : null}
                {marker.detail ? (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {marker.detail}
                  </p>
                ) : null}
                {marker.region || marker.time || marker.metric ? (
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {[marker.region, marker.time, marker.metric].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </Popup>
            )}
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
