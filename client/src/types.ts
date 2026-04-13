export interface Product {
    id: string;
    name: string;
    category: string;
    categoryName?: string;
    price: number;
    location: string;
    imageUrl: string;
    seller: string;
    sellerId?: string;
    status: string;
    description: string;
    manufacturer?: string;
    model?: string;
    purchaseDocumentation?: string;
    memberSince?: string;
    faq?: { question: string; answer?: string }[];
    interestedUserIds?: string[];
    sellerPhone?: string;
    sellerEmail?: string;
    quantity?: number;
}

export interface QAItem {
    id: string;
    question: string;
    answer?: string;
    askerId?: string;
    askerName?: string;
    answererId?: string;
    productId: string;
    date?: string;
    isPublished: boolean;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
}

export interface User {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    organization: string;
    subOrganization?: string;
    isAdmin: boolean;
    status?: string;
    origamiFields?: Array<{
        field_id: string;
        field_name: string;
        default_value?: any;
    }>;
    interestList?: string[];
}

export interface InterestDetail {
    id: string;      // The interest record ID in Origami
    userId: string;  // The user ID of the interested person
    userName: string;
    phone: string;
    email?: string;
    quantity: number;
    subOrg?: string;
    organization?: string;
    status?: string;
    reporter?: string;
}
