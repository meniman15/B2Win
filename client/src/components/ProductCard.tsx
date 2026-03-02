import { Heart } from 'lucide-react';
import { getTagColor } from '../utils/theme';

import type { Product } from '../types';

interface ProductCardProps {
    product: Product;
    onClick: (product: Product) => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
    const getTagText = (status: string) => {
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
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </div>

                {/* TODO: save like selection and present as liked */}
                <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:text-red-500 transition-colors border border-white/20"
                >
                    <Heart className="w-6 h-6 stroke-[2.5px]" />
                </button>

                {/* Availability Tag with white cutout effect */}
                <div className="absolute bottom-0 left-0 bg-[#f9fafb] pt-2 pr-2 rounded-tr-[1.5rem]">
                    <div className={`px-5 py-2 rounded-xl text-lg font-bold text-white shadow-sm cursor-pointer transition-all hover:brightness-110 active:scale-95 ${getTagColor(product.status)}`}>
                        {getTagText(product.status)}
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
