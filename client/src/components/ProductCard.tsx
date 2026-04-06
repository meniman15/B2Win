import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { getTagColor } from '../utils/theme';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../config';

import type { Product } from '../types';

interface ProductCardProps {
    product: Product;
    onClick: (product: Product) => void;
    isLikedInit?: boolean;
    onLikeToggle?: (productId: string, isLiked: boolean) => void;
}

export default function ProductCard({ product, onClick, isLikedInit, onLikeToggle }: ProductCardProps) {
    const auth = useAuth() as any;
    const { user, updateUser } = auth;
    const isUserInterested = user && product.interestedUserIds?.includes(user.id || '');
    const isOwner = !!(user?.id && product?.sellerId && user.id === product.sellerId);
    
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        if (isLikedInit !== undefined) {
            setIsLiked(isLikedInit);
        } else if (user && (user as any).likedList?.includes(product.id)) {
            setIsLiked(true);
        }
    }, [isLikedInit, user, product.id]);

    const getTagText = (status: string) => {
        if (isUserInterested && !isOwner) return 'הבעתי עניין';
        return status;
    };

    return (
        <div
            onClick={() => onClick(product)}
            className="flex flex-col group cursor-pointer relative bg-[#f9fafb]"
            dir="rtl"
        >
            {/* Image Container */}
            <div className="relative aspect-square mb-2">
                <div className="w-full h-full overflow-hidden rounded-[2rem] border border-gray-100">
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement?.classList.add('bg-gray-100', 'flex', 'items-center', 'justify-center');
                                const placeholder = document.createElement('div');
                                placeholder.className = 'text-gray-400 font-bold text-sm';
                                placeholder.innerText = 'אין תמונה';
                                (e.target as HTMLImageElement).parentElement?.appendChild(placeholder);
                            }}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 font-bold text-sm">אין תמונה</span>
                        </div>
                    )}
                </div>

                {/* TODO: save like selection and present as liked */}
                <button
                    onClick={async (e) => { 
                        e.stopPropagation(); 
                        if (!user) return;
                        const newState = !isLiked;
                        setIsLiked(newState);
                        try {
                            await fetch(`${API_URL}/api/products/like`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fld_3140: user.id, fld_3139: product.id, fld_3138: newState })
                            });
                            
                            if (user && (user as any).likedList && updateUser) {
                                let newLikedList = [...(user as any).likedList];
                                if (newState) {
                                    if (!newLikedList.includes(product.id)) {
                                        newLikedList.push(product.id);
                                    }
                                } else {
                                    newLikedList = newLikedList.filter((id: string) => id !== product.id);
                                }
                                updateUser({ likedList: newLikedList });
                            }

                            if (onLikeToggle) {
                                onLikeToggle(product.id, newState);
                            }
                        } catch (err) {
                            console.error('Failed to toggle like', err);
                            setIsLiked(!newState);
                        }
                    }}
                    className={`absolute top-4 left-4 backdrop-blur-md p-2 rounded-full transition-colors border border-white/20 ${isLiked ? 'bg-white/90 text-red-500' : 'bg-white/20 text-white hover:text-red-500'}`}
                >
                    <Heart className="w-6 h-6 stroke-[2.5px]" fill={isLiked ? 'currentColor' : 'none'} color={isLiked ? '#ef4444' : 'currentColor'} />
                </button>

                <div className="absolute bottom-0 left-0 bg-[#f9fafb] pt-2 pr-2 rounded-tr-[1.5rem]">
                    <div className={`px-5 py-2 rounded-xl text-lg font-bold text-white shadow-sm cursor-pointer transition-all hover:brightness-110 active:scale-95 ${isUserInterested ? getTagColor('הבעתי עניין') : getTagColor(product.status)}`}>
                        {isUserInterested ? getTagText('הבעתי עניין') : getTagText(product.status)}
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex justify-between items-start px-1 py-1">
                <div className="flex flex-col items-start text-right">
                    <div className="text-2xl font-black text-gray-900 leading-none">
                        {product.price.toLocaleString()}₪
                    </div>
                    <div className="text-base font-bold text-gray-800 mt-1">
                        {product.name}
                    </div>
                </div>
                <div className="text-[1.1rem] text-gray-400 font-bold mt-1">
                    {product.location}
                </div>
            </div>
        </div>
    );
}
