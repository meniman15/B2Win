import { useEffect, useState } from 'react';
import { API_URL } from '../../config';
import type { Product } from '../../types';
import ProductCard from '../ProductCard';

interface PostedProductsProps {
  user: any;
  onProductClick: (product: Product) => void;
}

export default function PostedProducts({ user, onProductClick }: PostedProductsProps) {
  const [postedProducts, setPostedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skeleton API request
    setLoading(true);
    
    const fetchPostedProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products/posted`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: user.id, userId: user.id })
        });
        
        if (!res.ok) throw new Error('Failed to fetch posted products');
        
        const data = await res.json();
        setPostedProducts(data);
      } catch (err) {
        console.error('Failed to fetch posted products', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchPostedProducts();
    }
  }, [user]);

  return (
    <div className="p-8" dir="rtl">
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C4E80]"></div>
        </div>
      ) : (
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-gray-900">מודעות שפרסמת</h2>
          </div>
          
          {postedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {postedProducts.map(product => (
                <ProductCard key={product.id} product={product} onClick={onProductClick} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm mt-8">
              <h3 className="text-xl font-bold text-gray-800 mb-2">אין לך מודעות מפורסמות עדיין</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                פרסם מוצר חדש ותוכל לעקוב אחריו כאן.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
