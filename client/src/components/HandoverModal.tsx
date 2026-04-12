import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import type { InterestDetail, Product } from '../types';

interface HandoverModalProps {
    isOpen: boolean;
    onClose: () => void;
    interest: InterestDetail;
    product: Product;
    isOwner: boolean;
    onSubmit: (quantity: number, unitPrice: number, transferMethod: string) => Promise<void>;
}

export default function HandoverModal({
    isOpen,
    onClose,
    interest,
    product,
    isOwner,
    onSubmit
}: HandoverModalProps) {
    const defaultPrice = product.price || 0;
    const defaultMaxQuantity = product.quantity || 1;
    const defaultQuantity = Math.min(interest.quantity || 1, defaultMaxQuantity);

    const [quantity, setQuantity] = useState(defaultQuantity);
    const [price, setPrice] = useState(defaultPrice);
    const [transferMethod, setTransferMethod] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setQuantity(defaultQuantity);
            setPrice(defaultPrice);
            setTransferMethod(isOwner ? 'המוכר' : 'הקונה');
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen, defaultQuantity, defaultPrice]);

    if (!isOpen) return null;

    const totalSum = quantity * price;
    const isDonation = defaultPrice === 0;

    const handleSubmit = async () => {
        setError(null);
        if (quantity < 1) {
            setError('הכמות חייבת להיות לפחות 1');
            return;
        }
        if (quantity > defaultMaxQuantity) {
            setError(`הכמות מסירה לא יכולה לעלות על המלאי: ${defaultMaxQuantity}`);
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(quantity, price, transferMethod);
            onClose();
        } catch (err: any) {
            setError(err.message || 'שגיאה בעת דיווח העסקה');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-full"
                >
                    {/* Header */}
                    <div className={`p-6 text-white ${isDonation ? 'bg-[#418EAB]' : 'bg-[#E39045]'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {isDonation ? 'דיווח מסירה' : 'דיווח מכירה'}
                                </h2>
                                <p className="text-white/80 mt-1 flex items-center gap-2">
                                    <span>עבור: <span className="font-bold text-white">{interest.userName}</span></span>
                                    {interest.subOrg && (
                                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                            {interest.subOrg}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-5 overflow-y-auto">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 flex items-start gap-2">
                                <span className="mt-0.5">⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5 border-b border-gray-100 pb-1">
                                    כמות
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        max={defaultMaxQuantity}
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                        className="w-24 text-center px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#418EAB] text-lg font-bold"
                                    />
                                    <span className="text-sm text-gray-400">
                                        (מתוך {defaultMaxQuantity} זמינים)
                                    </span>
                                </div>
                            </div>

                            {/* Unit Price */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5 border-b border-gray-100 pb-1">
                                    מחיר ליחידה (₪)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={price}
                                    onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#418EAB] text-lg font-bold"
                                />
                            </div>

                            {/* Total Calculation */}
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex justify-between items-center mt-2 group">
                                <span className="font-bold text-gray-600">סכום כולל:</span>
                                <span className="text-2xl font-black text-[#58A593] flex items-center gap-1">
                                    <span>₪</span>
                                    <span>{totalSum.toLocaleString()}</span>
                                </span>
                            </div>

                            {/* Delivery Dropdown */}
                            <div className="pt-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5 border-b border-gray-100 pb-1">
                                    מי מעביר את הפריט?
                                </label>
                                <select
                                    value={transferMethod}
                                    onChange={(e) => setTransferMethod(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#418EAB] text-gray-700 styling-select"
                                >
                                    <option value="הקונה">הקונה {isOwner ? '' : '(אני)'}</option>
                                    <option value="המוכר">המוכר {isOwner ? '(אני)' : ''}</option>
                                    <option value="רשימת המתנה">רשימת המתנה</option>
                                </select>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50/50">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`w-full py-3.5 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-opacity-50 ${isDonation ? 'bg-[#418EAB] hover:bg-[#316d82] focus:ring-[#418EAB]' : 'bg-[#E39045] hover:bg-[#c97b37] text-white focus:ring-[#E39045]'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5" />
                            )}
                            {isOwner ? 'אשר מכירה' : 'אשר דיווח קניה'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
