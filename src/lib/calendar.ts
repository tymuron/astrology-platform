/**
 * Generate an .ics calendar file and trigger download
 */

interface CalendarEvent {
    title: string;
    description?: string;
    startDate: Date;
    durationMinutes: number;
    location?: string;
}

function pad(n: number): string {
    return n.toString().padStart(2, '0');
}

function formatDateUTC(date: Date): string {
    return (
        date.getUTCFullYear().toString() +
        pad(date.getUTCMonth() + 1) +
        pad(date.getUTCDate()) +
        'T' +
        pad(date.getUTCHours()) +
        pad(date.getUTCMinutes()) +
        pad(date.getUTCSeconds()) +
        'Z'
    );
}

function escapeICS(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateICS(event: CalendarEvent): string {
    const start = formatDateUTC(event.startDate);
    const endDate = new Date(event.startDate.getTime() + event.durationMinutes * 60000);
    const end = formatDateUTC(endDate);
    const now = formatDateUTC(new Date());
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@selbstentdeckung.com`;

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//GanzheitlicheVedischeAstrologie//Kurs//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `DTSTAMP:${now}`,
        `UID:${uid}`,
        `SUMMARY:${escapeICS(event.title)}`,
    ];

    if (event.description) {
        lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
    }
    if (event.location) {
        lines.push(`LOCATION:${escapeICS(event.location)}`);
    }

    // Add a reminder 30 minutes before
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT30M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${escapeICS(event.title)} beginnt in 30 Minuten`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
}

export function downloadICS(event: CalendarEvent): void {
    const ics = generateICS(event);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '').replace(/\s+/g, '-').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
