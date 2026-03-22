import { useEffect, useState } from 'react';
import type { Product } from '../../types';
import ProductCard from '../ProductCard';

interface InterestedProductsProps {
  user: any;
  onProductClick: (product: Product) => void;
}

export default function InterestedProducts({ user, onProductClick }: InterestedProductsProps) {
  const [desireProducts, setDesireProducts] = useState<Product[]>([]);
  const [lovedProducts, setLovedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLovedProducts = async () => {
    if (!user?.id) return;
    try {
      const lovedRes = await fetch('http://localhost:5001/api/products/loved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fld_3140: user.id, userId: user.id })
      });
      if (lovedRes.ok) {
        const lovedData = await lovedRes.json();
        setLovedProducts(lovedData);
      }
    } catch (err) {
      console.error('Failed to fetch loved products', err);
    }
  };

  useEffect(() => {
    // Skeleton API requests for demonstration purposes
    setLoading(true);
    
    const fetchInterestedProducts = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/products/interested', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
        if (!res.ok) throw new Error('Failed to fetch interested products');
        const data = await res.json();
        setDesireProducts(data);

        await fetchLovedProducts();
      } catch (err) {
        console.error('Failed to fetch interested products', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
        fetchInterestedProducts();
    }
  }, [user]);

  return (
    <div className="p-8" dir="rtl">
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C4E80]"></div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Products shown desire in */}
          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-6">מודעות שהגשת התעניינות</h2>
            {desireProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {desireProducts.map(product => (
                  <ProductCard key={product.id} product={product} onClick={onProductClick} onLikeToggle={fetchLovedProducts} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500">אין מודעות כרגע.</p>
            )}
          </section>

          {/* Products loved */}
          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-6">מודעות שאהבת</h2>
            {lovedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {lovedProducts.map(product => (
                  <ProductCard key={product.id} product={product} onClick={onProductClick} isLikedInit={true} onLikeToggle={fetchLovedProducts} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500">אין מודעות כרגע.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
