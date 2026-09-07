export type SpaceSeverity = "high" | "med" | "low"

export type SolarFlare = {
  id: string
  classType: string
  peakTime: string
  sourceLocation: string
  severity: SpaceSeverity
}

export type GeomagneticStorm = {
  id: string
  startTime: string
  kpIndex: number | null
  severity: SpaceSeverity
}

type DonkiFlare = {
  flrID?: string
  classType?: string
  peakTime?: string
  sourceLocation?: string
}

type DonkiStorm = {
  gstID?: string
  startTime?: string
  allKpIndex?: Array<{ kpIndex?: number | string }>
}

export type DonkiResponse = {
  flares: SolarFlare[]
  storms: GeomagneticStorm[]
  fetchedAt: string
  start: string
  end: string
}

export class DonkiApiError extends Error {
  status: number

  constructor(status: number) {
    super(`DONKI request failed (${status})`)
    this.status = status
  }
}

const DONKI_FLARE_URL = "https://api.nasa.gov/DONKI/FLR"
const DONKI_STORM_URL = "https://api.nasa.gov/DONKI/GST"

function flareSeverity(classType: string): SpaceSeverity {
  const prefix = classType.trim().toUpperCase().charAt(0)
  if (prefix === "X") return "high"
  if (prefix === "M") return "med"
  return "low"
}

function stormSeverity(kpIndex: number | null): SpaceSeverity {
  if (kpIndex !== null && kpIndex >= 7) return "high"
  if (kpIndex !== null && kpIndex >= 5) return "med"
  return "low"
}

function highestKpIndex(storm: DonkiStorm): number | null {
  const values = (storm.allKpIndex ?? [])
    .map((entry) => Number(entry.kpIndex))
    .filter((value) => Number.isFinite(value))
  return values.length ? Math.max(...values) : null
}

export function parseDonkiResponse(
  flares: DonkiFlare[],
  storms: DonkiStorm[],
  start: string,
  end: string,
): DonkiResponse {
  return {
    flares: flares
      .filter((flare) => flare.flrID)
      .map((flare) => ({
        id: flare.flrID!,
        classType: flare.classType?.trim() || "Unknown",
        peakTime: flare.peakTime || "",
        sourceLocation: flare.sourceLocation?.trim() || "Unknown source",
        severity: flareSeverity(flare.classType || ""),
      })),
    storms: storms
      .filter((storm) => storm.gstID)
      .map((storm) => {
        const kpIndex = highestKpIndex(storm)
        return {
          id: storm.gstID!,
          startTime: storm.startTime || "",
          kpIndex,
          severity: stormSeverity(kpIndex),
        }
      }),
    fetchedAt: new Date().toISOString(),
    start,
    end,
  }
}

export async function getDonkiSpaceWeather(start: string, end: string): Promise<DonkiResponse> {
  const apiKey = process.env.NEXT_PUBLIC_NASA_API_KEY || "DEMO_KEY"
  const ranges: Array<[string, string]> = []
  let rangeStart = new Date(`${start}T00:00:00Z`)
  const rangeEnd = new Date(`${end}T00:00:00Z`)

  while (rangeStart <= rangeEnd) {
    const chunkEnd = new Date(rangeStart)
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + 29)
    if (chunkEnd > rangeEnd) chunkEnd.setTime(rangeEnd.getTime())
    ranges.push([rangeStart.toISOString().slice(0, 10), chunkEnd.toISOString().slice(0, 10)])
    rangeStart = new Date(chunkEnd)
    rangeStart.setUTCDate(rangeStart.getUTCDate() + 1)
  }

  const chunks = await Promise.all(ranges.map(async ([chunkStart, chunkEnd]) => {
    const params = new URLSearchParams({ startDate: chunkStart, endDate: chunkEnd, api_key: apiKey })
    const [flareResponse, stormResponse] = await Promise.all([
      fetch(`${DONKI_FLARE_URL}?${params}`, { cache: "no-store" }),
      fetch(`${DONKI_STORM_URL}?${params}`, { cache: "no-store" }),
    ])

    if (!flareResponse.ok || !stormResponse.ok) {
      throw new DonkiApiError(Math.max(flareResponse.status, stormResponse.status))
    }

    return (await Promise.all([
      flareResponse.json(),
      stormResponse.json(),
    ])) as [DonkiFlare[], DonkiStorm[]]
  }))

  return parseDonkiResponse(
    chunks.flatMap(([flares]) => flares),
    chunks.flatMap(([, storms]) => storms),
    start,
    end,
  )
}