"use client"

import { FormEvent, useEffect, useState } from "react"
import EventMap from "@/components/event-map"
import type { SkywatchEvent } from "@/lib/eonet"
import type { GeomagneticStorm, SolarFlare, SpaceSeverity } from "@/lib/donki"
import {
  Sun,
  Globe2,
  Activity,
  Radio,
  Satellite as SatelliteIcon,
  Bell,
  History,
  Maximize2,
  Plus,
  Minus,
  Crosshair,
  ListFilter,
  Search,
  ShieldAlert,
  AlertTriangle,
  Compass,
  Gauge,
  X,
  type LucideIcon,
} from "lucide-react"

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ")
}

export type DashboardPanel = "overview" | "solar" | "satellites" | "alerts" | "telemetry" | "history"

type Severity = SkywatchEvent["severity"]
type EventFilter = "all" | "wildfires" | "severe"
type HistoricalYear = 2023 | 2024 | 2025 | 2026
type SpaceView = "flares" | "storms"

type SpaceWeather = {
  flares: SolarFlare[]
  storms: GeomagneticStorm[]
}

type SpaceSelection =
  | { type: "flare"; event: SolarFlare }
  | { type: "storm"; event: GeomagneticStorm }
  | null

type Telemetry = {
  aqi: number | null
  pm25: number | null
  windDirection: number | null
  windSpeed: number | null
  loading: boolean
  error: boolean
}

type Satellite = {
  id: string
  name: string
  code: string
  orbitType: "LEO" | "SSO" | "GEO" | "POLAR"
  altitudeKm: number
  velocityKms: number
  inclinationDeg: number
  downlink: string
  batteryPct: number
  sensorPayload: string
  status: "NOMINAL" | "TRACKING" | "DOWNLINK" | "CALIBRATING"
  position: [number, number]
  signalBars: number
  operator: string
}

const SATELLITE_FLEET: Satellite[] = [
  {
    id: "nvx-72",
    name: "NVX-72 RECON",
    code: "NVX-72",
    orbitType: "SSO",
    altitudeKm: 820,
    velocityKms: 7.42,
    inclinationDeg: 98.6,
    downlink: "8.4 GHz X-Band",
    batteryPct: 98,
    sensorPayload: "Dual Fluxgate Magnetometer · Solar EUV Array",
    status: "NOMINAL",
    position: [45.5, -122.6],
    signalBars: 5,
    operator: "Modern SkyWatch Recon",
  },
  {
    id: "iss-zarya",
    name: "ISS (ZARYA)",
    code: "ISS-01",
    orbitType: "LEO",
    altitudeKm: 418,
    velocityKms: 7.66,
    inclinationDeg: 51.6,
    downlink: "2.2 GHz S-Band",
    batteryPct: 94,
    sensorPayload: "Alpha Magnetic Spectrometer · Atmospheric Limb",
    status: "TRACKING",
    position: [28.5, -80.6],
    signalBars: 4,
    operator: "International Consortium",
  },
  {
    id: "noaa-21",
    name: "NOAA-21 (JPSS-2)",
    code: "JPSS-2",
    orbitType: "POLAR",
    altitudeKm: 824,
    velocityKms: 7.46,
    inclinationDeg: 98.7,
    downlink: "15.0 GHz Ka-Band",
    batteryPct: 99,
    sensorPayload: "VIIRS High-Res Radiometer · ATMS Sounder",
    status: "DOWNLINK",
    position: [64.8, -147.7],
    signalBars: 5,
    operator: "NOAA / NASA",
  },
  {
    id: "terra",
    name: "TERRA (EOS AM-1)",
    code: "TERRA",
    orbitType: "SSO",
    altitudeKm: 705,
    velocityKms: 7.5,
    inclinationDeg: 98.2,
    downlink: "8.2 GHz X-Band",
    batteryPct: 91,
    sensorPayload: "MODIS Thermal/Fire Scanner · ASTER Imager",
    status: "NOMINAL",
    position: [-15.8, -47.9],
    signalBars: 4,
    operator: "NASA Earth Science",
  },
  {
    id: "aqua",
    name: "AQUA (EOS PM-1)",
    code: "AQUA",
    orbitType: "SSO",
    altitudeKm: 705,
    velocityKms: 7.5,
    inclinationDeg: 98.2,
    downlink: "8.2 GHz X-Band",
    batteryPct: 93,
    sensorPayload: "AIRS Atmospheric Infrared · CERES Radiation",
    status: "TRACKING",
    position: [-33.9, 151.2],
    signalBars: 4,
    operator: "NASA Earth Science",
  },
  {
    id: "sentinel-2a",
    name: "SENTINEL-2A",
    code: "S2A",
    orbitType: "SSO",
    altitudeKm: 786,
    velocityKms: 7.44,
    inclinationDeg: 98.5,
    downlink: "8.0 GHz X-Band",
    batteryPct: 96,
    sensorPayload: "MSI 13-Band Multispectral Imager",
    status: "CALIBRATING",
    position: [52.5, 13.4],
    signalBars: 3,
    operator: "ESA Copernicus",
  },
  {
    id: "goes-16",
    name: "GOES-16 (EAST)",
    code: "GOES-E",
    orbitType: "GEO",
    altitudeKm: 35786,
    velocityKms: 3.07,
    inclinationDeg: 0.0,
    downlink: "1.6 GHz L-Band",
    batteryPct: 100,
    sensorPayload: "SUVI Solar Extreme UV · EXIS Sensor",
    status: "NOMINAL",
    position: [0.0, -75.2],
    signalBars: 5,
    operator: "NOAA Space Weather",
  },
]

const HISTORIC_MISSION_LOGS = [
  {
    date: "MAY 10-12, 2024",
    title: "G5 EXTREME GEOMAGNETIC SUPERSTORM",
    category: "SPACE WEATHER",
    severity: "CRITICAL",
    details: "Strongest geomagnetic disturbance since 2003. Planetary Kp reached 9.0. Mid-latitude auroral displays visible globally. Satellite drag anomalies detected across 400+ LEO assets.",
    metric: "Kp 9.0 · G5",
  },
  {
    date: "OCTOBER 3, 2024",
    title: "SOLAR CYCLE 25 PEAK - X9.05 FLARE",
    category: "SOLAR EVENT",
    severity: "CRITICAL",
    details: "Massive eruptive solar flare from Active Region AR3842. Complete HF radio blackout across sunlit hemisphere (R3-level). Coronal mass ejection speed exceeded 1,800 km/s.",
    metric: "X9.05 FLARE",
  },
  {
    date: "JUNE - AUGUST 2023",
    title: "CANADIAN MEGAFIRE CONTINENTAL PLUME",
    category: "PLANETARY DISASTER",
    severity: "SEVERE",
    details: "Over 18.5 million hectares burned. Smoke transport crossed the North Atlantic. New York City recorded historic AQI of 484 (Hazardous). Continuous VIIRS satellite fire tracking.",
    metric: "AQI 484 · HAZARDOUS",
  },
  {
    date: "JANUARY 15, 2022",
    title: "HUNGA TONGA PLINIAN ERUPTION",
    category: "VOLCANIC EVENT",
    severity: "CRITICAL",
    details: "Submarine caldera explosion generated atmospheric shockwaves circumnavigating Earth four times. Plume reached mesosphere (58 km). Transpacific tsunami warnings triggered.",
    metric: "VEI 5.7 · 58 KM PLUME",
  },
  {
    date: "MARCH 23, 2024",
    title: "SEVERE G4 CORONAL MASS EJECTION",
    category: "SPACE WEATHER",
    severity: "SEVERE",
    details: "Major coronal shock arrival. Auroras reported in central Europe and northern US states. Spacecraft orientation lock verified.",
    metric: "Kp 8.0 · G4",
  },
]

