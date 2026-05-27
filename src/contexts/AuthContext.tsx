import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole } from '../lib/types';

const PENDING_INVITE_KEY = 'astrology.pendingInvite';
const ROLE_CACHE_KEY = 'astrology.cachedRole';

async function tryRedeemPendingInvite() {
    if (typeof localStorage === 'undefined') return;
    const token = localStorage.getItem(PENDING_INVITE_KEY);
    if (!token) return;
    const { error } = await supabase.rpc('redeem_invite', { invite_token: token });
    if (!error) {
        localStorage.removeItem(PENDING_INVITE_KEY);
    } else {
        console.warn('Pending invite redemption failed:', error.message);
    }
}

// Cache the resolved identity so repeat visits skip BOTH the profile-fetch
// round-trip AND the LoginPage flash before the redirect kicks in. We store
// a minimal optimistic user object (id, email, full_name) plus the role, so
// the very first render after a reload already has `user && role` and the
// router can navigate straight to /student or /teacher.
//
// The real session is still validated by getSession() in the background:
// if the cache is stale (session expired, signed out elsewhere), onAuthStateChange
// fires with no user, we clear the cache and the router redirects to /login.
interface CachedAuth {
    userId: string;
    role: UserRole;
    email?: string;
    name?: string;
}

function readCachedAuth(): CachedAuth | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(ROLE_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.userId) return null;
        if (parsed.role !== 'student' && parsed.role !== 'teacher') return null;
        return parsed as CachedAuth;
    } catch { return null; }
}

function writeCachedAuth(user: User, role: UserRole) {
    if (typeof localStorage === 'undefined') return;
    try {
        const payload: CachedAuth = {
            userId: user.id,
            role,
            email: user.email,
            name: (user.user_metadata as { full_name?: string } | undefined)?.full_name,
        };
        localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(payload));
    } catch { }
}

function clearCachedAuth() {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.removeItem(ROLE_CACHE_KEY); } catch { }
}

// Optimistic user object built from cache so the first render already
// has identity, before getSession() has resolved. Replaced by the real
// User from getSession as soon as it arrives.
function optimisticUserFromCache(cached: CachedAuth): User {
    return {
        id: cached.userId,
        email: cached.email || '',
        user_metadata: { full_name: cached.name || '' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: '',
    } as User;
}

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
    // Pre-hydrate from cache so the first render already knows who the user
    // is (no LoginPage flash before the redirect, no protected-layout spinner).
    const initialCache = typeof window !== 'undefined' ? readCachedAuth() : null;
    const [user, setUser] = useState<User | null>(initialCache ? optimisticUserFromCache(initialCache) : null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<UserRole | null>(initialCache ? initialCache.role : null);
    const [loading, setLoading] = useState(initialCache ? false : true);

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
                // Replace the optimistic user object with the real one from
                // the verified session, then refresh role in background.
                setUser(session.user);
                fetchUserRole(session.user.id);
            } else {
                // Cache was stale (no real session) — clear optimistic state.
                clearCachedAuth();
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (session?.user) {
                setUser(session.user);
                if (event === 'SIGNED_IN') {
                    tryRedeemPendingInvite();
                }
                fetchUserRole(session.user.id);
            } else {
                clearCachedAuth();
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
                    writeCachedAuth(updatedUser, fetchedRole);
                } else {
                    writeCachedAuth({ id: userId } as User, fetchedRole);
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
        clearCachedAuth();
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
