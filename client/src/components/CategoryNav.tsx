import * as Icons from 'lucide-react';

interface Category {
    id: string;
    name: string;
    icon: string;
}

interface CategoryNavProps {
    categories: Category[];
    selectedCategory: string | null;
    onSelectCategory: (id: string | null) => void;
}

export default function CategoryNav({ categories, selectedCategory, onSelectCategory }: CategoryNavProps) {
    return (
        <div className="bg-white py-12">
            <div className="container mx-auto px-4">
                <div className="flex flex-wrap md:flex-nowrap items-start justify-center gap-4 md:gap-8">
                    {/* Categories from Screenshot Analysis: 
              - Unselected: Border #418EAB, Icon #418EAB, Background White
              - Selected: Background #418EAB, Icon White, Shadow
          */}

                    {/* All Categories Button */}
                    <button
                        onClick={() => onSelectCategory(null)}
                        className="flex flex-col items-center gap-3 transition-all group"
                    >
                        <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center border transition-all ${!selectedCategory
                                ? 'bg-[#418EAB] border-[#418EAB] text-white shadow-[0_4px_12px_rgba(65,142,171,0.3)]'
                                : 'bg-white border-[#418EAB] text-[#418EAB] hover:shadow-md'
                            }`}>
                            <Icons.LayoutGrid strokeWidth={1.2} className="w-9 h-9" />
                        </div>
                        <span className={`text-[13px] font-medium whitespace-nowrap text-center leading-tight text-gray-700`}>
                            כל<br />הקטגוריות
                        </span>
                    </button>

                    {categories.map((cat) => {
                        const Icon = (Icons as any)[cat.icon] || Icons.HelpCircle;
                        const isSelected = selectedCategory === cat.id;

                        return (
                            <button
                                key={cat.id}
                                onClick={() => onSelectCategory(cat.id)}
                                className="flex flex-col items-center gap-3 transition-all group"
                            >
                                <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center border transition-all ${isSelected
                                        ? 'bg-[#418EAB] border-[#418EAB] text-white shadow-[0_4px_12px_rgba(65,142,171,0.3)]'
                                        : 'bg-white border-[#418EAB] text-[#418EAB] hover:shadow-md'
                                    }`}>
                                    <Icon strokeWidth={1.2} className="w-9 h-9" />
                                </div>
                                <span className={`text-[13px] font-medium whitespace-nowrap text-center leading-tight text-gray-700`}>
                                    {cat.name.split(' ').map((word, i) => (
                                        <span key={i}>{word}{i === 0 && cat.name.includes(' ') ? <br /> : ''}</span>
                                    ))}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