function getAqiRisk(aqi: number | null): { label: string; className: string } {
  if (aqi === null) return { label: "Unavailable", className: "bg-gray-700 text-gray-200" }
  if (aqi <= 50) return { label: "Good", className: "bg-emerald-500/20 text-emerald-300" }
  if (aqi <= 100) return { label: "Moderate", className: "bg-yellow-500/20 text-yellow-300" }
  if (aqi <= 150) return { label: "Unhealthy", className: "bg-orange-500/20 text-orange-300" }
  return { label: "Hazardous", className: "bg-red-500/20 text-red-300" }
}

function formatWindDirection(degrees: number | null): string {
  if (degrees === null) return "--"
  return `${Math.round(degrees)}°`
}

function formatSpaceTime(value: string): string {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`
}

function spaceSeverityConfig(severity: SpaceSeverity) {
  return severityConfig[severity]
}

const severityConfig: Record<
  Severity,
  { label: string; dot: string; text: string; ring: string }
> = {
  high: {
    label: "Severe",
    dot: "bg-rose-500",
    text: "text-rose-400",
    ring: "ring-rose-500/40",
  },
  med: {
    label: "Moderate",
    dot: "bg-amber-500",
    text: "text-amber-400",
    ring: "ring-amber-500/40",
  },
  low: {
    label: "Minor",
    dot: "bg-sky-400",
    text: "text-sky-400",
    ring: "ring-sky-400/40",
  },
}

type NavItem = {
  id: DashboardPanel
  label: string
  icon: LucideIcon
  badge?: number | string
}

const primaryNav: NavItem[] = [
  { id: "overview", label: "Global Overview", icon: Globe2 },
  { id: "solar", label: "Solar Space Weather", icon: Sun, badge: 3 },
  { id: "satellites", label: "Satellite Directory", icon: SatelliteIcon, badge: 7 },
  { id: "alerts", label: "Emergency Alerts", icon: Bell, badge: "!" },
  { id: "telemetry", label: "Telemetry Streams", icon: Activity },
  { id: "history", label: "Event Archive & Logs", icon: History },
]

function NavButton({
  item,
  active,
  onSelect,
}: {
  item: NavItem
  active: boolean
  onSelect: (id: DashboardPanel) => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300",
        active
          ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.15)] border border-white/20"
          : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-x-1.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      )}
      <Icon size={24} strokeWidth={1.75} />
      {item.badge ? (
        <span
          style={{ minWidth: "18px", height: "18px" }}
          className={cn(
            "absolute -right-1 -top-1 flex items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold shadow-sm ring-1 ring-black",
            item.id === "alerts"
              ? "bg-rose-500 text-white animate-pulse"
              : "bg-amber-400 text-black",
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </button>
  )
}

function Sidebar({
  active,
  onSelect,
}: {
  active: DashboardPanel
  onSelect: (id: DashboardPanel) => void
}) {
  return (
    <aside className="flex w-16 shrink-0 flex-col items-center gap-6 border-r border-white/10 bg-black/80 backdrop-blur-md py-4 z-[1001]">
      <div className="flex h-11 w-11 items-center justify-center border border-white/20 bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
        <Sun size={24} className="text-white" strokeWidth={2} />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {primaryNav.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={active === item.id}
            onSelect={onSelect}
          />
        ))}
      </nav>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex flex-col items-center justify-center p-1 font-mono text-[9px] text-white/30 tracking-widest uppercase">
          SYS
          <span className="text-emerald-400 font-bold">ON</span>
        </div>
      </div>
    </aside>
  )
}

function MapControlButton({
  label,
  children,
	onClick,
}: {
  label: string
  children: React.ReactNode
	onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-12 w-12 items-center justify-center border-white/10 bg-black/70 text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground first:rounded-t-lg last:rounded-b-lg [&:not(:last-child)]:border-b"
    >
      {children}
    </button>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  )
}

function formatFetchedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return `Updated ${date.toISOString().slice(11, 19)} UTC`
}

function MapArea({
  events,
  center,
  zoom,
  fetchedAt,
  telemetry,
  spaceActive,
  spaceSummary,
  spaceEventCount,
  spaceSelection,
  mapModeLabel,
  isLoading,
  selectedEvent,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onMarkerSelect,
  onToggleMobilePanel,
  mobilePanelOpen,
}: {
  events: SkywatchEvent[]
  center: [number, number]
  zoom: number
  fetchedAt: string
  telemetry: Telemetry
  spaceActive: boolean
  spaceSummary: { highestFlare: string | null; highestKp: number | null }
  spaceEventCount: number
  spaceSelection: SpaceSelection
  mapModeLabel: string
  isLoading: boolean
  selectedEvent: SkywatchEvent | null
  onZoomIn: () => void
  onZoomOut: () => void
  onRecenter: () => void
  onMarkerSelect: (event: SkywatchEvent) => void
  onToggleMobilePanel: () => void
  mobilePanelOpen: boolean
}) {
  const displayedTelemetry = selectedEvent
    ? telemetry
    : { aqi: null, pm25: null, windDirection: null, windSpeed: null, loading: false, error: false }
  const [searchQuery, setSearchQuery] = useState("")
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchTarget, setSearchTarget] = useState<[number, number] | null>(null)

  async function searchLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    setSearchError(null)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { Accept: "application/json" } },
      )
      if (!response.ok) throw new Error("Search failed")
      const results = (await response.json()) as Array<{ lat: string; lon: string }>
      if (!results[0]) {
        setSearchError("Location not found")
        return
      }
      setSearchTarget([Number(results[0].lat), Number(results[0].lon)])
    } catch {
      setSearchError("Location search unavailable")
    }
  }

  return (
    <section className="relative min-w-0 flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-background space-grid" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_-10%,oklch(0.78_0.16_65/0.08),transparent_55%)]" />

      {/* Top HUD Bar */}
      <div className="absolute inset-x-0 top-0 z-[1000] flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-1.5 backdrop-blur-md text-white">
            <Globe2 size={16} className="text-amber-400" strokeWidth={1.75} />
            <span className="text-xs md:text-sm font-medium font-mono">{mapModeLabel}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-1.5 font-mono text-xs text-muted-foreground backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {isLoading ? "Fetching Satellite Telemetry..." : spaceActive ? "LIVE · NASA DONKI" : "LIVE · NASA EONET"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-4 rounded-lg border border-white/10 bg-black/70 px-4 py-1.5 font-mono text-xs text-muted-foreground backdrop-blur-md">
            <span>
              EVENTS <span className="text-white font-bold">{spaceActive ? spaceEventCount : events.length}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleMobilePanel}
            className="lg:hidden flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-xs text-white backdrop-blur-md hover:bg-white/20 transition-colors"
          >
            {mobilePanelOpen ? "MAP VIEW" : "VIEW PANEL"}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <form onSubmit={searchLocation} className="absolute left-6 top-20 z-[1000] w-72">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-2 shadow-lg backdrop-blur-md text-white">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search city or place"
            aria-label="Search city or place"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground"
          />
          <button type="submit" className="text-xs font-semibold text-amber-400 hover:text-white">Go</button>
        </div>
        {searchError ? <p className="mt-1 px-2 text-xs text-red-300">{searchError}</p> : null}
      </form>

      {/* Leaflet Map Canvas */}
      <div className="absolute inset-0">
        <EventMap
          markers={events}
          center={center}
          zoom={zoom}
          onMarkerSelect={onMarkerSelect}
          searchTarget={searchTarget}
          spaceSelection={spaceSelection}
        />
      </div>

      {/* Floating Telemetry HUD */}
      <div className="absolute bottom-20 left-6 z-[1000] w-56 rounded-lg border border-white/10 bg-black/70 p-3 shadow-lg backdrop-blur-md text-white font-mono">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {spaceActive ? "Space Telemetry" : "Live Telemetry"}
          </span>
          <span className={cn("flex items-center gap-1.5 text-[10px]", spaceActive || selectedEvent ? "text-emerald-400" : "text-muted-foreground")}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {isLoading ? "FETCHING" : spaceActive ? "LIVE" : displayedTelemetry.loading ? "LOADING" : selectedEvent && !displayedTelemetry.error ? "LIVE" : "STANDBY"}
          </span>
        </div>
        {isLoading ? (
          <p className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            Fetching Telemetry...
          </p>
        ) : null}
        {spaceActive ? (
          <>
            <p className="mt-2 text-xs font-semibold text-white">Space Weather Status</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-gray-300">
              <span>FLARE <strong className="text-white">{spaceSummary.highestFlare ?? "None"}</strong></span>
              <span>PEAK KP <strong className="text-white">{spaceSummary.highestKp ?? "--"}</strong></span>
            </div>
          </>
        ) : (
          <p className="mt-2 truncate text-xs font-semibold text-white">{selectedEvent?.title ?? "Select an event on the map"}</p>
        )}
        {!spaceActive ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", getAqiRisk(displayedTelemetry.aqi).className)}>
              AQI {displayedTelemetry.aqi ?? "--"} · {getAqiRisk(displayedTelemetry.aqi).label}
            </span>
            <span className="text-[10px] text-gray-300">PM2.5 {displayedTelemetry.pm25 ?? "--"}</span>
          </div>
        ) : null}
        {!spaceActive ? (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-gray-300">
            <span>WIND <strong className="text-white">{formatWindDirection(displayedTelemetry.windDirection)}</strong></span>
            <span>SPEED <strong className="text-white">{displayedTelemetry.windSpeed !== null ? `${Math.round(displayedTelemetry.windSpeed)} km/h` : "--"}</strong></span>
          </div>
        ) : null}
      </div>

      {/* Map Control Buttons */}
      <div className="absolute right-6 top-1/2 z-[1000] -translate-y-1/2">
        <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-black/70 backdrop-blur-md">
          <MapControlButton label="Zoom in" onClick={onZoomIn}>
            <Plus size={24} strokeWidth={2} />
          </MapControlButton>
          <MapControlButton label="Zoom out" onClick={onZoomOut}>
            <Minus size={24} strokeWidth={2} />
          </MapControlButton>
          <MapControlButton label="Recenter" onClick={onRecenter}>
            <Crosshair size={24} strokeWidth={1.75} />
          </MapControlButton>
          <MapControlButton
            label="Fullscreen"
            onClick={() => document.documentElement.requestFullscreen?.()}
          >
            <Maximize2 size={24} strokeWidth={1.75} />
          </MapControlButton>
        </div>
      </div>

      {/* Footer Bar */}
      <div className="absolute inset-x-0 bottom-0 z-[1000] flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-black/70 px-4 py-2 text-xs backdrop-blur-md text-white font-mono">
          <LegendDot className="bg-rose-500" label="Severe" />
          <LegendDot className="bg-amber-500" label="Moderate" />
          <LegendDot className="bg-sky-400" label="Minor" />
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {formatFetchedAt(fetchedAt)}
        </span>
      </div>
    </section>
  )
}

function EventCard({
  event,
  onSelect,
  selected,
}: {
  event: SkywatchEvent
  onSelect: (event: SkywatchEvent) => void
  selected: boolean
}) {
  const s = severityConfig[event.severity]
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      id={`event-card-${event.id}`}
      className={cn(
        "group relative min-w-0 w-full max-h-40 shrink-0 overflow-hidden rounded-lg border p-3 text-left text-white transition-colors hover:border-amber-400/40 hover:bg-black/80 font-mono",
        selected
          ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/40"
          : "border-white/10 bg-black/70 backdrop-blur-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", s.dot)} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-gray-300">
              {event.kind}
            </p>
            <h3 className="truncate text-sm font-semibold leading-tight text-white text-pretty">
              {event.title}
            </h3>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1",
            s.text,
            s.ring,
          )}
        >
          {event.metric}
        </span>
      </div>

      <p className="mt-1 line-clamp-2 pl-4 text-xs leading-snug text-gray-200 text-pretty">
        {event.detail}
      </p>

      <div className="mt-2 flex min-w-0 items-center justify-between gap-2 overflow-hidden pl-4 text-[10px] text-gray-300">
        <span className="min-w-0 truncate">{event.region}</span>
        <span className="flex min-w-0 shrink-0 items-center gap-2">
          <span className={cn("truncate", s.text)}>{s.label}</span>
          <span className="text-border">·</span>
          <span className="max-w-[8rem] truncate">{event.time}</span>
        </span>
      </div>
    </button>
  )
}

function SpaceWeatherCard({
  item,
  onSelect,
  selected,
}: {
  item: SolarFlare | GeomagneticStorm
  onSelect: (item: SolarFlare | GeomagneticStorm) => void
  selected: boolean
}) {
  const severity = spaceSeverityConfig(item.severity)
  const flare = "classType" in item
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        "w-full shrink-0 rounded-lg border p-3 text-left text-white transition-colors hover:border-amber-400/40 hover:bg-black/80 font-mono",
        selected
          ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/40"
          : "border-white/10 bg-black/70 backdrop-blur-md",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", severity.dot)} />
          <strong className="text-sm">{flare ? item.classType : `Kp ${item.kpIndex ?? "--"}`}</strong>
        </div>
        <span className={cn("text-[10px]", severity.text)}>{severity.label}</span>
      </div>
      <p className="mt-2 text-[10px] text-gray-300">
        {flare ? `Peak ${formatSpaceTime(item.peakTime)}` : `Start ${formatSpaceTime(item.startTime)}`}
      </p>
      {flare ? <p className="mt-1 truncate text-xs text-gray-200">{item.sourceLocation}</p> : null}
    </button>
  )
}

function EventCardSkeleton() {
  return (
    <div className="h-28 w-full shrink-0 animate-pulse rounded-lg border border-white/10 bg-neutral-900/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="h-3 w-28 rounded bg-neutral-800" />
        <div className="h-4 w-12 rounded bg-neutral-800" />
      </div>
      <div className="mt-4 h-3 w-4/5 rounded bg-neutral-800" />
      <div className="mt-3 h-2.5 w-2/5 rounded bg-neutral-800" />
    </div>
  )
}

function EventFeedSkeletons() {
  return <>{Array.from({ length: 5 }, (_, index) => <EventCardSkeleton key={index} />)}</>
}

/* =========================================================================
   PANEL 1: GLOBAL OVERVIEW PANEL
========================================================================= */
function OverviewPanel({
  events,
  error,
  onSelectEvent,
  selectedEventId,
  filter,
  onFilterChange,
  timeframe,
  onTimeframeChange,
  loading,
}: {
  events: SkywatchEvent[]
  error: string | null
  onSelectEvent: (event: SkywatchEvent) => void
  selectedEventId: string | null
  filter: EventFilter
  onFilterChange: (filter: EventFilter) => void
  timeframe: 1 | 7 | null
  onTimeframeChange: (timeframe: 1 | 7) => void
  loading: boolean
}) {
  const severeCount = events.filter((e) => e.severity === "high").length
  const wildfireCount = events.filter((e) => e.kind.toLowerCase().includes("wildfire")).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <h2 className="whitespace-nowrap text-sm font-semibold tracking-wider uppercase">
            {"// Global Overview"}
          </h2>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Radio size={14} />
          {events.length}
        </span>
      </header>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-3 gap-2 border-b border-white/10 px-4 py-3 bg-white/[0.02]">
        <div className="border border-white/10 bg-white/5 p-2 rounded">
          <span className="text-[10px] text-muted-foreground block">TOTAL</span>
          <span className="text-sm font-bold text-white">{events.length}</span>
        </div>
        <div className="border border-rose-500/20 bg-rose-500/10 p-2 rounded">
          <span className="text-[10px] text-rose-400 block">SEVERE</span>
          <span className="text-sm font-bold text-rose-400">{severeCount}</span>
        </div>
        <div className="border border-amber-500/20 bg-amber-500/10 p-2 rounded">
          <span className="text-[10px] text-amber-400 block">WILDFIRE</span>
          <span className="text-sm font-bold text-amber-400">{wildfireCount}</span>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="border-b border-white/10 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Timeframe</span>
          <div className="flex rounded border border-white/10 p-0.5">
            {([1, 7] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onTimeframeChange(days)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-semibold transition-colors",
                  timeframe === days ? "bg-white text-black" : "text-muted-foreground hover:text-white",
                )}
              >
                {days === 1 ? "24H" : "7 DAYS"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <ListFilter size={13} className="text-muted-foreground" />
          {(["all", "wildfires", "severe"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onFilterChange(option)}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium uppercase transition-colors",
                filter === option
                  ? "bg-white/20 text-white border border-white/30"
                  : "bg-white/5 text-muted-foreground hover:text-white border border-transparent",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Events Scroll Feed */}
      <div className="feed-scroll scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <EventFeedSkeletons />
        ) : error ? (
          <p className="px-2 text-xs text-rose-400">{error}</p>
        ) : events.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">No events recorded in this timeframe.</p>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={onSelectEvent}
              selected={selectedEventId === event.id}
            />
          ))
        )}
      </div>

      <footer className="border-t border-white/10 px-4 py-3 bg-white/[0.01]">
        <a
          href="https://eonet.gsfc.nasa.gov/api/v3/events"
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded py-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <span>NASA EONET API DOCS [ -&gt; ]</span>
        </a>
      </footer>
    </div>
  )
}

/* =========================================================================
   PANEL 2: SOLAR & SPACE WEATHER PANEL
========================================================================= */
function SolarWeatherPanel({
  spaceWeather,
  spaceView,
  onSpaceViewChange,
  selectedSpaceId,
  onSpaceSelect,
  loading,
  error,
  spaceSummary,
}: {
  spaceWeather: SpaceWeather
  spaceView: SpaceView
  onSpaceViewChange: (view: SpaceView) => void
  selectedSpaceId: string | null
  onSpaceSelect: (item: SolarFlare | GeomagneticStorm) => void
  loading: boolean
  error: string | null
  spaceSummary: { highestFlare: string | null; highestKp: number | null }
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-400" />
          </span>
          <h2 className="whitespace-nowrap text-sm font-semibold tracking-wider uppercase">
            {"// Solar Weather"}
          </h2>
        </div>
        <span className="text-xs font-semibold text-amber-400 border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 rounded">
          CYCLE 25
        </span>
      </header>

      {/* Solar Flare & Kp Index Quick Meters */}
      <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-4 bg-white/[0.02]">
        <div className="border border-white/10 bg-white/5 p-3 rounded">
          <span className="text-[10px] text-muted-foreground block">PEAK FLARE</span>
          <span className="text-base font-bold text-amber-400">
            {spaceSummary.highestFlare ?? "NONE"}
          </span>
          <span className="text-[9px] text-white/40 block mt-1">GOES X-Ray Sensor</span>
        </div>
        <div className="border border-white/10 bg-white/5 p-3 rounded">
          <span className="text-[10px] text-muted-foreground block">PEAK KP INDEX</span>
          <span className="text-base font-bold text-violet-400">
            {spaceSummary.highestKp !== null ? `Kp ${spaceSummary.highestKp}` : "--"}
          </span>
          <span className="text-[9px] text-white/40 block mt-1">Geomagnetic Disturbance</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-white/10 p-3">
        <div className="flex rounded border border-white/10 p-0.5">
          {(["flares", "storms"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => onSpaceViewChange(view)}
              className={cn(
                "flex-1 rounded py-1 text-[10px] font-semibold transition-colors",
                spaceView === view ? "bg-white text-black" : "text-muted-foreground hover:text-white",
              )}
            >
              {view === "flares" ? "SOLAR FLARES" : "GEOMAGNETIC STORMS"}
            </button>
          ))}
        </div>
      </div>

      {/* Items Feed */}
      <div className="feed-scroll scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <EventFeedSkeletons />
        ) : error ? (
          <p className="px-2 text-xs text-rose-400">{error}</p>
        ) : spaceWeather[spaceView].length === 0 ? (
          <div className="p-4 text-center border border-white/5 rounded">
            <Sun size={24} className="mx-auto text-white/20 mb-2" />
            <p className="text-xs text-muted-foreground">No active events recorded in current observation window.</p>
          </div>
        ) : (
          spaceWeather[spaceView].map((item) => (
            <SpaceWeatherCard
              key={item.id}
              item={item}
              onSelect={onSpaceSelect}
              selected={selectedSpaceId === item.id}
            />
          ))
        )}
      </div>

      <footer className="border-t border-white/10 px-4 py-3 bg-white/[0.01]">
        <p className="text-[10px] text-white/40 leading-relaxed">
          Selecting a flare highlights subsolar meridian impact. Selecting a storm plots auroral oval boundaries.
        </p>
      </footer>
    </div>
  )
}

/* =========================================================================
   PANEL 3: SATELLITE DIRECTORY PANEL
========================================================================= */
function SatellitesPanel({
  onTrackSatellite,
  selectedSatId,
}: {
  onTrackSatellite: (satellite: Satellite) => void
  selectedSatId: string | null
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
          </span>
          <h2 className="whitespace-nowrap text-sm font-semibold tracking-wider uppercase">
            {"// Satellite Fleet"}
          </h2>
        </div>
        <span className="text-xs text-sky-400 font-mono">7 ACTIVE</span>
      </header>

      {/* Directory Description */}
      <div className="px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
        <p className="text-[10px] text-white/50 leading-relaxed">
          Active Earth & Solar observation constellation. Click any satellite to inspect payload specs and track ground coordinates.
        </p>
      </div>

      {/* Satellites Scroll Feed */}
      <div className="feed-scroll scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {SATELLITE_FLEET.map((sat) => {
          const isSelected = selectedSatId === sat.id
          return (
            <div
              key={sat.id}
              onClick={() => onTrackSatellite(sat)}
              className={cn(
                "cursor-pointer rounded-lg border p-3 transition-all font-mono",
                isSelected
                  ? "border-sky-400 bg-sky-400/10 ring-1 ring-sky-400/40"
                  : "border-white/10 bg-black/70 hover:border-white/30 hover:bg-white/5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <SatelliteIcon size={16} className="text-sky-400 shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold text-white">{sat.name}</h3>
                    <span className="text-[10px] text-white/40">{sat.operator}</span>
                  </div>
                </div>
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-300 border border-sky-500/30">
                  {sat.orbitType}
                </span>
              </div>

              {/* Orbit Specs Grid */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] border-t border-white/10 pt-2 text-white/70">
                <div>
                  <span className="text-white/40 block">ALTITUDE</span>
                  <span className="font-semibold text-white">{sat.altitudeKm} km</span>
                </div>
                <div>
                  <span className="text-white/40 block">VELOCITY</span>
                  <span className="font-semibold text-white">{sat.velocityKms} km/s</span>
                </div>
                <div>
                  <span className="text-white/40 block">DOWNLINK</span>
                  <span className="font-semibold text-white">{sat.downlink}</span>
                </div>
                <div>
                  <span className="text-white/40 block">BATTERY</span>
                  <span className="font-semibold text-emerald-400">{sat.batteryPct}%</span>
                </div>
              </div>

              {/* Payload Details */}
              <div className="mt-2 text-[10px] bg-white/5 p-2 rounded border border-white/5 text-white/80">
                <span className="text-white/40 block text-[9px]">PRIMARY PAYLOAD</span>
                <p className="line-clamp-1">{sat.sensorPayload}</p>
              </div>

              {/* Action */}
              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {sat.status}
                </span>
                <span className="text-sky-400 hover:text-white transition-colors">
                  [ TRACK ON MAP -&gt; ]
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <footer className="border-t border-white/10 px-4 py-3 bg-white/[0.01]">
        <div className="flex items-center justify-between text-[10px] text-white/40">
          <span>TLE EPHEMERIS: VALID</span>
          <span>ORBIT SYNC: 100%</span>
        </div>
      </footer>
    </div>
  )
}

/* =========================================================================
   PANEL 4: EMERGENCY ALERTS PANEL
========================================================================= */
function AlertsPanel({
  events,
  spaceWeather,
  onSelectEvent,
}: {
  events: SkywatchEvent[]
  spaceWeather: SpaceWeather
  onSelectEvent: (event: SkywatchEvent) => void
}) {
  const [alertCategory, setAlertCategory] = useState<"all" | "earth" | "space">("all")

  const severeEarthEvents = events.filter((e) => e.severity === "high")
  const severeFlares = spaceWeather.flares.filter((f) => f.severity === "high" || f.classType.startsWith("X"))
  const severeStorms = spaceWeather.storms.filter((s) => s.severity === "high" || (s.kpIndex !== null && s.kpIndex >= 5))

  const totalAlertsCount = severeEarthEvents.length + severeFlares.length + severeStorms.length + 1

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
          <h2 className="whitespace-nowrap text-sm font-semibold tracking-wider uppercase text-rose-400">
            {"// Emergency Alerts"}
          </h2>
        </div>
        <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30">
          {totalAlertsCount} ACTIVE
        </span>
      </header>

      {/* Threat Status Banner */}
      <div className="border-b border-white/10 p-4 bg-rose-500/10">
        <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-1">
          <ShieldAlert size={16} />
          DEFCON 3 · ELEVATED PLANETARY WATCH
        </div>
        <p className="text-[10px] text-white/60 leading-relaxed">
          High-severity disaster signatures and geomagnetic disturbance vectors require active monitoring.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-white/10 p-3">
        <div className="flex gap-1">
          {(["all", "earth", "space"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setAlertCategory(cat)}
              className={cn(
                "rounded px-2.5 py-1 text-[10px] font-semibold uppercase transition-colors",
                alertCategory === cat
                  ? "bg-rose-500 text-white"
                  : "bg-white/5 text-muted-foreground hover:text-white",
              )}
            >
              {cat === "all" ? "ALL WARNINGS" : cat === "earth" ? "EARTH HAZARDS" : "SPACE ALERTS"}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="feed-scroll scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {/* System Notice */}
        {(alertCategory === "all" || alertCategory === "space") && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={14} />
                SOLAR CYCLE 25 ELEVATED FLUX
              </span>
              <span className="text-[9px] font-mono border border-amber-500/30 px-1 rounded">ADVISORY</span>
            </div>
            <p className="text-[10px] text-white/70 leading-relaxed">
              HF communication degradation and GNSS positional drift probable across polar corridors.
            </p>
          </div>
        )}

        {/* Severe Earth Events */}
        {(alertCategory === "all" || alertCategory === "earth") &&
          severeEarthEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 transition-colors hover:bg-rose-500/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest block">
                    CRITICAL HAZARD · {event.kind}
                  </span>
                  <h3 className="text-xs font-bold text-white mt-0.5">{event.title}</h3>
                </div>
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                  {event.metric}
                </span>
              </div>
              <p className="mt-2 text-[10px] text-white/60 line-clamp-2">{event.detail}</p>
              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-white/40">{event.region}</span>
                <button
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  className="text-rose-400 hover:text-white font-semibold transition-colors"
                >
                  [ FLY TO INCIDENT -&gt; ]
                </button>
              </div>
            </div>
          ))}

        {/* Severe Space Flares & Storms */}
        {(alertCategory === "all" || alertCategory === "space") &&
          severeFlares.map((flare) => (
            <div
              key={flare.id}
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span>SOLAR FLARE BURST · {flare.classType}</span>
                <span className="text-[9px] bg-amber-400/20 px-1 rounded">RADIO R3</span>
              </div>
              <p className="mt-1 text-[10px] text-white/70">
                Source: {flare.sourceLocation || "Active Region"} · Peak: {formatSpaceTime(flare.peakTime)}
              </p>
            </div>
          ))}

        {(alertCategory === "all" || alertCategory === "space") &&
          severeStorms.map((storm) => (
            <div
              key={storm.id}
              className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3"
            >
              <div className="flex items-center justify-between text-xs font-bold text-violet-400">
                <span>GEOMAGNETIC STORM WATCH</span>
                <span className="text-[9px] bg-violet-400/20 px-1 rounded">Kp {storm.kpIndex}</span>
              </div>
              <p className="mt-1 text-[10px] text-white/70">
                Commenced: {formatSpaceTime(storm.startTime)} · Auroral oval expansion active.
              </p>
            </div>
          ))}
      </div>

      <footer className="border-t border-white/10 px-4 py-3 bg-white/[0.01]">
        <div className="flex items-center justify-between text-[10px] text-white/40">
          <span>BROADCAST: EMERGENCY UPLINK</span>
          <span>LATENCY: 42ms</span>
        </div>
      </footer>
    </div>
  )
}

/* =========================================================================
   PANEL 5: TELEMETRY STREAMS PANEL
========================================================================= */
function TelemetryPanel({
  telemetry,
  selectedEvent,
}: {
  telemetry: Telemetry
  selectedEvent: SkywatchEvent | null
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
          </span>
          <h2 className="whitespace-nowrap text-sm font-semibold tracking-wider uppercase">
            {"// Telemetry Streams"}
          </h2>
        </div>
        <span className="text-xs text-cyan-400 font-mono">1.2 GHz SYNC</span>
      </header>

      {/* Target Focus Banner */}
      <div className="border-b border-white/10 p-4 bg-white/[0.02]">
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest block">ACTIVE PROBE TARGET</span>
        <h3 className="text-xs font-bold text-white mt-1 truncate">
          {selectedEvent ? selectedEvent.title : "Global Planetary Atmospheric Average"}
        </h3>
        <span className="text-[10px] text-white/40">
          {selectedEvent ? selectedEvent.region : "Coordinates: 0.00°N, 0.00°E · Multi-Station Array"}
        </span>
      </div>

      {/* Telemetry Sensor Readouts */}
      <div className="feed-scroll scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex-1 space-y-4 overflow-y-auto p-4">
        {/* Air Quality Gauge */}
        <div className="border border-white/10 bg-black/60 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Gauge size={14} className="text-cyan-400" />
              AIR QUALITY INDEX (AQI)
            </span>
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", getAqiRisk(telemetry.aqi).className)}>
              {getAqiRisk(telemetry.aqi).label}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{telemetry.aqi ?? 38}</span>
            <span className="text-[10px] text-white/40">US EPA Standard</span>
          </div>
          {/* Progress Bar */}
          <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500"
              style={{ width: `${Math.min(100, ((telemetry.aqi ?? 38) / 300) * 100)}%` }}
            />
          </div>
        </div>

        {/* Environmental Particulates Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-white/10 bg-black/60 rounded-lg p-3">
            <span className="text-[9px] text-muted-foreground block">FINE PARTICLES (PM2.5)</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold text-white">{telemetry.pm25 ?? 11.4}</span>
              <span className="text-[9px] text-white/40">µg/m³</span>
            </div>
            <span className="text-[9px] text-emerald-400 mt-1 block">Optimal range</span>
          </div>

          <div className="border border-white/10 bg-black/60 rounded-lg p-3">
            <span className="text-[9px] text-muted-foreground block">WIND VECTOR SPEED</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold text-white">
                {telemetry.windSpeed !== null ? Math.round(telemetry.windSpeed) : 18}
              </span>
              <span className="text-[9px] text-white/40">km/h</span>
            </div>
            <span className="text-[9px] text-cyan-400 mt-1 block flex items-center gap-1">
              <Compass size={11} />
              {formatWindDirection(telemetry.windDirection)} NNE
            </span>
          </div>
        </div>

        {/* Live SVG Signal Oscilloscope Chart */}
        <div className="border border-white/10 bg-black/60 rounded-lg p-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5">
              <Activity size={13} className="text-cyan-400" />
              SOLAR RADIATION FLUX WAVEFORM
            </span>
            <span className="text-emerald-400 font-bold">ACTIVE STREAM</span>
          </div>
          
          <div className="relative h-20 w-full border border-white/10 bg-black/80 rounded overflow-hidden p-1 flex items-center">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:16px_16px]" />
            
            {/* SVG Wave */}
            <svg className="w-full h-full relative z-10" viewBox="0 0 300 60" preserveAspectRatio="none">
              <path
                d="M 0 30 Q 25 10, 50 30 T 100 30 T 150 15 T 200 45 T 250 20 T 300 30"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                className="opacity-80"
              />
              <path
                d="M 0 30 Q 35 45, 70 30 T 140 25 T 210 35 T 280 15 T 300 25"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="4 2"
                className="opacity-50"
              />
            </svg>
          </div>

          <div className="mt-2 grid grid-cols-3 text-[9px] text-white/40 pt-1">
            <span>PACKETS: 4,892/s</span>
            <span>JITTER: 1.2ms</span>
            <span className="text-right text-emerald-400">SYNC: 99.8%</span>
          </div>
        </div>

        {/* Global Sensor Readout Strip */}
        <div className="border border-white/10 bg-white/[0.02] rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Ionospheric TEC</span>
            <span className="text-white font-bold">24.6 TECU</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Barometric Pressure</span>
            <span className="text-white font-bold">1013.2 hPa (Stable)</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Tropospheric Ozone (O3)</span>
            <span className="text-white font-bold">28.4 ppb</span>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 px-4 py-3 bg-white/[0.01]">
        <div className="flex items-center justify-between text-[10px] text-white/40">
          <span>NETWORK: OPEN-METEO // NOAA</span>
          <span className="text-emerald-400">TELEMETRY OK</span>
        </div>
      </footer>
    </div>
  )
}

/* =========================================================================
   PANEL 6: HISTORICAL ARCHIVE & MISSION LOGS PANEL
========================================================================= */
function HistoryPanel({
  historicalYear,
  onHistoricalYearChange,
  events,
  onSelectEvent,
}: {
  historicalYear: HistoricalYear | null
  onHistoricalYearChange: (year: HistoricalYear | null) => void
  events: SkywatchEvent[]
  onSelectEvent: (event: SkywatchEvent) => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
          </span>
          <h2 className="whitespace-nowrap text-sm font-semibold tracking-wider uppercase">
            {"// Mission Archive"}
          </h2>
        </div>
        <span className="text-xs text-amber-400 font-mono">2023 - 2026</span>
      </header>

      {/* Historical Year Selection Control */}
      <div className="border-b border-white/10 p-4 bg-white/[0.02]">
        <label className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Query Historical Archive Year:</span>
          <span className="text-white font-bold">{historicalYear ?? "Live Timeframe"}</span>
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {([2026, 2025, 2024, 2023] as const).map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => onHistoricalYearChange(year)}
              className={cn(
                "rounded py-1.5 text-xs font-bold transition-all border",
                historicalYear === year
                  ? "bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                  : "bg-white/5 text-muted-foreground hover:text-white border-white/10",
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Major Historic Incident Timeline */}
      <div className="feed-scroll scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground block px-1">
          RECORDED MISSION LOGS
        </span>

        {HISTORIC_MISSION_LOGS.map((log, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-white/10 bg-black/60 p-3 hover:border-white/30 transition-colors"
          >
            <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
              <span>{log.date}</span>
              <span className="text-amber-400 font-bold">{log.metric}</span>
            </div>
            <h4 className="text-xs font-bold text-white">{log.title}</h4>
            <p className="mt-1.5 text-[10px] text-white/60 leading-relaxed">{log.details}</p>
          </div>
        ))}

        {/* If historical year is loaded with events */}
        {historicalYear && events.length > 0 && (
          <div className="pt-2">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground block px-1 mb-2">
              ARCHIVED NASA EONET INCIDENTS ({historicalYear})
            </span>
            <div className="space-y-2">
              {events.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="cursor-pointer border border-white/10 bg-white/5 p-2.5 rounded hover:border-amber-400/50 transition-colors"
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-white truncate max-w-[180px]">{event.title}</span>
                    <span className="text-amber-400">{event.time}</span>
                  </div>
                  <span className="text-[9px] text-white/40 block mt-0.5">{event.region}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-white/10 px-4 py-3 bg-white/[0.01]">
        <button
          type="button"
          onClick={() => onHistoricalYearChange(null)}
          className="w-full text-center text-xs text-muted-foreground hover:text-white transition-colors"
        >
          [ RESET TO LIVE TIMEFRAME ]
        </button>
      </footer>
    </div>
  )
}

/* =========================================================================
   MAIN APPLICATION ROOT
========================================================================= */
export default function SkywatchApp({
  events,
  fetchedAt,
  error,
  initialPanel = "overview",
}: {
  events: SkywatchEvent[]
  fetchedAt: string
  error: string | null
  initialPanel?: DashboardPanel
}) {
  const [activePanel, setActivePanel] = useState<DashboardPanel>(initialPanel)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [center, setCenter] = useState<[number, number]>([20, 0])
  const [zoom, setZoom] = useState(2)
  const [timeframe, setTimeframe] = useState<1 | 7 | null>(1)
  const [historicalYear, setHistoricalYear] = useState<HistoricalYear | null>(null)
  const [displayEvents, setDisplayEvents] = useState(events)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [filter, setFilter] = useState<EventFilter>("all")
  const [spaceView, setSpaceView] = useState<SpaceView>("flares")
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeather>({ flares: [], storms: [] })
  const [spaceLoading, setSpaceLoading] = useState(false)
  const [spaceError, setSpaceError] = useState<string | null>(null)
  const [spaceSelection, setSpaceSelection] = useState<SpaceSelection>(null)
  const [selectedSatId, setSelectedSatId] = useState<string | null>("nvx-72")
  const [telemetry, setTelemetry] = useState<Telemetry>({
    aqi: null,
    pm25: null,
    windDirection: null,
    windSpeed: null,
    loading: false,
    error: false,
  })

  // Filtered EONET Events
  const filteredEvents = displayEvents.filter((event) => {
    if (filter === "wildfires") return event.kind.toLowerCase().includes("wildfire")
    if (filter === "severe") return event.severity === "high"
    return true
  })
  const selectedEvent = displayEvents.find((event) => event.id === selectedEventId) ?? null

  const spaceActive = activePanel === "solar"
  const mapModeLabel = primaryNav.find((item) => item.id === activePanel)?.label ?? "Global Overview"
  const isLoading = spaceActive ? spaceLoading : eventsLoading

  const spaceSummary = {
    highestFlare: spaceWeather.flares.reduce<string | null>((highest, flare) => {
      const rank = { C: 1, M: 2, X: 3 }[flare.classType.charAt(0).toUpperCase()] ?? 0
      const highestRank = highest ? ({ C: 1, M: 2, X: 3 }[highest.charAt(0)] ?? 0) : 0
      return rank > highestRank ? flare.classType : highest
    }, null),
    highestKp: spaceWeather.storms.reduce<number | null>(
      (highest, storm) => (storm.kpIndex !== null && (highest === null || storm.kpIndex > highest) ? storm.kpIndex : highest),
      null,
    ),
  }

  async function loadEvents(url: string) {
    setEventsLoading(true)
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error("Unable to load events")
      const payload = (await response.json()) as { events?: SkywatchEvent[] }
      setDisplayEvents(payload.events?.slice(0, 100) ?? [])
    } catch {
      setDisplayEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

  async function loadSpaceWeather(url: string) {
    setSpaceLoading(true)
    setSpaceError(null)
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error("Unable to load space weather")
      const payload = (await response.json()) as SpaceWeather
      setSpaceWeather({ flares: payload.flares ?? [], storms: payload.storms ?? [] })
    } catch {
      setSpaceWeather({ flares: [], storms: [] })
      setSpaceError("Unable to load NASA DONKI space weather.")
    } finally {
      setSpaceLoading(false)
    }
  }

  function spaceUrl() {
    return historicalYear ? `/api/donki?year=${historicalYear}` : `/api/donki?days=${timeframe ?? 1}`
  }

  function changeTimeframe(nextTimeframe: 1 | 7) {
    setTimeframe(nextTimeframe)
    setHistoricalYear(null)
    setSpaceSelection(null)
    void loadEvents(`/api/eonet?days=${nextTimeframe}`)
    if (spaceActive) void loadSpaceWeather(`/api/donki?days=${nextTimeframe}`)
  }

  function changeHistoricalYear(year: HistoricalYear | null) {
    setHistoricalYear(year)
    setSpaceSelection(null)
    if (year === null) {
      setTimeframe(1)
      void loadEvents("/api/eonet?days=1")
      return
    }
    setTimeframe(null)
    void loadEvents(`/api/eonet?year=${year}`)
    if (spaceActive) void loadSpaceWeather(`/api/donki?year=${year}`)
  }

  // Auto load space weather if starting on solar panel or switching to it
  useEffect(() => {
    if (activePanel !== "solar" || spaceWeather.flares.length > 0 || spaceLoading) {
      return
    }

    const controller = new AbortController()
    const targetUrl = historicalYear ? `/api/donki?year=${historicalYear}` : `/api/donki?days=${timeframe ?? 1}`

    Promise.resolve()
      .then(() => {
        setSpaceLoading(true)
        setSpaceError(null)
        return fetch(targetUrl, { signal: controller.signal })
      })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load space weather")
        return response.json() as Promise<SpaceWeather>
      })
      .then((payload) => {
        setSpaceWeather({ flares: payload.flares ?? [], storms: payload.storms ?? [] })
        setSpaceLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setSpaceWeather({ flares: [], storms: [] })
        setSpaceError("Unable to load NASA DONKI space weather.")
        setSpaceLoading(false)
      })

    return () => controller.abort()
  }, [activePanel, spaceWeather.flares.length, spaceLoading, historicalYear, timeframe])

  // Scroll to selected card
  useEffect(() => {
    if (!selectedEventId) return
    document.getElementById(`event-card-${selectedEventId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    })
  }, [selectedEventId, filter])

  // Fetch telemetry for selected event
  useEffect(() => {
    if (!selectedEvent) return

    const controller = new AbortController()
    const [latitude, longitude] = selectedEvent.position
    Promise.all([
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm2_5`,
        { signal: controller.signal },
      ).then((response) => response.json()),
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=wind_speed_10m,wind_direction_10m`,
        { signal: controller.signal },
      ).then((response) => response.json()),
    ])
      .then(([airQuality, weather]) => {
        setTelemetry({
          aqi: typeof airQuality.current?.us_aqi === "number" ? airQuality.current.us_aqi : null,
          pm25: typeof airQuality.current?.pm2_5 === "number" ? airQuality.current.pm2_5 : null,
          windDirection:
            typeof weather.current?.wind_direction_10m === "number"
              ? weather.current.wind_direction_10m
              : null,
          windSpeed:
            typeof weather.current?.wind_speed_10m === "number"
              ? weather.current.wind_speed_10m
              : null,
          loading: false,
          error: false,
        })
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setTelemetry((current) => ({ ...current, loading: false, error: true }))
      })

    return () => controller.abort()
  }, [selectedEvent])

  function selectEvent(event: SkywatchEvent) {
    setSelectedEventId(event.id)
    setCenter(event.position)
    setZoom(7)
  }

  function trackSatellite(sat: Satellite) {
    setSelectedSatId(sat.id)
    setCenter(sat.position)
    setZoom(4)
  }

  function zoomIn() {
    setZoom((currentZoom) => Math.min(currentZoom + 1, 18))
  }

  function zoomOut() {
    setZoom((currentZoom) => Math.max(currentZoom - 1, 2))
  }

  function recenter() {
    setCenter([20, 0])
    setZoom(2)
  }

  function selectNavigationMode(id: DashboardPanel) {
    setActivePanel(id)
    setMobilePanelOpen(true)
    setSelectedEventId(null)
    setSpaceSelection(null)

    if (id === "solar") {
      void loadSpaceWeather(spaceUrl())
    }
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Left Navigation Sidebar */}
      <Sidebar active={activePanel} onSelect={selectNavigationMode} />

      {/* Main Content Area */}
      <main className="relative flex min-w-0 flex-1 overflow-hidden">
        {/* Leaflet Map Area */}
        <MapArea
          events={spaceActive ? [] : filteredEvents}
          center={center}
          zoom={zoom}
          fetchedAt={fetchedAt}
          selectedEvent={selectedEvent}
          telemetry={telemetry}
          spaceActive={spaceActive}
          spaceSummary={spaceSummary}
          spaceEventCount={spaceWeather.flares.length + spaceWeather.storms.length}
          spaceSelection={spaceActive ? spaceSelection : null}
          mapModeLabel={mapModeLabel}
          isLoading={isLoading}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onRecenter={recenter}
          onMarkerSelect={selectEvent}
          onToggleMobilePanel={() => setMobilePanelOpen(!mobilePanelOpen)}
          mobilePanelOpen={mobilePanelOpen}
        />

        {/* Dynamic Functional Side Panel (Desktop) */}
        <aside className="hidden lg:flex w-[22rem] xl:w-[26rem] shrink-0 flex-col border-l border-white/10 bg-black/80 backdrop-blur-md text-white font-mono min-h-0 overflow-hidden">
          {activePanel === "overview" && (
            <OverviewPanel
              events={filteredEvents}
              error={error}
              onSelectEvent={selectEvent}
              selectedEventId={selectedEventId}
              filter={filter}
              onFilterChange={(nextFilter) => {
                setFilter(nextFilter)
                if (
                  selectedEventId &&
                  !displayEvents.find(
                    (event) =>
                      event.id === selectedEventId &&
                      (nextFilter === "all" ||
                        (nextFilter === "wildfires"
                          ? event.kind.toLowerCase().includes("wildfire")
                          : event.severity === "high")),
                  )
                ) {
                  setSelectedEventId(null)
                }
              }}
              timeframe={timeframe}
              onTimeframeChange={changeTimeframe}
              loading={eventsLoading}
            />
          )}

          {activePanel === "solar" && (
            <SolarWeatherPanel
              spaceWeather={spaceWeather}
              spaceView={spaceView}
              onSpaceViewChange={setSpaceView}
              selectedSpaceId={spaceSelection?.event.id ?? null}
              onSpaceSelect={(item) => {
                setSpaceSelection(
                  "classType" in item ? { type: "flare", event: item } : { type: "storm", event: item },
                )
              }}
              loading={spaceLoading}
              error={spaceError}
              spaceSummary={spaceSummary}
            />
          )}

          {activePanel === "satellites" && (
            <SatellitesPanel
              onTrackSatellite={trackSatellite}
              selectedSatId={selectedSatId}
            />
          )}

          {activePanel === "alerts" && (
            <AlertsPanel
              events={displayEvents}
              spaceWeather={spaceWeather}
              onSelectEvent={selectEvent}
            />
          )}

          {activePanel === "telemetry" && (
            <TelemetryPanel
              telemetry={telemetry}
              selectedEvent={selectedEvent}
            />
          )}

          {activePanel === "history" && (
            <HistoryPanel
              historicalYear={historicalYear}
              onHistoricalYearChange={changeHistoricalYear}
              events={displayEvents}
              onSelectEvent={selectEvent}
            />
          )}
        </aside>

        {/* Mobile Slide-Over Panel Drawer */}
        {mobilePanelOpen && (
          <div className="lg:hidden absolute inset-y-0 right-0 left-0 sm:left-auto sm:w-96 z-[1200] border-l border-white/10 bg-black/95 backdrop-blur-xl text-white font-mono flex flex-col shadow-2xl">
            <div className="flex justify-end p-2 border-b border-white/10">
              <button
                type="button"
                onClick={() => setMobilePanelOpen(false)}
                className="flex items-center gap-1 px-3 py-1 text-xs border border-white/20 bg-white/5 rounded text-white"
              >
                <X size={14} />
                CLOSE PANEL
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {activePanel === "overview" && (
                <OverviewPanel
                  events={filteredEvents}
                  error={error}
                  onSelectEvent={(ev) => {
                    selectEvent(ev)
                    setMobilePanelOpen(false)
                  }}
                  selectedEventId={selectedEventId}
                  filter={filter}
                  onFilterChange={setFilter}
                  timeframe={timeframe}
                  onTimeframeChange={changeTimeframe}
                  loading={eventsLoading}
                />
              )}

              {activePanel === "solar" && (
                <SolarWeatherPanel
                  spaceWeather={spaceWeather}
                  spaceView={spaceView}
                  onSpaceViewChange={setSpaceView}
                  selectedSpaceId={spaceSelection?.event.id ?? null}
                  onSpaceSelect={(item) => {
                    setSpaceSelection(
                      "classType" in item ? { type: "flare", event: item } : { type: "storm", event: item },
                    )
                    setMobilePanelOpen(false)
                  }}
                  loading={spaceLoading}
                  error={spaceError}
                  spaceSummary={spaceSummary}
                />
              )}

              {activePanel === "satellites" && (
                <SatellitesPanel
                  onTrackSatellite={(sat) => {
                    trackSatellite(sat)
                    setMobilePanelOpen(false)
                  }}
                  selectedSatId={selectedSatId}
                />
              )}

              {activePanel === "alerts" && (
                <AlertsPanel
                  events={displayEvents}
                  spaceWeather={spaceWeather}
                  onSelectEvent={(ev) => {
                    selectEvent(ev)
                    setMobilePanelOpen(false)
                  }}
                />
              )}

              {activePanel === "telemetry" && (
                <TelemetryPanel
                  telemetry={telemetry}
                  selectedEvent={selectedEvent}
                />
              )}

              {activePanel === "history" && (
                <HistoryPanel
                  historicalYear={historicalYear}
                  onHistoricalYearChange={changeHistoricalYear}
                  events={displayEvents}
                  onSelectEvent={(ev) => {
                    selectEvent(ev)
                    setMobilePanelOpen(false)
                  }}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}