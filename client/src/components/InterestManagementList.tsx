import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, Trash2, CheckCircle2, UserCircle2, MapPin } from 'lucide-react';
import type { InterestDetail, Product } from '../types';
import { useInterestSubmission } from '../hooks/useInterestSubmission';

interface InterestManagementListProps {
    interests: InterestDetail[];
    product: Product;
    onInterestRemoved: () => void;
    isLoading: boolean;
}

export default function InterestManagementList({ interests, product, onInterestRemoved, isLoading }: InterestManagementListProps) {
    const { cancelInterest } = useInterestSubmission();
    const [removingId, setRemovingId] = useState<string | null>(null);

    const handleRemove = async (interest: InterestDetail) => {
        if (!window.confirm(`האם אתה בטוח שברצונך להסיר את ${interest.userName} מרשימת המתעניינים?`)) {
            return;
        }

        setRemovingId(interest.id);
        const success = await cancelInterest(product.id, interest.userId);
        if (success) {
            onInterestRemoved();
        }
        setRemovingId(null);
    };

    const handleReportSale = (interest: InterestDetail) => {
        // We will implement this part as a modal in the next step.
        // For now, we'll just log it or alert
        alert(`דיווח מכירה/מסירה ל- ${interest.userName} יפתח חלונית כאן.`);
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="h-6 w-1/2 bg-gray-200 animate-pulse rounded-lg mb-2"></div>
                {[1, 2].map(i => (
                    <div key={i} className="h-24 w-full bg-gray-100 animate-pulse rounded-xl"></div>
                ))}
            </div>
        );
    }

    if (!interests || interests.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <UserCircle2 className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">אין מתעניינים כרגע</h3>
                <p className="text-gray-500 text-sm">כאשר משתמשים יביעו עניין פריט זה, הם יופיעו כאן.</p>
            </div>
        );
    }

    const reportButtonText = product.price > 0 ? "דיווח מכירה" : "דיווח מסירה";

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <UserCircle2 className="w-6 h-6 text-[#418EAB]" />
                ניהול מתעניינים ({interests.length})
            </h3>

            <div className="space-y-4">
                <AnimatePresence>
                    {interests.map((interest) => (
                        <motion.div
                            key={interest.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gray-50 rounded-xl p-4 border border-gray-100 relative group overflow-hidden"
                        >
                            <div className="flex flex-col gap-3">
                                {/* Header: Details */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-gray-900 text-lg leading-tight">
                                            {interest.userName || 'משתמש לא מזוהה'}
                                        </div>
                                        {interest.phone && (
                                            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                <span dir="ltr">{interest.phone}</span>
                                            </div>
                                        )}
                                        {interest.email && (
                                            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                <span dir="ltr">{interest.email}</span>
                                            </div>
                                        )}
                                        {(interest.subOrg || interest.organization) && (
                                            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1 flex-wrap">
                                                {interest.subOrg && (
                                                    <div className="flex items-center gap-1">
                                                        <UserCircle2 className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>{interest.subOrg}</span>
                                                    </div>
                                                )}
                                                {interest.subOrg && interest.organization && (
                                                    <span className="text-gray-300 text-xs">|</span>
                                                )}
                                                {interest.organization && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-500">{interest.organization}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-white px-3 py-1 rounded-full text-xs font-bold text-gray-600 border border-gray-100 shadow-sm whitespace-nowrap">
                                        כמות: {interest.quantity}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-2 mt-2 border-t border-gray-200/60 pt-3">
                                    {/* Action 1: Send Message (Mailto or WA) */}
                                    {interest.phone ? (
                                        <a
                                            href={`https://wa.me/972${interest.phone.replace(/^0/, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-[#25D366] text-white flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all"
                                        >
                                            <Phone className="w-4 h-4" />
                                            שלח הודעה
                                        </a>
                                    ) : (
                                        <button disabled className="bg-gray-200 text-gray-400 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold shadow-sm cursor-not-allowed">
                                            <Mail className="w-4 h-4" />
                                            אין פרטים
                                        </button>
                                    )}

                                    {/* Action 2: Report Sale */}
                                    <button
                                        onClick={() => handleReportSale(interest)}
                                        className="bg-[#418EAB] text-white flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-[#316d82] active:scale-95 transition-all"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        {reportButtonText}
                                    </button>

                                    {/* Action 3: Remove */}
                                    <button
                                        onClick={() => handleRemove(interest)}
                                        disabled={removingId === interest.id}
                                        className="col-span-2 bg-white border border-[#FF7070] text-[#FF7070] flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-red-50 disabled:opacity-50 active:scale-95 transition-all"
                                    >
                                        {removingId === interest.id ? (
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        הסר מתעניין
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
