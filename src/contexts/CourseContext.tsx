import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CourseRow } from '../lib/types';
import { useAuth } from './AuthContext';

interface CourseContextType {
    courses: CourseRow[];
    activeCourseId: string | null;
    setActiveCourseId: (id: string | null) => void;
    loading: boolean;
    error: string | null;
}

const STORAGE_KEY = 'astrology.activeCourseId';

const CourseContext = createContext<CourseContextType>({
    courses: [],
    activeCourseId: null,
    setActiveCourseId: () => { },
    loading: true,
    error: null,
});

export const useCourseContext = () => useContext(CourseContext);

interface EntitlementRow {
    course_id: string;
    courses: CourseRow | CourseRow[] | null;
}

export function CourseProvider({ children }: { children: React.ReactNode }) {
    const { user, role, loading: authLoading, isDemo } = useAuth();
    const [courses, setCourses] = useState<CourseRow[]>([]);
    const [activeCourseId, setActiveCourseIdState] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const setActiveCourseId = useCallback((id: string | null) => {
        setActiveCourseIdState(id);
        try {
            if (id) localStorage.setItem(STORAGE_KEY, id);
            else localStorage.removeItem(STORAGE_KEY);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (authLoading) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                if (isDemo) {
                    const mock: CourseRow = {
                        id: 'mock-course-id',
                        slug: 'hva-welle-1',
                        title: 'Welle 1',
                        description: null,
                        is_active: true,
                        order_index: 1,
                    };
                    if (!cancelled) {
                        setCourses([mock]);
                        setActiveCourseIdState(mock.id);
                        setLoading(false);
                    }
                    return;
                }

                if (!user) {
                    if (!cancelled) {
                        setCourses([]);
                        setActiveCourseIdState(null);
                        setLoading(false);
                    }
                    return;
                }

                let list: CourseRow[] = [];
                if (role === 'teacher') {
                    const { data, error: qErr } = await supabase
                        .from('courses')
                        .select('id, slug, title, description, is_active, order_index')
                        .eq('is_active', true)
                        .order('order_index', { ascending: true });
                    if (qErr) throw qErr;
                    list = (data ?? []) as CourseRow[];
                } else {
                    const { data, error: qErr } = await supabase
                        .from('user_entitlements')
                        .select('course_id, courses(id, slug, title, description, is_active, order_index)')
                        .eq('user_id', user.id);
                    if (qErr) throw qErr;
                    const rows = (data ?? []) as unknown as EntitlementRow[];
                    list = rows
                        .map(r => Array.isArray(r.courses) ? r.courses[0] : r.courses)
                        .filter((c): c is CourseRow => !!c && c.is_active)
                        .sort((a, b) => a.order_index - b.order_index);
                }

                if (cancelled) return;
                setCourses(list);

                let stored: string | null = null;
                try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
                const storedValid = stored && list.some(c => c.id === stored);
                const next = storedValid ? stored : (list[0]?.id ?? null);
                setActiveCourseIdState(next);
                try {
                    if (next) localStorage.setItem(STORAGE_KEY, next);
                    else localStorage.removeItem(STORAGE_KEY);
                } catch { /* ignore */ }
            } catch (err: any) {
                console.error('Failed to load courses:', err);
                if (!cancelled) {
                    setError(err?.message || 'Kurse konnten nicht geladen werden.');
                    setCourses([]);
                    setActiveCourseIdState(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [user, role, authLoading, isDemo]);

    return (
        <CourseContext.Provider value={{ courses, activeCourseId, setActiveCourseId, loading, error }}>
            {children}
        </CourseContext.Provider>
    );
}
