export interface Product {
    id: string;
    name: string;
    category: string;
    categoryName?: string;
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
    origamiId?: string;
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
    status?: string;
    origamiId?: string;
    origamiFields?: Array<{
        field_id: string;
        field_name: string;
        default_value?: any;
    }>;
}
