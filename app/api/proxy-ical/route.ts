import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL mancante' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Errore risposta Google');
    
    const data = await response.text();
    
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'text/calendar',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Errore sincronizzazione' }, { status: 500 });
  }
}
