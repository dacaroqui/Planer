import { NextResponse } from "next/server"
import { vigilarSlas } from "@/server/requests"

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  if (process.env.NODE_ENV === "production") {
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      return new NextResponse("No autorizado.", { status: 401 })
    }
  } else if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("No autorizado.", { status: 401 })
  }
  const result = await vigilarSlas()
  return NextResponse.json(result)
}
