import { getOpenEonetEvents } from "@/lib/eonet"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const yearParam = searchParams.get("year")
  const year = yearParam ? Number(yearParam) : null
  const days = searchParams.get("days") === "7" ? 7 : 1

  try {
    return Response.json(
      await getOpenEonetEvents(
        year && year >= 2000 && year <= 2100 ? { year } : { days },
      ),
    )
  } catch {
    return Response.json({ error: "Unable to load EONET events." }, { status: 502 })
  }
}