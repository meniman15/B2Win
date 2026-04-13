export interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    location: string;
    imageUrl: string;
    seller: string;
    status: string;
    description: string;
    manufacturer?: string;
    model?: string;
    purchaseDocumentation?: string;
    memberSince?: string;
    faq?: { question: string; answer?: string }[];
}

export interface Category {
    id: string;
    name: string;
    icon: string;
}

export const mockCategories: Category[] = [
    { id: '1', name: 'מחשבים', icon: 'Laptop' },
    { id: '2', name: 'תשתית מחשוב', icon: 'Network' },
    { id: '3', name: 'ריהוט משרדי', icon: 'Table' },
    { id: '4', name: 'סלולר', icon: 'Smartphone' },
    { id: '5', name: 'תקשורת', icon: 'Phone' },
    { id: '6', name: 'חשמל ותאורה', icon: 'Zap' },
    { id: '7', name: 'כלי עבודה', icon: 'Wrench' },
    { id: '8', name: 'ציוד היקפי', icon: 'Mouse' },
];

export const mockProducts: Product[] = [
    {
        id: '69a4422397f56fc760066760',
        name: 'מחשב נייד',
        category: '1',
        price: 2000,
        location: 'גלילות',
        imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
        seller: 'רותם אפללו',
        status: 'זמין',
        description: 'למחשב סטטוס במצב טוב, כולל מטען מקורי וקופסה. בשימוש מועט מאוד, נשמר היטב. מתאים למי שמחפש מחשב חזק ואמין למשרד או ללימודים.',
        manufacturer: 'סמסונג',
        model: 'Galaxy Book F2',
        purchaseDocumentation: 'קיים',
        memberSince: '2023',
        faq: [{ question: 'מה מצב הסוללה של המוצר ?', answer: 'הסוללה במצב מצוין, מחזיקה כ-8 שעות עבודה רציפה.' }]
    },
    {
        id: 'p2',
        name: 'מסך Dell',
        category: '1',
        price: 500,
        location: 'גלילות',
        imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
        seller: 'אלכס פרידמן',
        status: 'במשא ומתן',
        description: 'מסך איכותי לעבודה משרדית, רזולוציית Full HD, חיבורי HDMI ו-DisplayPort.',
        manufacturer: 'Dell',
        model: 'U2419H',
        purchaseDocumentation: 'קיים',
        memberSince: '2022',
    },
    {
        id: 'p3',
        name: 'עכבר Logitech',
        category: '8',
        price: 300,
        location: 'תל אביב',
        imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
        seller: 'נועה לוי',
        status: 'אני מעוניין',
        description: 'עכבר ארגונומי מעולה למעצבים ומתכנתים. אפשרות לחיבור ל-3 מכשירים במקביל.',
        manufacturer: 'Logitech',
        model: 'MX Master 3',
        purchaseDocumentation: 'לא קיים',
        memberSince: '2024',
    },
    {
        id: 'p4',
        name: 'כיסא משרדי',
        category: '3',
        price: 800,
        location: 'ירושלים',
        imageUrl: 'https://goodest.co.il/wp-content/webp-express/webp-images/uploads/2024/08/1.jpg.webp',
        seller: 'יובל כהן',
        status: 'זמין',
        description: 'כיסא נוח מאוד לישיבה ממושכת, תמיכה גבית מלאה, אפשרות כיוונון גובה ומשענות.',
        manufacturer: 'Dr. Gab',
        model: 'Comfort Pro',
        purchaseDocumentation: 'קיים',
        memberSince: '2021',
    },
];
