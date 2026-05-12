import { useEffect, useState } from 'react';
import { Calendar, CalendarPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { downloadICS } from '../lib/calendar';

interface CourseEvent {
    id: string;
    title: string;
    description: string;
    event_date: string;
    duration_minutes: number;
    location: string;
}

export default function UpcomingEvents() {
    const [events, setEvents] = useState<CourseEvent[]>([]);

    useEffect(() => {
        async function fetchEvents() {
            try {
                const { data } = await supabase
                    .from('course_events')
                    .select('*')
                    .gte('event_date', new Date().toISOString())
                    .order('event_date', { ascending: true })
                    .limit(5);
                if (data) setEvents(data);
            } catch {
                // Table might not exist yet
            }
        }
        fetchEvents();
    }, []);

    if (events.length === 0) return null;

    const handleAddToCalendar = (ev: CourseEvent) => {
        downloadICS({
            title: ev.title,
            description: ev.description || undefined,
            startDate: new Date(ev.event_date),
            durationMinutes: ev.duration_minutes,
            location: ev.location || undefined,
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-vastu-sand/50 p-4 mb-4">
            <h3 className="font-serif text-sm font-medium text-vastu-dark mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-vastu-gold" />
                Nächste Termine
            </h3>
            <div className="space-y-2">
                {events.map(ev => {
                    const d = new Date(ev.event_date);
                    return (
                        <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg bg-vastu-cream/40 border border-vastu-sand/20">
                            <div className="flex-1 min-w-0">
                                <p className="font-serif text-sm font-medium text-vastu-dark">{ev.title}</p>
                                <p className="text-xs font-body text-vastu-text-light">
                                    {d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    {' · '}{d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                    {ev.location && ` · ${ev.location}`}
                                </p>
                            </div>
                            <button
                                onClick={() => handleAddToCalendar(ev)}
                                className="shrink-0 ml-3 flex items-center gap-1.5 text-xs font-sans font-medium text-vastu-gold hover:text-vastu-dark bg-vastu-gold/10 hover:bg-vastu-gold/20 px-3 py-2 rounded-lg transition-colors"
                                title="Zum Kalender hinzufügen"
                            >
                                <CalendarPlus size={14} />
                                <span className="hidden sm:inline">Kalender</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
