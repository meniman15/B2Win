import { useState, useEffect } from 'react';
import { ArrowRight, MapPin, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTagColor } from '../utils/theme';
import { useInterestSubmission } from '../hooks/useInterestSubmission';
import { useAuth } from '../hooks/useAuth';
import InterestFormModal from './InterestFormModal';

import type { Product } from '../types';

interface ProductModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
    const [isInterestFormOpen, setIsInterestFormOpen] = useState(false);
    const [isInterested, setIsInterested] = useState(false);
    const { user } = useAuth();
    const { submitInterest, cancelInterest, isLoading, isSuccess, isCancelled, reset } = useInterestSubmission();

    // Reset submission state when modal closes or product changes
    useEffect(() => {
        if (!isOpen) {
            reset();
        }
    }, [isOpen, reset]);

    const handleInterestClick = async () => {
        if (isInterested) {
            if (product && user) {
                const success = await cancelInterest(product.id, user.origamiId || user.id || '');
                if (success) {
                    setIsInterested(false);
                }
            }
        } else {
            setIsInterestFormOpen(true);
        }
    };

    if (!product) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="absolute inset-0 m-auto w-full max-w-6xl h-[90vh] bg-[#f9fafb] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                        dir="rtl"
                    >
                        {/* Header / Back Navigation */}
                        <div className="bg-white px-8 py-4 flex items-center justify-between border-b border-gray-100">
                            <button
                                onClick={onClose}
                                className="flex items-center gap-2 text-[#418EAB] font-bold hover:text-[#316d82] transition-colors"
                            >
                                <ArrowRight className="w-5 h-5" />
                                חזרה להמשך הקנייה
                            </button>
                            <div className="text-sm font-medium text-gray-400">דף מוצר</div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="container mx-auto px-8 py-10">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                                    {/* Left Side - Actions and Info (Takes 4 cols) */}
                                    <div className="lg:col-span-4 space-y-6">
                                        {/* Price Card */}
                                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative group overflow-hidden">
                                            <div className="flex flex-col gap-1 mb-6">
                                                <div className="text-3xl font-black text-gray-900 leading-none">
                                                    ₪{product.price.toLocaleString()}
                                                </div>
                                                <h1 className="text-xl font-bold text-gray-800 mt-2">
                                                    {product.name}
                                                </h1>
                                                <div className="flex items-center gap-2 text-sm text-[#418EAB] font-medium mt-1">
                                                    <span>{product.manufacturer || 'כללי'}</span>
                                                    <span>|</span>
                                                    <span>{product.category || 'מחשבים'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <button className="w-full bg-[#F39200] text-white py-3.5 rounded-full font-bold shadow-md hover:bg-[#d98300] transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(243,146,0,0.3)]">
                                                    שליחת הודעה
                                                </button>
                                                <button className="w-full bg-white text-[#F39200] border-2 border-[#F39200] py-3 rounded-full font-bold hover:bg-orange-50 transition-all flex items-center justify-center gap-2">
                                                    טלפון
                                                </button>
                                            </div>

                                            <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-[#418EAB] text-white flex items-center justify-center font-bold text-lg">
                                                        {product.seller.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800">{product.seller}</div>
                                                        <div className="text-xs text-gray-400">חבר משנת {product.memberSince || '2023'}</div>
                                                    </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-[#418EAB]">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Interest Badge */}
                                        <button
                                            onClick={handleInterestClick}
                                            disabled={isLoading}
                                            className={`w-full py-4 rounded-2xl font-black text-lg shadow-md transition-all flex items-center justify-center relative overflow-hidden ${isInterested
                                                ? 'bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-[0_4px_12px_rgba(239,68,68,0.3)]'
                                                : 'bg-[#8DC63F] text-white hover:bg-[#7db137] shadow-[0_4px_12px_rgba(141,198,63,0.3)]'
                                                } ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                                        >
                                            <AnimatePresence mode="wait">
                                                {isLoading ? (
                                                    <motion.div
                                                        key="loading"
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        <span>שולח...</span>
                                                    </motion.div>
                                                ) : isInterested ? (
                                                    <motion.div
                                                        key="remove"
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        הסר התעניינות
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="submit"
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        הגשת התעניינות
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </button>
                                    </div>

                                    {/* Right Side - Image and Details (Takes 8 cols) */}
                                    <div className="lg:col-span-8 space-y-8">
                                        {/* Hero Image Section */}
                                        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 relative group">
                                            <div className="aspect-video relative">
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className={`absolute bottom-6 right-6 px-6 py-2 rounded shadow-lg text-sm font-bold text-white uppercase tracking-wider ${getTagColor(product.status)}`}>
                                                    {product.status}
                                                </div>

                                                {/* Navigation Arrows (Visual only) */}
                                                <div className="absolute inset-y-0 left-4 flex items-center">
                                                    <button className="p-2 bg-white/90 rounded-full text-gray-600 shadow-md hover:bg-white">
                                                        <ChevronLeft className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* About Section */}
                                        <div className="space-y-4">
                                            <h2 className="text-xl font-black text-gray-900">על המוצר :</h2>
                                            <p className="text-gray-600 leading-relaxed">
                                                {product.description}
                                            </p>
                                        </div>

                                        {/* Specs Table */}
                                        <div className="space-y-4">
                                            <h2 className="text-xl font-black text-gray-900">פרטים נוספים:</h2>
                                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                                    <div className="flex justify-between border-b border-gray-50 pb-2">
                                                        <span className="text-gray-400 font-medium">סטטוס פריט :</span>
                                                        <span className="text-gray-700 font-bold">{product.status}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-gray-50 pb-2">
                                                        <span className="text-gray-400 font-medium">יצרן :</span>
                                                        <span className="text-gray-700 font-bold">{product.manufacturer || '-'}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-gray-50 pb-2">
                                                        <span className="text-gray-400 font-medium">דגם :</span>
                                                        <span className="text-gray-700 font-bold">{product.model || '-'}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-gray-50 pb-2">
                                                        <span className="text-gray-400 font-medium">מיקום :</span>
                                                        <span className="text-gray-700 font-bold">{product.location}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-gray-50 pb-2 md:col-span-2">
                                                        <span className="text-gray-400 font-medium">תיעוד רכישה :</span>
                                                        <span className="text-gray-700 font-bold">{product.purchaseDocumentation || 'לא צוין'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* FAQ Mockup */}
                                        {product.faq && product.faq.length > 0 && (
                                            <div className="space-y-4">
                                                <h2 className="text-xl font-black text-gray-900">שאלות נפוצות :</h2>
                                                {product.faq.map((item, idx) => (
                                                    <div key={idx} className="space-y-2">
                                                        <div className="text-gray-800 font-bold">
                                                            {item.question}
                                                        </div>
                                                        {item.answer && (
                                                            <div className="text-gray-600">
                                                                {item.answer}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Interest Form Mini-Modal */}
                    <InterestFormModal
                        isOpen={isInterestFormOpen}
                        isLoading={isLoading}
                        onClose={() => setIsInterestFormOpen(false)}
                        onSubmit={async (data) => {
                            if (product && user) {
                                const success = await submitInterest(user, product.id, data);
                                if (success) {
                                    setIsInterested(true);
                                }
                            } else {
                                alert('יש להתחבר כדי להגיש התעניינות');
                            }
                        }}
                        productName={product.name}
                    />

                    {/* Success Overlays */}
                    <AnimatePresence>
                        {isSuccess && (
                            <motion.div
                                key="submit-success"
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute inset-x-0 bottom-10 flex justify-center z-[120]"
                            >
                                <div className="bg-[#6AA800] text-white px-8 py-3 rounded-full font-bold shadow-xl">
                                    התעניינות נשלחה בהצלחה!
                                </div>
                            </motion.div>
                        )}
                        {isCancelled && (
                            <motion.div
                                key="cancel-success"
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute inset-x-0 bottom-10 flex justify-center z-[120]"
                            >
                                <div className="bg-[#FF7070] text-white px-8 py-3 rounded-full font-bold shadow-xl">
                                    התעניינות הוסרה בהצלחה.
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            )}
        </AnimatePresence>
    );
}
