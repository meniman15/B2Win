import { useState } from 'react';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: false,
        error: null
    });

    const login = async (fullName: string, phone: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Logging in with:', fullName, phone.length > 0 ? '(phone provided)' : '(no phone)');
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mock success
            const mockUser: User = {
                id: '1',
                firstName: 'ישראל',
                lastName: 'ישראלי',
                email: username,
                phone: '050-1234567',
                organization: 'ארגון כלשהו'
            };

            setState({ user: mockUser, isLoading: false, error: null });
            return true;
        } catch (err) {
            setState(prev => ({ ...prev, isLoading: false, error: 'Login failed' }));
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
