import { NextResponse } from 'next/server'
import { sendAlertMail } from '@/lib/mail'

export async function GET() {
  try {

    const trTime = new Date().toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul"
    })

    await sendAlertMail(
      '⚠️ DPPForge Sahte Ürün Alarmı',
      `⚠️ DPPForge sistemi şüpheli okutma tespit etti.

Alarm zamanı: ${trTime}

Bu ürünün okutma davranışı olağan dışı görünüyor.
Sahte ürün ihtimali olabilir.`
    )

    return NextResponse.json({ ok: true })

  } catch (e: any) {
    console.error('[test-mail] failed:', e)

    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}