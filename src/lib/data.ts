import { Course, User } from './types';

export const MOCK_USER_STUDENT: User = {
    id: 's1',
    name: 'Maria Teilnehmer',
    email: 'student@example.com',
    role: 'student',
    avatar: '',
};

export const MOCK_USER_TEACHER: User = {
    id: 't1',
    name: 'Maria Sobotka',
    email: 'teacher@example.com',
    role: 'teacher',
    avatar: '',
};

export const COURSE_DATA: Course = {
    id: 'vastulogie-2026',
    title: 'Ganzheitliche Vedische Astrologie',
    modules: [
        {
            id: 'pre',
            title: 'Sanfter Start',
            description: 'Einführung in den Kurs und vorbereitende Materialien',
            isLocked: false,
            availableFrom: '2026-02-07',
            moduleMaterials: [],
            lektionen: [],
        },
        {
            id: 'm1',
            title: 'Modul 1',
            description: 'Vastu Karte, Elemente, Reinigung & Energien',
            isLocked: false,
            availableFrom: '2026-03-20',
            moduleMaterials: [],
            lektionen: [
                { id: 'm1-1', title: '1.1 Vastu Karte & Elemente', materials: [] },
                { id: 'm1-2', title: '1.2 Energetische Reinigung', materials: [] },
                { id: 'm1-3', title: '1.3 Experimente mit den Elementen', materials: [] },
                { id: 'm1-4', title: '1.4 Innere & Äußere Energien', materials: [] },
            ],
        },
        {
            id: 'm2',
            title: 'Modul 2',
            description: 'Planeten, Charaktere, Sektoren, Yantren',
            isLocked: true,
            availableFrom: '2026-03-25',
            moduleMaterials: [],
            lektionen: [
                { id: 'm2-1', title: '2.1 Planeten, Charaktere, Sektoren, Yantren', materials: [] },
            ],
        },
        {
            id: 'm3',
            title: 'Modul 3',
            description: 'Räume im Detail — Schlafzimmer, Küche, Bad & mehr',
            isLocked: true,
            availableFrom: '2026-04-01',
            moduleMaterials: [],
            lektionen: [
                { id: 'm3-1', title: '3.1 Schlafzimmer, Arbeitszimmer, Küche & andere Zimmer', materials: [] },
                { id: 'm3-2', title: '3.2 Toilette & Badezimmer', materials: [] },
            ],
        },
        {
            id: 'm4',
            title: 'Modul 4',
            description: 'Eingangstür, Berufung & Spiegel',
            isLocked: true,
            availableFrom: '2026-04-08',
            moduleMaterials: [],
            lektionen: [
                { id: 'm4-1', title: '4.1 Eingangstür & Berufung', materials: [] },
                { id: 'm4-2', title: '4.2 Spiegel', materials: [] },
            ],
        },
        {
            id: 'm5',
            title: 'Modul 5',
            description: 'Vastu Design für jeden Sektor & alle Räume mit Praxis & visuellen Beispielen',
            isLocked: true,
            availableFrom: '2026-04-15',
            moduleMaterials: [],
            lektionen: [
                { id: 'm5-1', title: '5.1 Vastu Design für jeden Sektor & alle Räume', materials: [] },
            ],
        },
        {
            id: 'm6',
            title: 'Modul 6',
            description: 'Vastu Coaching',
            isLocked: true,
            availableFrom: '2026-04-22',
            moduleMaterials: [],
            lektionen: [
                { id: 'm6-1', title: '6.1 Vastu Coaching Übungen & Beispiele', materials: [] },
            ],
        },
        {
            id: 'm7',
            title: 'Modul 7',
            description: 'Bilder & spezielle Korrekturen',
            isLocked: true,
            availableFrom: '2026-04-29',
            moduleMaterials: [],
            lektionen: [
                { id: 'm7-1', title: '7.1 Verstärkungen durch Bilder', materials: [] },
                { id: 'm7-2', title: '7.2 Vastu-Korrekturen in verschiedenen Lebenssituationen', materials: [] },
            ],
        },
        {
            id: 'bonus',
            title: 'Bonusmodule',
            description: 'Zusätzliche Themen rund um Vastu',
            isLocked: true,
            moduleMaterials: [],
            lektionen: [
                { id: 'b1', title: 'Grundstück nach Vastu', materials: [] },
                { id: 'b2', title: 'Haustiere', materials: [] },
                { id: 'b3', title: 'Umzug', materials: [] },
                { id: 'b4', title: 'Pflanzen', materials: [] },
            ],
        },
    ],
};
