import { useState } from 'react';

interface InterestSubmissionData {
    quantity: number;
    message: string;
}

export function useInterestSubmission() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isCancelled, setIsCancelled] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitInterest = async (productName: string, data: InterestSubmissionData) => {
        setIsLoading(true);
        setError(null);
        setIsSuccess(false);
        setIsCancelled(false);

        try {
            console.log(`Submitting interest for ${productName}:`, data);
            await new Promise(resolve => setTimeout(resolve, 1000));
            setIsSuccess(true);
            return true;
        } catch (err) {
            setError('Failed to submit interest.');
            console.error('Submission error:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const cancelInterest = async (productName: string) => {
        setIsLoading(true);
        setError(null);
        setIsSuccess(false);
        setIsCancelled(false);

        try {
            console.log(`Canceling interest for ${productName}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            setIsCancelled(true);
            return true;
        } catch (err) {
            setError('Failed to cancel interest.');
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
