import { useState, useEffect } from 'react';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
}

const STORAGE_KEY = 'b2win_user';

export function useAuth() {
    // Initialize state from localStorage if available
    const [state, setState] = useState<AuthState>(() => {
        const savedUser = localStorage.getItem(STORAGE_KEY);
        return {
            user: savedUser ? JSON.parse(savedUser) : null,
            isLoading: false,
            error: null
        };
    });

    // Keep localStorage in sync with user state
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
            console.log('Registering user:', userData);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mock success
            setState({ user: userData, isLoading: false, error: null });
            return true;
        } catch (err) {
            setState(prev => ({ ...prev, isLoading: false, error: 'Registration failed' }));
            return false;
        }
    };

    const logout = () => {
        setState({ user: null, isLoading: false, error: null });
    };

    return {
        ...state,
        login,
        register,
        logout
    };
}
