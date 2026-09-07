import SkywatchApp from "@/components/skywatch-app"
import { getOpenEonetEvents, type SkywatchEvent } from "@/lib/eonet"

export const dynamic = "force-dynamic"

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ system?: string; [key: string]: string | string[] | undefined }>
}) {
  let events: SkywatchEvent[] = []
  let fetchedAt = new Date().toISOString()
  let error: string | null = null

  const query = searchParams ? await searchParams : {}
  const system = typeof query.system === "string" ? query.system.toLowerCase() : null
  const initialPanel =
    system === "donki"
      ? "solar"
      : system === "satellites"
        ? "satellites"
        : system === "alerts"
          ? "alerts"
          : system === "telemetry"
            ? "telemetry"
            : system === "history"
              ? "history"
              : "overview"

  try {
    const payload = await getOpenEonetEvents({ days: 1 })
    events = payload.events.slice(0, 100)
    fetchedAt = payload.fetchedAt
  } catch {
    error = "Unable to load NASA EONET events. The map and feed will stay empty until the feed is reachable."
  }

  return <SkywatchApp events={events} fetchedAt={fetchedAt} error={error} initialPanel={initialPanel} />
}
