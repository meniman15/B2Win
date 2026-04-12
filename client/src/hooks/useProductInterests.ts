import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import type { InterestDetail } from '../types';

export function useProductInterests(productId: string | undefined, isOwner: boolean) {
    const [interests, setInterests] = useState<InterestDetail[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInterests = useCallback(async () => {
        if (!productId || !isOwner) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/products/${productId}/interests`);
            if (!response.ok) {
                throw new Error('Failed to fetch detailed interests');
            }
            const data = await response.json();
            setInterests(data);
        } catch (err: any) {
            console.error('Error fetching product interests:', err);
            setError(err.message || 'Error fetching interests');
        } finally {
            setIsLoading(false);
        }
    }, [productId, isOwner]);

    useEffect(() => {
        fetchInterests();
    }, [fetchInterests]);

    return { interests, isLoading, error, refetch: fetchInterests };
}
