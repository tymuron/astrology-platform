import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole } from '../lib/types';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: UserRole | null;
    loading: boolean;
    signOut: () => Promise<void>;
    switchDemoRole: (newRole: UserRole) => void;
    isDemo: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    role: null,
    loading: true,
    signOut: async () => { },
    switchDemoRole: () => { },
    isDemo: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    const isPlaceholder = !import.meta.env.VITE_SUPABASE_URL ||
        import.meta.env.VITE_SUPABASE_URL.includes('placeholder') ||
        !import.meta.env.VITE_SUPABASE_ANON_KEY ||
        import.meta.env.VITE_SUPABASE_ANON_KEY === 'placeholder';

    const isDemo = isPlaceholder;

    const createMockUser = (demoRole: UserRole) => {
        const name = demoRole === 'teacher' ? 'Maria Sobotka' : 'Maria Teilnehmer';
        const mockUser: User = {
            id: demoRole === 'teacher' ? 'mock-teacher-id' : 'mock-student-id',
            app_metadata: {},
            user_metadata: {
                full_name: name,
                avatar_url: null,
            },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
        } as User;
        return mockUser;
    };

    useEffect(() => {
        if (isPlaceholder) {
            // In demo mode, don't auto-login — wait for user to pick a role on login page
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                setUser(session.user); // Set user first
                fetchUserRole(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                setUser(session.user);
                fetchUserRole(session.user.id);
            } else {
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const switchDemoRole = (newRole: UserRole) => {
        const mockUser = createMockUser(newRole);
        const mockSession: Session = {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockUser,
        };
        setSession(mockSession);
        setUser(mockUser);
        setRole(newRole);
    };

    const fetchUserRole = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('Profile fetch error, defaulting to student:', error.message);
                setRole('student');
            } else {
                const fetchedRole = data?.role as UserRole || 'student';
                setRole(fetchedRole);
                if (user) {
                    const updatedUser = { ...user, user_metadata: { ...user.user_metadata, ...data } };
                    setUser(updatedUser);
                }
            }
        } catch (err) {
            console.error(err);
            setRole('student');
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        if (!isPlaceholder) {
            await supabase.auth.signOut();
        }
        setRole(null);
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, role, loading, signOut, switchDemoRole, isDemo }}>
            {children}
        </AuthContext.Provider>
    );
}
