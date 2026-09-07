import { DonkiApiError, getDonkiSpaceWeather } from "@/lib/donki"

export const dynamic = "force-dynamic"

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const yearParam = searchParams.get("year")
  const days = searchParams.get("days") === "7" ? 7 : 1
  const endDate = new Date()
  const startDate = new Date(endDate)

  if (yearParam) {
    const year = Number(yearParam)
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return Response.json({ error: "Invalid year." }, { status: 400 })
    }
    return fetchDonki(`${year}-01-01`, `${year}-12-31`)
  }

  startDate.setUTCDate(startDate.getUTCDate() - (days - 1))
  return fetchDonki(formatDate(startDate), formatDate(endDate))
}

async function fetchDonki(start: string, end: string) {
  try {
    return Response.json(await getDonkiSpaceWeather(start, end))
  } catch (error) {
    if (error instanceof DonkiApiError && error.status === 401) {
      return Response.json({ error: "NASA API key is not configured. Add NEXT_PUBLIC_NASA_API_KEY to .env.local and restart the dev server." }, { status: 503 })
    }
    if (error instanceof DonkiApiError && error.status === 429) {
      return Response.json({ error: "NASA DONKI rate limit reached. Check your API key or try again later." }, { status: 429 })
    }
    return Response.json({ error: "NASA DONKI is unavailable for this date range." }, { status: 502 })
  }
}