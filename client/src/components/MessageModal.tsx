import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (message: string) => Promise<void>;
    buyerName: string;
}

export default function MessageModal({ isOpen, onClose, onSend, buyerName }: MessageModalProps) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSend = async () => {
        if (!message.trim()) return;
        setIsSending(true);
        setError(null);
        try {
            await onSend(message.trim());
            setSuccess(true);
            setMessage('');
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1200);
        } catch (e: any) {
            setError(e.message || 'שליחת ההודעה נכשלה');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 20, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-auto flex flex-col gap-4 relative"
                    onClick={e => e.stopPropagation()}
                >
                    <h2 className="text-xl font-bold text-gray-800 mb-2">שלח הודעה ל{buyerName}</h2>
                    <textarea
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#418EAB] focus:ring-2 focus:ring-[#418EAB]/20 min-h-[80px] resize-none"
                        placeholder="כתוב את הודעתך כאן..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        disabled={isSending}
                        dir="rtl"
                    />
                    {error && <div className="text-red-500 text-sm font-bold">{error}</div>}
                    {success && <div className="text-green-600 text-sm font-bold">ההודעה נשלחה בהצלחה!</div>}
                    <div className="flex gap-2 justify-end mt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all"
                            disabled={isSending}
                        >
                            ביטול
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || isSending}
                            className="px-6 py-2 rounded-lg bg-[#18bb54] text-white font-bold hover:bg-[#1DA851] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSending ? 'שולח...' : 'שלח הודעה'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
