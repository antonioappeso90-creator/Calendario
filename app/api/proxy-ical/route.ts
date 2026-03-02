import { NextRequest, NextResponse } from 'next/server';

/**
 * PROXY ICAL V57 - PROTOCOLLO TITANIO
 * PERCORSO: app/api/proxy-ical/route.ts
 * MENTORE DOCET: Se non metti questo file in questo esatto percorso,
 * il calendario non caricherà MAI nulla da Google.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ error: 'URL mancante' }, { status: 400 });

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Accept': 'text/calendar, text/plain, */*',
      },
      cache: 'no-store'
    });

    const status = response.status;
    const content = await response.text();

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Google ha risposto con codice ${status}`,
        detail: status === 403 ? "Accesso negato: usa l'indirizzo SEGRETO" : "Errore server"
      }, { status });
    }

    // Protezione contro link che portano a pagine di login HTML invece che file .ics
    if (content.trim().toLowerCase().startsWith('<!doctype') || content.trim().toLowerCase().startsWith('<html')) {
      return NextResponse.json({ 
        error: "Ricevuto HTML. Il link non è un file .ics valido.",
      }, { status: 422 });
    }
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0'
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Impossibile connettersi a Google' }, { status: 500 });
  }
}
