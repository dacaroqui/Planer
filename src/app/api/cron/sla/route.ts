import { NextResponse } from "next/server"
import { vigilarSlas } from "@/server/requests"

async function revisar(request: Request) {
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

export const GET = revisar
export const POST = revisar
