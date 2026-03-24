import { useEffect, useState } from 'react';
import Header from './components/Header';
import CategoryNav from './components/CategoryNav';
import { API_URL } from './config';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import AuthModal from './components/AuthModal';
import PersonalPage from './components/personal/PersonalPage';
import { useAuth } from './hooks/useAuth';
import './index.css';

import type { Product, Category } from './types';

function App() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<'home' | 'profile'>('home');
  const [profileTab, setProfileTab] = useState<'profile' | 'interested' | 'posted' | 'queue'>('profile');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastInterestChange, setLastInterestChange] = useState<{ productId: string; isInterested: boolean } | null>(null);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  useEffect(() => {
    // Fetch categories
    fetch(`${API_URL}/api/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Error fetching categories:', err));
  }, []);

  const handleInterestChange = (productId: string, isInterested: boolean, userId: string) => {
    setProducts(prevProducts => prevProducts.map(p => {
      if (p.id === productId) {
        const currentIds = p.interestedUserIds || [];
        const updatedIds = isInterested
          ? [...currentIds.filter(id => id !== userId), userId]
          : currentIds.filter(id => id !== userId);
        return { ...p, interestedUserIds: updatedIds };
      }
      return p;
    }));
    setLastInterestChange({ productId, isInterested });
  };

  useEffect(() => {
    setLoading(true);
    let url = `${API_URL}/api/products?`;
    if (selectedCategory) url += `category=${selectedCategory}&`;
    if (searchQuery) url += `q=${encodeURIComponent(searchQuery)}&`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        // Only show transition if the results have actually changed
        const resultsChanged = JSON.stringify(data) !== JSON.stringify(products);

        if (resultsChanged) {
          setIsTransitioning(true);
          // Briefly fade out old results before showing new ones
          setTimeout(() => {
            setProducts(data);
            setIsTransitioning(false);
            setLoading(false);
          }, 100);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setLoading(false);
      });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      <Header
        onSearch={(q) => {
          setSearchQuery(q);
          if (currentPage !== 'home') setCurrentPage('home');
        }}
        onLoginClick={() => setIsAuthModalOpen(true)}
        onProfileClick={(tab) => {
          if (!user) {
            setIsAuthModalOpen(true);
          } else {
            if (tab) setProfileTab(tab as any);
            setCurrentPage('profile');
          }
        }}
        onHomeClick={() => {
          setCurrentPage('home');
          setSelectedCategory(null);
          setSearchQuery('');
        }}
      />

      <main className={`flex-grow transition-all duration-300 ${isModalOpen || isAuthModalOpen ? 'blur-md pointer-events-none' : ''}`}>
        {currentPage === 'profile' && user ? (
          <PersonalPage user={user} initialTab={profileTab} onProductClick={handleProductClick} lastInterestChange={lastInterestChange} />
        ) : (
          <>
            <CategoryNav
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Filters Row */}
        <div className="container mx-auto px-4 mb-4 flex items-center justify-center gap-3">
          <button className="flex items-center gap-2 px-5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium border border-gray-300">
            <span className="text-xs text-[#00AEEF]">★</span>
            כל הסינונים
          </button>
          <button className="flex items-center gap-2 px-5 py-1.5 bg-white hover:bg-gray-50 rounded-full text-sm border border-gray-300">
            סוג עסקה ▾
          </button>
          <button className="flex items-center gap-2 px-5 py-1.5 bg-white hover:bg-gray-50 rounded-full text-sm border border-gray-300">
            מחיר ▾
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-gray-50 rounded-full text-sm border border-gray-300">
            מצב המוצר ▾
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-gray-50 rounded-full text-sm border border-gray-300">
            יצרן ▾
          </button>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="flex items-baseline gap-4 mb-10 pb-2 border-b border-gray-100">
            <h2 className="text-4xl font-black text-[#F39200]">
              {selectedCategory
                ? categories.find(c => c.id === selectedCategory)?.name
                : searchQuery
                  ? 'תוצאות חיפוש'
                  : 'כל המודעות'}
            </h2>
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold text-gray-500">
                ({products.length} תוצאות)
              </div>
              {loading && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#1C4E80]"></div>
              )}
            </div>
          </div>

          <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-30 translate-y-2' : 'opacity-100 translate-y-0'}`}>
            {products.length === 0 && !loading ? (
              <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-lg font-medium">לא נמצאו מוצרים תואמים לחיפוש שלך</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                  className="mt-4 text-[#00AEEF] font-bold hover:underline"
                >
                  נקה הכל
                </button>
              </div>
            ) : selectedCategory || searchQuery ? (
              /* Filtered Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} onClick={handleProductClick} />
                ))}
              </div>
            ) : (
              /* Grouped Home Page View */
              <div className="space-y-16">
                {categories.length > 0 && categories.some(category => products.some(p => p.category === category.id)) ? (
                  categories.map(category => {
                    const categoryProducts = products.filter(p => p.category === category.id).slice(0, 4);
                    if (categoryProducts.length === 0) return null;

                    return (
                      <section key={category.id} className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-black text-[#F39200]">{category.name}</h3>
                          <button
                            onClick={() => setSelectedCategory(category.id)}
                            className="text-[#F39200] font-bold text-sm flex items-center gap-1 hover:underline"
                          >
                            צפה בהכל ←
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          {categoryProducts.map(product => (
                            <ProductCard key={product.id} product={product} onClick={handleProductClick} />
                          ))}
                        </div>
                      </section>
                    );
                  })
                ) : (
                  /* Fallback when categories don't match or are empty */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map(product => (
                      <ProductCard key={product.id} product={product} onClick={handleProductClick} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </main>

      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoginClick={() => setIsAuthModalOpen(true)}
        onInterestChange={handleInterestChange}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} B2Win - פלטפורמת מסחר פנים ארגונית
        </div>
      </footer>
    </div>
  );
}

export default App;
