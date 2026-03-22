import { useState } from 'react';
import { API_URL } from '../config';

interface InterestSubmissionData {
    quantity: number;
    message: string;
}

export function useInterestSubmission() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isCancelled, setIsCancelled] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitInterest = async (userData: any, productId: string, data: InterestSubmissionData) => {
        setIsLoading(true);
        setError(null);
        setIsSuccess(false);
        setIsCancelled(false);

        try {
            console.log(`Submitting interest for product ${productId}:`, data);
            const response = await fetch(`${API_URL}/api/interest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userData,
                    transactionId: productId,
                    quantity: data.quantity
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit interest');
            }

            setIsSuccess(true);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to submit interest.');
            console.error('Submission error:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const cancelInterest = async (transactionId: string, userId: string) => {
        setIsLoading(true);
        setError(null);
        setIsSuccess(false);
        setIsCancelled(false);

        try {
            console.log(`Canceling interest for transaction ${transactionId} by user ${userId}`);
            const response = await fetch(`${API_URL}/api/interest`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId, userId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to cancel interest');
            }

            setIsCancelled(true);
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to cancel interest.');
            console.error('Cancellation error:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setIsSuccess(false);
        setIsCancelled(false);
        setError(null);
        setIsLoading(false);
    };

    return {
        submitInterest,
        cancelInterest,
        isLoading,
        isSuccess,
        isCancelled,
        error,
        reset
    };
}
