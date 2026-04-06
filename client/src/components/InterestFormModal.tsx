import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InterestFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { quantity: number; message: string }) => void;
    productName: string;
    isLoading?: boolean;
    maxQuantity?: number;
}

export default function InterestFormModal({ isOpen, onClose, onSubmit, productName, isLoading, maxQuantity }: InterestFormModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [message, setMessage] = useState('');

    const handleSubmit = () => {
        onSubmit({ quantity, message });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center"
                        dir="rtl"
                    >
                        <h2 className="text-3xl font-black text-gray-900 mb-6 w-full text-center border-b border-gray-100 pb-6">
                            הגשת התעניינות
                        </h2>

                        <div className="w-full space-y-6">
                            {/* Product Info */}
                            <div className="flex items-center justify-center gap-2 text-xl font-bold">
                                <span className="text-gray-900">המוצר :</span>
                                <span className="text-gray-700">{productName}</span>
                            </div>

                            {/* Quantity */}
                            <div className="flex items-center justify-center gap-4">
                                <span className="text-xl font-bold text-gray-900">כמות הפריטים שאתה רוצה :</span>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        if (maxQuantity && val > maxQuantity) {
                                            setQuantity(maxQuantity);
                                        } else {
                                            setQuantity(val);
                                        }
                                    }}
                                    min="1"
                                    max={maxQuantity}
                                    className="w-16 h-12 rounded-xl border-2 border-[#F39200] text-center text-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F39200]/20"
                                />
                            </div>

                            {/* Message */}
                            <div className="space-y-3">
                                <label className="block text-xl font-bold text-gray-900">הודעה למוכר :</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="רשום הודעה"
                                    className="w-full h-40 rounded-3xl border-2 border-[#F39200] p-6 text-lg text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#F39200]/20 placeholder:text-gray-300"
                                ></textarea>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-10 mt-10 w-full justify-center">
                            <button
                                onClick={onClose}
                                className="px-12 py-3 rounded-xl border-2 border-[#FF7070] text-[#FF7070] font-bold text-xl hover:bg-red-50 active:scale-95 transition-all"
                            >
                                חזור
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className={`px-12 py-3 bg-[#6AA800] text-white rounded-xl font-bold text-xl shadow-[0_4px_10px_rgba(106,168,0,0.4)] transition-all flex items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-105 active:scale-95'}`}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        שולח...
                                    </>
                                ) : (
                                    'המשך'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
