import { NextRequest, NextResponse } from 'next/server';
import ICAL from 'ical.js';

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ events: [] });
    }

    const allEvents: Array<{
      id: string;
      title: string;
      start: string;
      end: string;
      allDay?: boolean;
      source?: string;
    }> = [];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const icalData = await response.text();
        const jcalData = ICAL.parse(icalData);
        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents('vevent');

        for (const vevent of vevents) {
          const event = new ICAL.Event(vevent);
          const title = event.summary || 'Untitled Event';
          const startDate = event.startDate?.toJSDate();
          const endDate = event.endDate?.toJSDate();
          const uid = event.uid || '';

          if (startDate) {
            const start = startDate;
            const end = endDate || start;
            allEvents.push({
              id: uid || `${title}-${start.toISOString()}`,
              title,
              start: start.toISOString(),
              end: end.toISOString(),
              allDay: event.startDate?.isDate || false,
              source: url,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching iCal:', error);
      }
    }

    return NextResponse.json({ events: allEvents });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ events: [], error: 'Failed to fetch calendars' }, { status: 500 });
  }
}
