import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
}

interface AuthContextType extends AuthState {
    login: (fullName: string, phone: string) => Promise<boolean>;
    register: (userData: User) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'b2win_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>(() => {
        const savedUser = localStorage.getItem(STORAGE_KEY);
        try {
            return {
                user: savedUser ? JSON.parse(savedUser) : null,
                isLoading: false,
                error: null
            };
        } catch (e) {
            console.error('Failed to parse saved user', e);
            return { user: null, isLoading: false, error: null };
        }
    });

    useEffect(() => {
        if (state.user) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.user));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [state.user]);

    const login = async (fullName: string, phone: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Logging in with Origami:', fullName, phone);
            const response = await fetch('http://localhost:5001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, phone })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Login failed');
            }

            const userData: User = await response.json();
            setState({ user: userData, isLoading: false, error: null });
            return true;
        } catch (err: any) {
            console.error('Login error:', err);
            setState(prev => ({ ...prev, isLoading: false, error: err.message || 'Login failed' }));
            return false;
        }
    };

    const register = async (userData: User) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Registering user with Origami:', userData);
            const response = await fetch('http://localhost:5001/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userData })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Registration failed');
            }

            const result = await response.json();
            console.log('Registration result:', result);

            // After registration, we might want to log the user in or just notify success
            // For now, let's treat the registered userData as the current user
            setState({ user: userData, isLoading: false, error: null });
            return true;
        } catch (err: any) {
            console.error('Registration error:', err);
            setState(prev => ({ ...prev, isLoading: false, error: err.message || 'Registration failed' }));
            return false;
        }
    };

    const logout = () => {
        setState({ user: null, isLoading: false, error: null });
    };

    return (
        <AuthContext.Provider value={{ ...state, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
