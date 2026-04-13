import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Phone, Mail, MessageCircleQuestion, Send, ChevronDown, ChevronUp, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTagColor } from '../utils/theme';
import { useInterestSubmission } from '../hooks/useInterestSubmission';
import { useAuth } from '../hooks/useAuth';
import InterestFormModal from './InterestFormModal';
import InterestManagementList from './InterestManagementList';
import { useProductInterests } from '../hooks/useProductInterests';
import HandoverModal from './HandoverModal';
import { API_URL } from '../config';

import type { Product, QAItem, InterestDetail } from '../types';

interface ProductModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onLoginClick: () => void;
    onInterestChange?: (productId: string, isInterested: boolean, userId: string) => void;
}

export default function ProductModal({ product, isOpen, onClose, onLoginClick, onInterestChange }: ProductModalProps) {
    const [isInterestFormOpen, setIsInterestFormOpen] = useState(false);
    const { user } = useAuth();
    const { submitInterest, cancelInterest, isLoading, isSuccess, isCancelled, reset } = useInterestSubmission();

    // Reset submission state when modal closes or product changes
    useEffect(() => {
        if (!isOpen) {
            reset();
        }
    }, [isOpen, reset]);

    // ==================== Q&A State ====================
    const [qaItems, setQaItems] = useState<QAItem[]>([]);
    const [qaLoading, setQaLoading] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [askingLoading, setAskingLoading] = useState(false);
    const [askSuccess, setAskSuccess] = useState(false);
    const [answerTexts, setAnswerTexts] = useState<{ [qaId: string]: string }>({});
    const [answeringId, setAnsweringId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedQA, setExpandedQA] = useState<Set<string>>(new Set());

    const isOwner = !!(user?.id && product?.sellerId && user.id === product.sellerId);
    const isAdmin = !!(user?.isAdmin);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
    // Initialize myInterestRecord from cached interestMap for instant UI
    const cachedInterest = product?.id && user?.interestMap?.[product.id];
    const [myInterestRecord, setMyInterestRecord] = useState<InterestDetail | null>(null);

    // Seed from cache on mount / product change
    useEffect(() => {
        if (cachedInterest && user?.id) {
            setMyInterestRecord({
                id: cachedInterest.interestId,
                userId: user.id,
                userName: `${user.firstName} ${user.lastName || ''}`.trim(),
                phone: user.phone || '',
                quantity: 1,
                status: cachedInterest.reported ? 'דווח מכירה על ידי מתעניין' : '',
            });
        }
    }, [product?.id]);

    // Fetch rich interest details
    const { interests: detailedInterests, isLoading: isInterestsLoading, refetch: refetchInterests } = useProductInterests(product?.id, isOwner);

    // Upgrade myInterestRecord with full data from API when available
    useEffect(() => {
        if (detailedInterests && user?.id) {
            const record = detailedInterests.find(i => i.userId === user.id) || null;
            if (record) {
                setMyInterestRecord(record);
            }
        }
    }, [detailedInterests, user?.id]);

    const handleHandoverReportSubmit = async (quantity: number, unitPrice: number, transferMethod: string) => {
        if (!myInterestRecord) return;

        const response = await fetch(`${API_URL}/api/interests/${myInterestRecord.id}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quantity,
                unitPrice,
                transferMethod,
                reporter: 'דיווח על ידי מתעניין' 
            })
        });

        if (!response.ok) {
            const text = await response.text();
            let errorMessage = 'Failed to report purchase';
            try {
                const data = JSON.parse(text);
                errorMessage = data.error || errorMessage;
            } catch (e) {
                errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}`;
            }
            throw new Error(errorMessage);
        }

        // Await refetch to ensure UI updates with latest backend state
        await refetchInterests();
        // Close the handover modal after successful submission
        setIsHandoverModalOpen(false);
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!product || isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        try {
            const response = await fetch(`${API_URL}/api/products/${product.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Close and reload to show new status
                setTimeout(() => {
                    onClose();
                    window.location.reload();
                }, 500);
            } else {
                const errData = await response.json();
                console.error('Failed to update status:', errData.error);
                alert('שגיאה בעדכון הסטטוס: ' + (errData.error || 'נסה שוב מאוחר יותר'));
            }
        } catch (err) {
            console.error('Error updating status:', err);
            alert('שגיאה בתקשורת עם השרת');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const fetchQuestions = useCallback(async () => {
        if (!product?.id || !isOpen) return;
        setQaLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/products/${product.id}/questions`);
            if (res.ok) {
                const data = await res.json();
                setQaItems(data);
            }
        } catch (err) {
            console.error('Error fetching Q&A:', err);
        } finally {
            setQaLoading(false);
        }
    }, [product?.id, isOpen]);

    useEffect(() => {
        fetchQuestions();
        // Reset Q&A state when modal closes
        if (!isOpen) {
            setQaItems([]);
            setNewQuestion('');
            setAskSuccess(false);
            setAnswerTexts({});
            setAnsweringId(null);
            setExpandedQA(new Set());
        }
    }, [isOpen, product?.id, fetchQuestions]);

    const handleAskQuestion = async () => {
        if (!newQuestion.trim() || !user?.id || !product?.id) return;
        setAskingLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/products/${product.id}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: newQuestion.trim(),
                    askerId: user.id,
                    askerName: `${user.firstName} ${user.lastName}`
                })
            });
            if (res.ok) {
                setNewQuestion('');
                setAskSuccess(true);
                setTimeout(() => setAskSuccess(false), 3000);
                fetchQuestions();
            }
        } catch (err) {
            console.error('Error asking question:', err);
        } finally {
            setAskingLoading(false);
        }
    };

    const handleAnswerQuestion = async (qaId: string) => {
        const answer = answerTexts[qaId]?.trim();
        if (!answer || !user?.id) return;
        setAnsweringId(qaId);
        try {
            const res = await fetch(`${API_URL}/api/questions/${qaId}/answer`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answer,
                    answererId: user.id,
                    answererName: `${user.firstName} ${user.lastName}`
                })
            });
            if (res.ok) {
                setAnswerTexts(prev => ({ ...prev, [qaId]: '' }));
                fetchQuestions();
            }
        } catch (err) {
            console.error('Error answering question:', err);
        } finally {
            setAnsweringId(null);
        }
    };

    const handleDeleteQuestion = async (qaId: string) => {
        if (!window.confirm('האם אתה בטוח שברצונך למחוק את השאלה?')) return;
        setDeletingId(qaId);
        try {
            const res = await fetch(`${API_URL}/api/questions/${qaId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchQuestions();
            }
        } catch (err) {
            console.error('Error deleting question:', err);
        } finally {
            setDeletingId(null);
        }
    };

    const toggleQAExpand = (qaId: string) => {
        setExpandedQA(prev => {
            const next = new Set(prev);
            if (next.has(qaId)) next.delete(qaId);
            else next.add(qaId);
            return next;
        });
    };

    // Derived Q&A data
    const publishedQA = qaItems.filter(q => q.isPublished);
    const unansweredQA = qaItems.filter(q => !q.isPublished);

    // Derive isInterested from up-to-date data
    const isInterested = !!(user && product && (
        product.interestedUserIds?.includes(user.id || '') ||
        user.interestList?.includes(product.id) ||
        myInterestRecord
    ));

    const handleInterestClick = async () => {
        if (!user) {
            onLoginClick();
            return;
        }

        if (isInterested) {
            if (product && user) {
                const success = await cancelInterest(product.id, user.id || '');
                if (success) {
                    if (user.interestList) {
                        user.interestList = user.interestList.filter(id => id !== product.id);
                    }
                    onInterestChange?.(product.id, false, user.id || '');
                    // Optimistically clear myInterestRecord for instant UI feedback
                    setMyInterestRecord(null);
                    await refetchInterests();
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
                                                    <span>{product.location || '-'}</span>
                                                    <span>|</span>
                                                    <span>{product.categoryName || product.category || 'מחשבים'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {(isInterested || isOwner) ? (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                                                        {product.sellerEmail && (
                                                            (product.sellerEmail.length > 25) ? (
                                                                <a
                                                                    href={`mailto:${product.sellerEmail}`}
                                                                    className="flex items-center gap-2 text-[#418EAB] hover:underline font-bold p-2 transition-all justify-center"
                                                                >
                                                                    <Mail className="w-5 h-5" />
                                                                    שלח מייל ל-{product.sellerEmail}
                                                                </a>
                                                            ) : (
                                                                <a
                                                                    href={`mailto:${product.sellerEmail}`}
                                                                    className="w-full bg-[#F39200] text-white py-3.5 pr-[10px] rounded-full font-bold shadow-md hover:bg-[#d98300] transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(243,146,0,0.3)]"
                                                                >
                                                                    <Mail className="w-5 h-5" />
                                                                    שלח ל-{product.sellerEmail}
                                                                </a>
                                                            )
                                                        )}
                                                        {product.sellerPhone && (
                                                            <a
                                                                href={`tel:${product.sellerPhone}`}
                                                                className="w-full bg-white text-[#F39200] border-2 border-[#F39200] py-3 rounded-full font-bold hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Phone className="w-5 h-5" />
                                                                {product.sellerPhone}
                                                            </a>
                                                        )}
                                                        {!product.sellerEmail && !product.sellerPhone && (
                                                            <div className="p-4 bg-gray-50 rounded-2xl text-center">
                                                                <p className="text-gray-500 font-bold text-sm">פרטי קשר לא הוזנו על ידי המוכר</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-center">
                                                        <p className="text-[#F39200] font-bold text-sm">הבע התעניינות במוצר כדי לחשוף את פרטי המוכר</p>
                                                    </div>
                                                )}
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
                                            </div>
                                        </div>

                                        {/* Admin Actions - For owner (simulated admin) */}
                                        {isOwner && isAdmin && product.status === 'ממתין לאישור' && (
                                            <div className="flex flex-col gap-3">
                                                <button
                                                    onClick={() => handleStatusUpdate('חדש')}
                                                    disabled={isUpdatingStatus}
                                                    className={`w-full py-4 rounded-2xl font-black text-lg border-2 border-[#8DC63F] text-[#8DC63F] hover:bg-[#8DC63F] hover:text-white transition-all transform flex items-center justify-center gap-2 ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                                                >
                                                    {isUpdatingStatus ? (
                                                        <div className="w-5 h-5 border-2 border-[#8DC63F] border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="w-5 h-5" />
                                                            אשר פרסום
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate('לא רלוונטי')}
                                                    disabled={isUpdatingStatus}
                                                    className={`w-full py-4 rounded-2xl font-black text-lg border-2 border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-all transform flex items-center justify-center gap-2 ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                                                >
                                                    {isUpdatingStatus ? (
                                                        <div className="w-5 h-5 border-2 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Trash2 className="w-5 h-5" />
                                                            דחה פרסום
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {/* Interest Badge - Hidden for owner and non-admin users */}
                                        {!isOwner && isAdmin && (
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
                                        )}

                                        {/* Buyer Handover Button */}
                                        {isInterested && myInterestRecord && !isOwner && isAdmin && myInterestRecord.status !== 'דווח מכירה על ידי מתעניין' && (
                                            <button
                                                onClick={() => setIsHandoverModalOpen(true)}
                                                className={`w-full mt-2 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm bg-[#418EAB] text-white hover:bg-[#316d82] active:scale-95`}
                                            >
                                                <CheckCircle2 className="w-5 h-5" />
                                                <span>דיווח רכישה</span>
                                            </button>
                                        )}
                                        {isInterested && myInterestRecord && !isOwner && isAdmin && myInterestRecord.status === 'דווח מכירה על ידי מתעניין' && (
                                            <button
                                                disabled
                                                className="w-full mt-2 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm bg-gray-200 text-gray-500 cursor-not-allowed opacity-60"
                                            >
                                                <CheckCircle2 className="w-5 h-5" />
                                                <span>דו"ח הרכישה כבר הוגש</span>
                                            </button>
                                        )}

                                        {/* Handover Modal for Buyer */}
                                        {isHandoverModalOpen && myInterestRecord && product && (
                                            <HandoverModal
                                                isOpen={isHandoverModalOpen}
                                                onClose={() => setIsHandoverModalOpen(false)}
                                                interest={myInterestRecord}
                                                product={product}
                                                isOwner={false}
                                                onSubmit={handleHandoverReportSubmit}
                                            />
                                        )}

                                        {/* Seller Interest Management List */}
                                        {isOwner && product && (
                                            <InterestManagementList
                                                interests={detailedInterests}
                                                product={product}
                                                isLoading={isInterestsLoading}
                                                onInterestRemoved={() => {
                                                    refetchInterests();
                                                }}
                                            />
                                        )}

                                    </div>

                                    {/* Right Side - Image and Details (Takes 8 cols) */}
                                    <div className="lg:col-span-8 space-y-8">
                                        {/* Hero Image Section */}
                                        <div className="relative aspect-video group">
                                            <div className="w-full h-full overflow-hidden rounded-[2rem] border border-gray-100 flex items-center justify-center bg-white">
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            (e.target as HTMLImageElement).parentElement?.classList.add('bg-gray-100');
                                                            const placeholder = document.createElement('div');
                                                            placeholder.className = 'text-gray-300 font-bold text-lg';
                                                            placeholder.innerText = 'התמונה לא זמינה';
                                                            (e.target as HTMLImageElement).parentElement?.appendChild(placeholder);
                                                        }}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                                        <span className="text-gray-300 font-bold text-lg">אין תמונה למוצר</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute bottom-0 left-0 bg-[#f9fafb] pt-2 pr-2 rounded-tr-[1.5rem]">
                                                <div className={`px-5 py-2 rounded-xl text-lg font-bold text-white shadow-sm cursor-pointer transition-all hover:brightness-110 active:scale-95 ${isInterested && !isOwner ? getTagColor('הבעתי עניין') : getTagColor(product.status)}`}>
                                                    {isInterested && !isOwner ? 'הבעתי עניין' : product.status}
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
                                                    <div className="flex justify-between border-b border-gray-50 pb-2">
                                                        <span className="text-gray-400 font-medium">כמות :</span>
                                                        <span className="text-gray-700 font-bold">{product.quantity || 1}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-gray-50 pb-2 md:col-span-2">
                                                        <span className="text-gray-400 font-medium">תיעוד רכישה :</span>
                                                        <span className="text-gray-700 font-bold">
                                                            {product.purchaseDocUrl ? (
                                                                <a 
                                                                    href={product.purchaseDocUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    className="text-[#418EAB] hover:text-[#316d82] hover:underline transition-all"
                                                                >
                                                                    {product.purchaseDocumentation || 'צפייה בקובץ'}
                                                                </a>
                                                            ) : (
                                                                product.purchaseDocumentation || 'לא צוין'
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Q&A Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <MessageCircleQuestion className="w-6 h-6 text-[#418EAB]" />
                                                <h2 className="text-xl font-black text-gray-900">שאלות ותשובות</h2>
                                                {isOwner && unansweredQA.length > 0 && (
                                                    <span className="bg-[#F39200] text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                                                        {unansweredQA.length} שאלות ממתינות
                                                    </span>
                                                )}
                                            </div>

                                            {qaLoading ? (
                                                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex items-center justify-center">
                                                    <div className="w-6 h-6 border-2 border-[#418EAB]/30 border-t-[#418EAB] rounded-full animate-spin" />
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {/* Owner: show unanswered questions first */}
                                                    {isOwner && unansweredQA.length > 0 && (
                                                        <div className="space-y-3">
                                                            <h3 className="text-sm font-bold text-[#F39200] flex items-center gap-2">
                                                                <Clock className="w-4 h-4" />
                                                                שאלות ממתינות לתשובה
                                                            </h3>
                                                            {unansweredQA.map((qa) => (
                                                                <motion.div
                                                                    key={qa.id}
                                                                    initial={{ opacity: 0, y: 8 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="bg-[#FFF8ED] rounded-2xl p-5 shadow-sm border-2 border-[#F39200]/20"
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-[#F39200]/10 text-[#F39200] flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                                                                            {qa.askerName?.charAt(0) || '?'}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2 mb-1 justify-between">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="font-bold text-gray-800 text-sm">{qa.askerName || 'משתמש'}</span>
                                                                                    {qa.date && <span className="text-xs text-gray-400">{qa.date}</span>}
                                                                                </div>
                                                                                {isOwner && (
                                                                                    <button
                                                                                        onClick={() => handleDeleteQuestion(qa.id)}
                                                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                                                        title="מחק שאלה"
                                                                                        disabled={deletingId === qa.id}
                                                                                    >
                                                                                        {deletingId === qa.id ? (
                                                                                            <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
                                                                                        ) : (
                                                                                            <Trash2 className="w-4 h-4" />
                                                                                        )}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-gray-700 font-medium mb-3">{qa.question}</p>
                                                                            <div className="flex gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    value={answerTexts[qa.id] || ''}
                                                                                    onChange={(e) => setAnswerTexts(prev => ({ ...prev, [qa.id]: e.target.value }))}
                                                                                    placeholder="כתוב תשובה..."
                                                                                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#418EAB] focus:ring-2 focus:ring-[#418EAB]/20 transition-all"
                                                                                    dir="rtl"
                                                                                />
                                                                                <button
                                                                                    onClick={() => handleAnswerQuestion(qa.id)}
                                                                                    disabled={!answerTexts[qa.id]?.trim() || answeringId === qa.id}
                                                                                    className="bg-[#418EAB] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#316d82] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
                                                                                >
                                                                                    {answeringId === qa.id ? (
                                                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                                    ) : (
                                                                                        <Send className="w-4 h-4" />
                                                                                    )}
                                                                                    פרסם
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Published Q&A (visible to all) */}
                                                    {publishedQA.length > 0 && (
                                                        <div className="space-y-3">
                                                            {isOwner && unansweredQA.length > 0 && (
                                                                <h3 className="text-sm font-bold text-[#8DC63F] flex items-center gap-2 mt-4">
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                    שאלות שנענו
                                                                </h3>
                                                            )}
                                                            {publishedQA.map((qa) => (
                                                                <motion.div
                                                                    key={qa.id}
                                                                    initial={{ opacity: 0, y: 8 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                                                                >
                                                                    <button
                                                                        onClick={() => toggleQAExpand(qa.id)}
                                                                        className="w-full flex items-center justify-between p-5 text-right hover:bg-gray-50/50 transition-colors"
                                                                    >
                                                                        <div className="flex items-start gap-3 flex-1">
                                                                            <div className="w-8 h-8 rounded-full bg-[#418EAB]/10 text-[#418EAB] flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                                                                                ש
                                                                            </div>
                                                                            <span className="font-bold text-gray-800 text-right">{qa.question}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            {isOwner && (
                                                                                <span
                                                                                    role="button"
                                                                                    tabIndex={0}
                                                                                    onClick={e => {
                                                                                        e.stopPropagation();
                                                                                        if (!deletingId) handleDeleteQuestion(qa.id);
                                                                                    }}
                                                                                    className={`text-gray-400 hover:text-red-500 transition-colors p-2 inline-flex items-center justify-center ${deletingId === qa.id ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
                                                                                    title="מחק שאלה"
                                                                                    aria-disabled={deletingId === qa.id}
                                                                                >
                                                                                    {deletingId === qa.id ? (
                                                                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
                                                                                    ) : (
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    )}
                                                                                </span>
                                                                            )}
                                                                            {expandedQA.has(qa.id) ? (
                                                                                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                                            ) : (
                                                                                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                    <AnimatePresence>
                                                                        {expandedQA.has(qa.id) && (
                                                                            <motion.div
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                transition={{ duration: 0.25 }}
                                                                                className="overflow-hidden"
                                                                            >
                                                                                <div className="px-5 pb-5 pr-16">
                                                                                    <div className="flex items-start gap-3">
                                                                                        <div className="w-8 h-8 rounded-full bg-[#8DC63F]/10 text-[#8DC63F] flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                                                            ת
                                                                                        </div>
                                                                                        <p className="text-gray-600 leading-relaxed pt-1">{qa.answer}</p>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 mt-2 mr-11">
                                                                                        {qa.askerName && <span className="text-xs text-gray-400">נשאל ע"י {qa.askerName}</span>}
                                                                                        {qa.date && <span className="text-xs text-gray-300">•</span>}
                                                                                        {qa.date && <span className="text-xs text-gray-400">{qa.date}</span>}
                                                                                    </div>
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Empty state */}
                                                    {publishedQA.length === 0 && (!isOwner || unansweredQA.length === 0) && (
                                                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
                                                            <MessageCircleQuestion className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                                            <p className="text-gray-400 font-medium">אין שאלות עדיין</p>
                                                            <p className="text-gray-300 text-sm mt-1">היה הראשון לשאול שאלה על המוצר הזה</p>
                                                        </div>
                                                    )}

                                                    {/* Ask question form (visible to logged-in non-owners) */}
                                                    {user && !isOwner && (
                                                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mt-4">
                                                            <h3 className="font-bold text-gray-800 mb-3 text-sm">יש לך שאלה?</h3>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={newQuestion}
                                                                    onChange={(e) => setNewQuestion(e.target.value)}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAskQuestion(); } }}
                                                                    placeholder="כתוב את שאלתך כאן..."
                                                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#418EAB] focus:ring-2 focus:ring-[#418EAB]/20 transition-all"
                                                                    dir="rtl"
                                                                    disabled={askingLoading}
                                                                />
                                                                <button
                                                                    onClick={handleAskQuestion}
                                                                    disabled={!newQuestion.trim() || askingLoading}
                                                                    className="bg-[#F39200] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#d98300] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0 shadow-[0_4px_12px_rgba(243,146,0,0.3)]"
                                                                >
                                                                    {askingLoading ? (
                                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                    ) : (
                                                                        <Send className="w-4 h-4" />
                                                                    )}
                                                                    שלח שאלה
                                                                </button>
                                                            </div>
                                                            <AnimatePresence>
                                                                {askSuccess && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: -5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: -5 }}
                                                                        className="mt-3 text-sm text-[#8DC63F] font-bold flex items-center gap-1"
                                                                    >
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                        השאלה נשלחה בהצלחה! המוכר יענה בהקדם.
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    )}

                                                    {/* Prompt to login to ask */}
                                                    {!user && (
                                                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center mt-4">
                                                            <p className="text-gray-500 text-sm">
                                                                <button onClick={onLoginClick} className="text-[#418EAB] font-bold hover:underline">התחבר</button>
                                                                {' '}כדי לשאול שאלה על המוצר
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
                        productName={product?.name || ''}
                        maxQuantity={product?.quantity}
                        onSubmit={async (data) => {
                            if (product && user && user.id) {
                                await submitInterest(user, product.id, data);
                                // Optimistically set myInterestRecord for instant UI feedback (only required fields)
                                setMyInterestRecord({
                                    id: 'optimistic',
                                    userId: user.id,
                                    userName: user.firstName + (user.lastName ? ' ' + user.lastName : ''),
                                    phone: user.phone || '',
                                    status: '',
                                    quantity: data.quantity,
                                });
                                refetchInterests();
                                if (user.interestList && !user.interestList.includes(product.id)) {
                                    user.interestList.push(product.id);
                                } else if (!user.interestList) {
                                    user.interestList = [product.id];
                                }
                                onInterestChange?.(product.id, true, user.id);
                            } else {
                                alert('יש להתחבר כדי להגיש התעניינות');
                            }
                        }}
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
