export type EventSeverity = "high" | "med" | "low"

export type SkywatchEvent = {
  id: string
  kind: string
  title: string
  detail: string
  region: string
  time: string
  severity: EventSeverity
  metric: string
  position: [number, number]
}

type EonetCategory = {
  id?: string
  title?: string
}

type EonetGeometry = {
  date?: string
  type?: string
  magnitudeValue?: number | null
  magnitudeUnit?: string | null
  coordinates?: unknown
}

type EonetEvent = {
  id?: string
  title?: string
  description?: string | null
  closed?: string | null
  categories?: EonetCategory[]
  geometry?: EonetGeometry[]
}

type EonetResponse = {
  events?: EonetEvent[]
}

const EONET_EVENTS_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"

const categorySeverity: Record<string, EventSeverity> = {
  severeStorms: "high",
  volcanoes: "high",
  earthquakes: "high",
  wildfires: "med",
  seaLakeIce: "med",
  floods: "med",
  landslides: "med",
  dustHaze: "low",
  snow: "low",
  temperatureExtremes: "low",
  drought: "low",
  waterColor: "low",
  manmade: "low",
}

function isLonLatPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
}

function lonLatToLatLng(pair: [number, number]): [number, number] {
  const [lon, lat] = pair
  return [lat, lon]
}

function extractPosition(geometry: EonetGeometry): [number, number] | null {
  const { type, coordinates } = geometry
  if (!type || coordinates == null) return null

  if (type === "Point" && isLonLatPair(coordinates)) {
    return lonLatToLatLng(coordinates)
  }

  if (type === "LineString" && Array.isArray(coordinates)) {
    const last = coordinates[coordinates.length - 1]
    if (isLonLatPair(last)) return lonLatToLatLng(last)
  }

  if (type === "Polygon" && Array.isArray(coordinates)) {
    const ring = coordinates[0]
    if (Array.isArray(ring) && isLonLatPair(ring[0])) {
      return lonLatToLatLng(ring[0])
    }
  }

  return null
}

function formatRegion(position: [number, number]): string {
  const [lat, lon] = position
  const latHemisphere = lat >= 0 ? "N" : "S"
  const lonHemisphere = lon >= 0 ? "E" : "W"
  return `${Math.abs(lat).toFixed(1)}°${latHemisphere} ${Math.abs(lon).toFixed(1)}°${lonHemisphere}`
}

function formatEventTime(isoDate: string | undefined): string {
  if (!isoDate) return "—"
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return "—"
  const day = date.toISOString().slice(0, 10)
  const time = date.toISOString().slice(11, 16)
  return `${day} ${time} UTC`
}

function formatMetric(geometry: EonetGeometry, categoryId: string): string {
  const value = geometry.magnitudeValue
  const unit = geometry.magnitudeUnit
  if (typeof value === "number" && Number.isFinite(value)) {
    if (unit && unit !== "None") {
      return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)} ${unit}`
    }
    return String(value)
  }
  return categoryId || "EONET"
}

export function parseEonetEvents(payload: EonetResponse): SkywatchEvent[] {
  const events: SkywatchEvent[] = []

  for (const event of payload.events ?? []) {
    if (!event?.id || event.closed) continue

    const geometry = event.geometry ?? []
    const latest = [...geometry].reverse().find((entry) => extractPosition(entry))
    if (!latest) continue

    const position = extractPosition(latest)
    if (!position) continue

    const category = event.categories?.[0]
    const kind = category?.title?.trim() || "Natural Event"
    const categoryId = category?.id ?? ""
    const title = event.title?.trim()
    if (!title) continue

    events.push({
      id: event.id,
      kind,
      title,
      detail: event.description?.trim() || `${kind} tracked by NASA EONET.`,
      region: formatRegion(position),
      time: formatEventTime(latest.date),
      severity: categorySeverity[categoryId] ?? "low",
      metric: formatMetric(latest, categoryId),
      position,
    })
  }

  return events
}

export async function getOpenEonetEvents(options: { days?: number; year?: number } = { days: 1 }): Promise<{
  events: SkywatchEvent[]
  fetchedAt: string
}> {
  try {
    const query = new URLSearchParams({ status: "open" })
    if (options.year) {
      query.set("start", `${options.year}-01-01`)
      query.set("end", `${options.year}-12-31`)
    } else {
      query.set("days", String(options.days ?? 1))
    }
    const url = `${EONET_EVENTS_URL}?${query.toString()}`
    console.log(`Fetching NASA EONET events from: ${url}`)
    const response = await fetch(url, {
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`EONET request failed with status: ${response.status}`)
      throw new Error(`EONET request failed (${response.status})`)
    }

    const payload = (await response.json()) as EonetResponse
    console.log(`Successfully fetched ${payload.events?.length || 0} events from NASA EONET`)
    return {
      events: parseEonetEvents(payload),
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Failed to fetch NASA EONET events:", error)
    throw error
  }
}
