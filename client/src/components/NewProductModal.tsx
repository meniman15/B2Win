import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Package, AlertCircle } from 'lucide-react';
import { API_URL } from '../config';
import { useAuth } from '../hooks/useAuth';

interface Category {
    id: string;
    name: string;
}

interface NewProductModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NewProductModal({ isOpen, onClose }: NewProductModalProps) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubCategory, setSelectedSubCategory] = useState('');
    const [locations, setLocations] = useState<{ id: string, text: string }[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('מסירה');
    const [condition, setCondition] = useState('חדש באריזה');
    const [price, setPrice] = useState<number | string>('');
    const [quantity, setQuantity] = useState<number | string>(1);
    const [location, setLocation] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [purchaseDocImage, setPurchaseDocImage] = useState<string | null>(null);
    const [selectedPurchaseDocFile, setSelectedPurchaseDocFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            fetch(`${API_URL}/api/categories`)
                .then(res => res.json())
                .then(data => setCategories(data.filter((c: any) => c.id !== 'all')))
                .catch(err => console.error('Error fetching categories:', err));

            fetch(`${API_URL}/api/locations`)
                .then(res => res.json())
                .then(data => setLocations(data))
                .catch(err => console.error('Error fetching locations:', err));
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedCategory) {
            fetch(`${API_URL}/api/categories/${selectedCategory}/subcategories`)
                .then(res => res.json())
                .then(data => {
                    setSubCategories(data);
                    setSelectedSubCategory('');
                })
                .catch(err => console.error('Error fetching sub-categories:', err));
        } else {
            setSubCategories([]);
            setSelectedSubCategory('');
        }
    }, [selectedCategory]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePurchaseDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedPurchaseDocFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPurchaseDocImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name) newErrors.name = 'שם פריט הוא חובה';
        if (!description) newErrors.description = 'תיאור הוא חובה';
        if (!selectedCategory) newErrors.category = 'קטגוריה היא חובה';
        if (subCategories.length > 0 && !selectedSubCategory) newErrors.subCategory = 'תת קטגוריה היא חובה';
        if (!type) newErrors.type = 'סוג הוא חובה';
        if (!condition) newErrors.condition = 'מצב הפריט הוא חובה';
        if (type === 'מכירה' && (!price || Number(price) <= 0)) newErrors.price = 'מחיר הוא חובה למכירה';
        if (!quantity || Number(quantity) < 1) newErrors.quantity = 'כמות היא חובה';
        if (!location.trim()) newErrors.location = 'מיקום הוא חובה';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        try {
            let imageToSubmit = image;

            // If we have a file, upload it to Origami first via our proxy
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);

                const uploadResponse = await fetch(`${API_URL}/api/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResponse.ok) {
                    let errorMessage = 'אירעה שגיאה בהעלאת התמונה לאוריגמי.';
                    try {
                        const errorData = await uploadResponse.json();
                        if (errorData.error) {
                            errorMessage = `העלאת תמונה נכשלה: ${errorData.error}`;
                        }
                    } catch (e) {}
                    throw new Error(errorMessage);
                }

                const uploadData = await uploadResponse.json();
                imageToSubmit = uploadData;
            }

            let purchaseDocToSubmit = null;
            if (selectedPurchaseDocFile) {
                const formData = new FormData();
                formData.append('file', selectedPurchaseDocFile);

                const uploadResponse = await fetch(`${API_URL}/api/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResponse.ok) {
                    let errorMessage = 'אירעה שגיאה בהעלאת תיעוד הרכש לאוריגמי.';
                    try {
                        const errorData = await uploadResponse.json();
                        if (errorData.error) {
                            errorMessage = `העלאת תיעוד רכש נכשלה: ${errorData.error}`;
                        }
                    } catch (e) {}
                    throw new Error(errorMessage);
                }

                purchaseDocToSubmit = await uploadResponse.json();
            }

            const response = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productData: {
                        name,
                        description,
                        categoryId: selectedCategory,
                        subCategoryId: selectedSubCategory,
                        type,
                        condition,
                        price: type === 'מסירה' ? 0 : Number(price),
                        quantity: Number(quantity),
                        location,
                        image: imageToSubmit,
                        purchaseDoc: purchaseDocToSubmit
                    },
                    userData: user
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'אירעה שגיאה ביצירת הפריט.');
            }

            onClose();
            // Reset form
            setName('');
            setDescription('');
            setSelectedCategory('');
            setSelectedSubCategory('');
            setPrice('');
            setQuantity(1);
            setLocation('');
            setImage(null);
            setSelectedFile(null);
            setPurchaseDocImage(null);
            setSelectedPurchaseDocFile(null);
        } catch (error: any) {
            console.error('Error creating product:', error);
            // Show the formatted message directly from the error
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        dir="rtl"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <h2 className="text-3xl font-black text-gray-900">הוספת פריט חדש</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                                <X className="w-8 h-8 text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="space-y-2 col-span-2">
                                    <label className="block text-lg font-bold text-gray-700">שם הפריט *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="למשל: מחשב נייד DELL"
                                        className={`w-full h-14 px-6 rounded-2xl border-2 ${errors.name ? 'border-red-500' : 'border-gray-100'} focus:border-[#F39200] focus:outline-none text-lg font-medium transition-all`}
                                    />
                                    {errors.name && <span className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.name}</span>}
                                </div>

                                {/* Category */}
                                <div className="space-y-2">
                                    <label className="block text-lg font-bold text-gray-700">קטגוריה *</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className={`w-full h-14 px-6 rounded-2xl border-2 ${errors.category ? 'border-red-500' : 'border-gray-100'} focus:border-[#F39200] focus:outline-none text-lg font-medium transition-all appearance-none bg-no-repeat bg-[left_1.5rem_top_50%]`}
                                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23gray\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")' }}
                                    >
                                        <option value="">בחירת קטגוריה</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    {errors.category && <span className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.category}</span>}
                                </div>

                                {/* Sub-category */}
                                <div className="space-y-2">
                                    <label className="block text-lg font-bold text-gray-700">תת קטגוריה</label>
                                    <select
                                        value={selectedSubCategory}
                                        onChange={(e) => setSelectedSubCategory(e.target.value)}
                                        disabled={!selectedCategory || subCategories.length === 0}
                                        className={`w-full h-14 px-6 rounded-2xl border-2 ${errors.subCategory ? 'border-red-500' : 'border-gray-100'} ${!selectedCategory || subCategories.length === 0 ? 'bg-gray-50 opacity-50 cursor-not-allowed' : 'bg-white'} focus:border-[#F39200] focus:outline-none text-lg font-medium transition-all appearance-none bg-no-repeat bg-[left_1.5rem_top_50%]`}
                                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23gray\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")' }}
                                    >
                                        <option value="">{subCategories.length === 0 ? 'אין תת קטגוריות' : 'בחירת תת קטגוריה'}</option>
                                        {subCategories.map(sc => (
                                            <option key={sc.id} value={sc.id}>{sc.name}</option>
                                        ))}
                                    </select>
                                    {errors.subCategory && <span className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.subCategory}</span>}
                                </div>

                                {/* Type */}
                                <div className="space-y-2">
                                    <label className="block text-lg font-bold text-gray-700">סוג *</label>
                                    <div className="flex gap-4">
                                        {['מסירה', 'מכירה'].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setType(t)}
                                                className={`flex-1 h-14 rounded-2xl border-2 font-bold text-lg transition-all ${type === t ? 'border-[#F39200] bg-orange-50 text-[#F39200]' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="space-y-2">
                                    <label className="block text-lg font-bold text-gray-700">מחיר {type === 'מכירה' ? '*' : ''}</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={type === 'מסירה' ? 0 : price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            disabled={type === 'מסירה'}
                                            placeholder="מחיר בש״ח"
                                            className={`w-full h-14 px-6 rounded-2xl border-2 ${errors.price ? 'border-red-500' : 'border-gray-100'} ${type === 'מסירה' ? 'bg-gray-50 opacity-100 cursor-not-allowed text-gray-400' : 'bg-white text-gray-800'} focus:border-[#F39200] focus:outline-none text-lg font-bold transition-all pr-12`}
                                        />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₪</span>
                                    </div>
                                    {errors.price && <span className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.price}</span>}
                                </div>

                                {/* Quantity */}
                                <div className="space-y-2">
                                    <label className="block text-lg font-bold text-gray-700">כמות במלאי *</label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        min="1"
                                        placeholder="כמות"
                                        className={`w-full h-14 px-6 rounded-2xl border-2 ${errors.quantity ? 'border-red-500' : 'border-gray-100'} focus:border-[#F39200] focus:outline-none text-lg font-bold transition-all`}
                                    />
                                    {errors.quantity && <span className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.quantity}</span>}
                                </div>

                                {/* Location */}
                                <div className="space-y-2 col-span-2">
                                    <label className="block text-lg font-bold text-gray-700">מיקום המוצר *</label>
                                    <select
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className={`w-full h-14 px-6 rounded-2xl border-2 ${errors.location ? 'border-red-500' : 'border-gray-100'} focus:border-[#F39200] focus:outline-none text-lg font-medium transition-all appearance-none bg-no-repeat bg-[left_1.5rem_top_50%]`}
                                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23gray\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")' }}
                                    >
                                        <option value="">בחירת מיקום</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.text}</option>
                                        ))}
                                    </select>
                                    {errors.location && <span className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.location}</span>}
                                </div>

                                {/* Condition */}
                                <div className="space-y-4 col-span-2">
                                    <label className="block text-lg font-bold text-gray-700">מצב הפריט *</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {['חדש באריזה', 'חדש מחוץ לקופסה', 'שימוש קל', 'שימוש מלא'].map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setCondition(c)}
                                                className={`h-14 rounded-xl border-2 font-bold text-sm transition-all px-2 ${condition === c ? 'border-[#F39200] bg-orange-50 text-[#F39200]' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2 col-span-2">
                                    <label className="block text-lg font-bold text-gray-700">תיאור הפריט *</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="ספר לנו קצת על הפריט..."
                                        className={`w-full h-32 p-6 rounded-3xl border-2 ${errors.description ? 'border-red-500' : 'border-gray-100'} focus:border-[#F39200] focus:outline-none text-lg font-medium transition-all resize-none`}
                                    ></textarea>
                                    {errors.description && <span className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.description}</span>}
                                </div>

                                {/* Image Upload */}
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <label className="block text-lg font-bold text-gray-700">תמונת הפריט</label>
                                    <div className="flex flex-col gap-2">
                                        <div className="relative w-full h-32 rounded-3xl border-2 border-dashed border-gray-200 transition-all flex items-center justify-center overflow-hidden bg-gray-50 group">
                                            {image ? (
                                                <div className="relative w-full h-full">
                                                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setImage(null);
                                                            setSelectedFile(null);
                                                        }}
                                                        className="absolute top-2 left-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 z-10 scale-90 hover:scale-100"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                                                    <Upload className="w-8 h-8 text-gray-300" />
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                                </label>
                                            )}
                                        </div>
                                        <p className="text-gray-500 text-xs">העלה תמונה ברורה של הפריט שמשתמשים אחרים יוכלו להתרשם ממנה</p>
                                    </div>
                                </div>

                                {/* Purchase Doc Upload */}
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <label className="block text-lg font-bold text-gray-700 mx-1">תיעוד רכש (אופציונלי)</label>
                                    <div className="flex flex-col gap-2">
                                        <div className="relative w-full h-32 rounded-3xl border-2 border-dashed border-gray-200 transition-all flex items-center justify-center overflow-hidden bg-gray-50 group">
                                            {purchaseDocImage ? (
                                                <div className="relative w-full h-full">
                                                    <img src={purchaseDocImage} alt="Purchase Doc Preview" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setPurchaseDocImage(null);
                                                            setSelectedPurchaseDocFile(null);
                                                        }}
                                                        className="absolute top-2 left-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 z-10 scale-90 hover:scale-100"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                                                    <Upload className="w-8 h-8 text-gray-300" />
                                                    <input type="file" accept="image/*" className="hidden" onChange={handlePurchaseDocUpload} />
                                                </label>
                                            )}
                                        </div>
                                        <p className="text-gray-500 text-xs">העלה תמונה של קבלה או מסמך שמוכיח את רכישת הפריט המקורי</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-6 pt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 h-14 rounded-2xl border-2 border-gray-200 text-gray-500 font-black text-xl hover:bg-gray-50 transition-all"
                                >
                                    ביטול
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-[2] h-14 bg-[#F39200] text-white rounded-2xl font-black text-xl shadow-lg shadow-orange-100 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    {isLoading ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Package className="w-6 h-6" />
                                            שמירת פריט
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
