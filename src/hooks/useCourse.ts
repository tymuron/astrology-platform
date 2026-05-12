import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Module, Lektion } from '../lib/types';
import { COURSE_DATA } from '../lib/data';

export function useModules() {
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchModules() {
            try {
                if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    // Use mock data — apply date-based locking
                    const now = new Date();
                    const modulesWithLock = COURSE_DATA.modules.map(m => ({
                        ...m,
                        isLocked: m.availableFrom ? new Date(m.availableFrom) > now : m.isLocked,
                    }));
                    setModules(modulesWithLock);
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('weeks')
                    .select(`*, days (*), materials (*)`)
                    .order('order_index', { ascending: true });

                if (error) throw error;

                // Get current user
                const { data: { user } } = await supabase.auth.getUser();

                // Fetch user progress for current user
                const { data: progressData } = await supabase
                    .from('user_progress')
                    .select('day_id')
                    .eq('user_id', user?.id);

                const completedIds = new Set(progressData?.map((p: any) => p.day_id));

                // Check for review
                const { data: reviewData } = await supabase
                    .from('reviews')
                    .select('id')
                    .eq('user_id', user?.id)
                    .single();

                const hasReview = !!reviewData;

                if (data) {
                    const transformed: Module[] = data.map((w) => ({
                        id: w.id,
                        title: w.title,
                        description: w.description,
                        isLocked: w.id === 'bonus'
                            ? !hasReview
                            : (w.available_from ? new Date(w.available_from) > new Date() : false),
                        availableFrom: w.available_from,
                        lektionen: w.days
                            .filter((d: any) => d.is_visible !== false)
                            .sort((a: any, b: any) => a.order_index - b.order_index)
                            .map((d: any) => ({
                                id: d.id,
                                title: d.title,
                                description: d.description,
                                vimeoUrl: d.vimeo_url,
                                date: d.date,
                                isCompleted: completedIds.has(d.id),
                                homeworkDescription: d.homework_description,
                                homeworkChecklist: d.homework_checklist,
                                materials: [],
                            })),
                        moduleMaterials: w.materials
                            .filter((m: any) => m.week_id === w.id && !m.day_id)
                            .map((m: any) => ({
                                id: m.id,
                                title: m.title,
                                type: m.type,
                                url: m.url,
                                isHomework: m.is_homework,
                            })),
                    }));
                    setModules(transformed);
                }
            } catch (err) {
                console.error(err);
                setError('Fehler beim Laden der Module');
                setModules(COURSE_DATA.modules);
            } finally {
                setLoading(false);
            }
        }

        fetchModules();
    }, []);

    return { modules, loading, error };
}

export function useLektion(moduleId: string | undefined, lektionId: string | undefined) {
    const [lektion, setLektion] = useState<Lektion | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchLektion = async () => {
        if (!moduleId || !lektionId) return;

        if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
            const m = COURSE_DATA.modules.find(m => m.id === moduleId);
            const l = m?.lektionen.find(l => l.id === lektionId);
            setLektion(l || null);
            setLoading(false);
            return;
        }

        try {
            const { data: dayData, error: dayError } = await supabase
                .from('days')
                .select('*')
                .eq('id', lektionId)
                .single();

            if (dayError) throw dayError;

            const { data: matData } = await supabase
                .from('materials')
                .select('*')
                .eq('day_id', lektionId);

            const { data: { user } } = await supabase.auth.getUser();

            const { data: progressData } = await supabase
                .from('user_progress')
                .select('id')
                .eq('day_id', lektionId)
                .eq('user_id', user?.id)
                .single();

            if (dayData) {
                setLektion({
                    id: dayData.id,
                    title: dayData.title,
                    description: dayData.description,
                    vimeoUrl: dayData.vimeo_url,
                    date: dayData.date,
                    isCompleted: !!progressData,
                    homeworkDescription: dayData.homework_description,
                    homeworkChecklist: dayData.homework_checklist,
                    materials: (matData || []).map((m: any) => ({
                        id: m.id,
                        title: m.title,
                        type: m.type,
                        url: m.url,
                    })),
                });
            }
        } catch (err) {
            console.error(err);
            const m = COURSE_DATA.modules.find(m => m.id === moduleId);
            const l = m?.lektionen.find(l => l.id === lektionId);
            setLektion(l || null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLektion();
    }, [moduleId, lektionId]);

    const toggleComplete = async (completed: boolean) => {
        if (!lektionId) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (completed) {
                await supabase.from('user_progress').upsert({ user_id: user.id, day_id: lektionId });
            } else {
                await supabase.from('user_progress').delete().match({ user_id: user.id, day_id: lektionId });
            }
            fetchLektion();
        } catch (error) {
            console.error('Fehler beim Aktualisieren:', error);
        }
    };

    return { lektion, loading, toggleComplete };
}

// Re-export for backwards compat with teacher pages that still use old names
export const useWeeks = useModules;
export const useDay = useLektion;
