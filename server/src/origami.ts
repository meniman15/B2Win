import dotenv from 'dotenv';
dotenv.config();

const ORIGAMI_ACCOUNT_NAME = process.env.ORIGAMI_ACCOUNT_NAME;
const ORIGAMI_USERNAME = process.env.ORIGAMI_USERNAME;
const ORIGAMI_SECRET = process.env.ORIGAMI_SECRET;

function formatOrigamiError(error: any) {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        const type = error.type || error.error || '';
        const message = error.message || error.error_message || '';
        if (type && message) return `${type}: ${message}`;
        if (type) return type;
        if (message) return message;
        return JSON.stringify(error);
    }
    return 'Unknown Origami Error';
}

export async function authenticateUser(fullName: string, phone: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    // Split full name into first and last name
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;

    console.log(url);

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "users",
        return_groups: "user_details",
        filter: [
            ["first_name", "=", firstName],
            ["last_name", "=", lastName],
            ["telephone", "=", phone]
        ]
    };
    console.log(body);
    try {
        console.log('Sending request to Origami:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        console.log('Origami Response Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Origami Auth Failed:', response.status, errorText);
            throw new Error(`Origami API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Origami Response Data:', JSON.stringify(data).substring(0, 200) + '...');
        // Origami results are in a 'data' array, each with 'instance_data'
        if (data && data.data && data.data.length > 0) {
            const instance = data.data[0].instance_data;
            const fieldGroups = instance.field_groups || [];

            // Find the user_details group
            const userDetailsGroup = fieldGroups.find((g: any) =>
                g.field_group_data?.group_data_name === 'user_details'
            );

            // fields_data is an array of arrays as per the provided JSON: [[{...}, {...}]]
            const fields = userDetailsGroup?.fields_data?.[0] || [];

            // Helper to extract field values by their data name
            const getDetailsFieldValue = (name: string) => {
                const field = fields.find((f: any) => f.field_data_name === name);
                return field?.value || field?.default_value || '';
            };

            // Map all fields for metadata
            const origamiFields = fields.map((f: any) => ({
                field_id: f.field_id,
                field_name: f.field_name,
                default_value: f.value || f.default_value || ''
            }));

            // Extract display values, handling object values for 'select-from-entity'
            const userFirstName = getDetailsFieldValue('first_name') || firstName;
            const userLastName = getDetailsFieldValue('last_name') || lastName;
            const email = getDetailsFieldValue('email');
            const telephone = getDetailsFieldValue('telephone') || phone;
            const orgValue = getDetailsFieldValue('organization');
            const subOrgValue = getDetailsFieldValue('subOrganization');

            // Fetch user's active interests
            const userId = instance._id;
            const interestList: string[] = [];
            try {
                const interestsUrl = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;
                const interestsBody = {
                    username: ORIGAMI_USERNAME,
                    api_secret: ORIGAMI_SECRET,
                    entity_data_name: "interests",
                    return_groups: ["transaction_details"],
                    type: 2,
                    with_archive: 0,
                    filter: [
                        ["fld_3089", "!=", "true"],
                        ["interested_details.interested_id", "=", userId]
                    ]
                };

                const interestsResponse = await fetch(interestsUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(interestsBody)
                });

                if (interestsResponse.ok) {
                    const interestsData = await interestsResponse.json();
                    const interestsItems = interestsData.data || [];
                    interestsItems.forEach((item: any) => {
                        const groups = item.instance_data.field_groups;
                        const transId = getFieldValue(groups, 'transaction_details', 'transaction_id')?.instance_id;
                        if (transId && !interestList.includes(transId)) {
                            interestList.push(transId);
                        }
                    });
                }
            } catch (err) {
                console.error('Error fetching user interests during auth:', err);
                // Non-blocking, continue with empty interest list
            }

            // Fetch user's active likes
            const likedList: string[] = [];
            try {
                const likedUrl = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;
                const likedBody = {
                    username: ORIGAMI_USERNAME,
                    api_secret: ORIGAMI_SECRET,
                    entity_data_name: "e_179",
                    return_groups: ["g_469"],
                    type: 2,
                    with_archive: 0,
                    filter: [
                        ["fld_3140.instance_id", "=", userId],
                        ["fld_3138", "=", "1"]
                    ]
                };

                const likedResponse = await fetch(likedUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(likedBody)
                });

                if (likedResponse.ok) {
                    const likedData = await likedResponse.json();
                    const likedItems = likedData.data || [];
                    likedItems.forEach((item: any) => {
                        const groups = item.instance_data.field_groups;
                        const transIdValue = getFieldValue(groups, 'g_469', 'fld_3139');
                        const transId = transIdValue?.instance_id || transIdValue;
                        if (transId && !likedList.includes(transId)) {
                            likedList.push(transId);
                        }
                    });
                }
            } catch (err) {
                console.error('Error fetching user likes during auth:', err);
                // Non-blocking, continue with empty liked list
            }

            return {
                id: instance._id,
                firstName: userFirstName,
                lastName: userLastName,
                email: email,
                phone: telephone,
                organization: typeof orgValue === 'object' ? orgValue.text : (orgValue || 'B2Win'),
                organizationId: typeof orgValue === 'object' ? orgValue.instance_id : null,
                subOrganization: typeof subOrgValue === 'object' ? subOrgValue.text : subOrgValue,
                subOrganizationId: typeof subOrgValue === 'object' ? subOrgValue.instance_id : null,
                status: getDetailsFieldValue('status') || 'Active',
                origamiFields: origamiFields,
                interestList: interestList,
                likedList: likedList
            };
        }

        return null;
    } catch (error) {
        console.error('Error authenticating with Origami:', error);
        throw error;
    }
}

export async function registerUser(userData: any) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/create_instance/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "users",
        form_data: [
            {
                group_data_name: "user_details",
                data: [
                    {
                        first_name: userData.firstName,
                        last_name: userData.lastName,
                        email: userData.email,
                        telephone: userData.phone,
                        organization: userData.organization,
                        subOrganization: userData.subOrganization
                    }
                ]
            }
        ]
    };

    try {
        console.log('Sending registration to Origami:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const errorMsg = data.error_message || data.error || 'Unknown error';
            if (response.status === 200) {
                const errorMessage = errorMsg.message ? `${errorMsg.type} - ${errorMsg.message}` : errorMsg.type;
                console.error('Origami Registration Failed:', errorMessage);
                throw new Error(`Origami API error: ${errorMessage}`);
            }
            else {
                console.error('Origami Registration Failed:', response.status, errorMsg, data);
                throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
            }
        }

        console.log('Origami Registration Success:', JSON.stringify(data));

        const instance = data.results._id;
        if (!instance) {
            throw new Error('Registration failed: No instance data returned from Origami');
        }

        // Return consistent user object
        return {
            id: instance,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            organization: userData.organization,
            subOrganization: userData.subOrganization,
            status: 'Active',
        };
    } catch (error) {
        console.error('Error registering with Origami:', error);
        throw error;
    }
}
export async function submitInterest(userData: any, transactionId: string, quantity: number) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/create_instance/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "interests",
        form_data: [
            {
                group_data_name: "interested_details",
                data: [
                    {
                        interested_id: userData.id,
                        interested_full_name: `${userData.firstName} ${userData.lastName}`,
                        interested_email: userData.email,
                        interested_telephone: userData.phone,
                        desired_quantity: quantity
                    }
                ]
            },
            {
                group_data_name: "transaction_details",
                data: [
                    {
                        transaction_id: transactionId
                    }
                ]
            }
        ]
    };

    try {
        console.log('Sending interest submission to Origami:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const errorMsg = formatOrigamiError(data.error_message || data.error || 'Unknown error');
            console.error('Origami Interest Submission Failed:', response.status, errorMsg, data);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        console.log('Origami Interest Submission Success:', JSON.stringify(data));
        return data.results || data;
    } catch (error) {
        console.error('Error submitting interest with Origami:', error);
        throw error;
    }
}

export async function cancelInterest(transactionId: string, userId: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/update_instance_fields/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "interests",
        return_groups: ["transaction_details"],
        filter: [
            [
                "transaction_id.instance_id",
                "=",
                transactionId
            ],
            [
                "interested_details.interested_id",
                "=",
                userId
            ]
        ],
        field: [
            [
                "fld_3089",
                "true"
            ]
        ]
    };

    try {
        console.log('Sending interest cancellation to Origami:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const errorMsg = data.error_message || data.error || 'Unknown error';
            if (response.status === 200) {
                const errorMessage = errorMsg.message ? `${errorMsg.type} - ${errorMsg.message}` : errorMsg.type;
                console.error('Origami Interest Cancellation Failed:', errorMessage);
                throw new Error(`Origami API error: ${errorMessage}`);
            } else {
                console.error('Origami Interest Cancellation Failed:', response.status, errorMsg, data);
                throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
            }
        }

        console.log('Origami Interest Cancellation Success:', JSON.stringify(data));
        return data.results || data;
    } catch (error) {
        console.error('Error cancelling interest with Origami:', error);
        throw error;
    }
}

export async function getProducts() {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "e_175",
        return_groups: ["g_451", "g_452", "g_453", "g_455", "g_456"],
        type: 2,
        limit: [0, 25],
        orderby: ["fld_product_sale_location", "desc"],
        with_archive: 0
    };

    try {
        console.log('Fetching products from Origami:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const errorMsg = data.error_message || data.error || 'Unknown error';
            console.error('Origami Fetch Products Failed:', response.status, errorMsg, data);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        let instances = data.data || [];

        // Filter by status: "חדש" or "במשא ומתן"
        instances = instances.filter((item: any) => {
            const groups = item.instance_data.field_groups;
            const statusValue = getFieldValue(groups, 'g_451', 'fld_3038');
            return statusValue === 'חדש' || statusValue === 'במשא ומתן';
        });

        // Map product IDs for efficient interest filtering
        const productIds = instances.map((inst: any) => inst.instance_data._id);

        const interestMap: { [key: string]: string[] } = {};

        if (productIds.length > 0) {
            // Fetch active interests for these specific products
            const interestsUrl = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;
            const interestsBody = {
                username: ORIGAMI_USERNAME,
                api_secret: ORIGAMI_SECRET,
                entity_data_name: "interests",
                return_groups: ["transaction_details", "interested_details"],
                type: 2,
                with_archive: 0,
                filter: [
                    ["fld_3089", "!=", "true"],
                    ["transaction_details.transaction_id.instance_id", "in", productIds]
                ]
            };

            const interestsResponse = await fetch(interestsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(interestsBody)
            });

            const interestsData = await interestsResponse.json();
            const interestsList = interestsData.data || [];

            interestsList.forEach((item: any) => {
                const groups = item.instance_data.field_groups;
                const transId = getFieldValue(groups, 'transaction_details', 'transaction_id')?.instance_id;
                const userIdVal = getFieldValue(groups, 'interested_details', 'interested_id');
                const userId = (userIdVal && typeof userIdVal === 'object') ? userIdVal.instance_id : userIdVal;

                if (transId && userId) {
                    if (!interestMap[transId]) interestMap[transId] = [];
                    if (!interestMap[transId].includes(userId)) {
                        interestMap[transId].push(userId);
                    }
                }
            });

            console.log('Interest Map populated:', JSON.stringify(interestMap, null, 2));
        }

        // Inject interests into instances for mapping
        instances.forEach((inst: any) => {
            const prodId = inst.instance_data._id;
            inst.interestedUserIds = interestMap[prodId] || [];
            if (inst.interestedUserIds.length > 0) {
                console.log(`Product ${prodId} has interests:`, inst.interestedUserIds);
            }
        });

        return instances;
    } catch (error) {
        console.error('Error fetching products from Origami:', error);
        throw error;
    }
}
function getFieldValue(groups: any[], groupDataName: string, fieldDataName: string) {
    const group = groups.find((g: any) => g.field_group_data.group_data_name === groupDataName);
    if (!group || !group.fields_data || group.fields_data.length === 0) return null;

    // Some groups are repeatable (FAQ), some are not.
    // For non-repeatable, we take the first row [0].
    const fields = group.fields_data[0];
    const field = fields.find((f: any) => f.field_data_name === fieldDataName);
    return field ? field.value : null;
}

function getRepeatableFieldValues(groups: any[], groupDataName: string, fieldMappings: { [key: string]: string }) {
    const group = groups.find((g: any) => g.field_group_data.group_data_name === groupDataName);
    if (!group || !group.fields_data || group.fields_data.length === 0) return [];

    return group.fields_data.map((row: any[]) => {
        const item: any = {};
        for (const [prop, fieldDataName] of Object.entries(fieldMappings)) {
            const field = row.find((f: any) => f.field_data_name === fieldDataName);
            item[prop] = field ? field.value : null;
        }
        return item;
    });
}

export function mapOrigamiProduct(raw: any) {
    const instance = raw.instance_data;
    const groups = instance.field_groups;
    const interestedUserIds = raw.interestedUserIds || [];

    const categoryObj = getFieldValue(groups, 'g_451', 'fld_3027');
    const subCategoryObj = getFieldValue(groups, 'g_451', 'fld_3028');
    const categoryId = categoryObj?.instance_id || 'all';
    const categoryName = categoryObj?.text || 'כללי';
    const subCategoryName = subCategoryObj?.text || '';

    const productName = getFieldValue(groups, 'g_451', 'fld_3142');
    const productAbout = getFieldValue(groups, 'g_451', 'fld_3143');

    const price = getFieldValue(groups, 'g_451', 'fld_3031');
    const condition = getFieldValue(groups, 'g_451', 'fld_3033');
    const status = getFieldValue(groups, 'g_451', 'fld_3038');
    const locationObj = getFieldValue(groups, 'g_451', 'fld_3099');

    const sellerName = getFieldValue(groups, 'g_452', 'fld_3034');
    const sellerPhone = getFieldValue(groups, 'g_452', 'fld_3035');
    const sellerEmail = getFieldValue(groups, 'g_452', 'fld_3036');
    const logisticsComment = getFieldValue(groups, 'g_455', 'fld_3057');
    const imageObj = getFieldValue(groups, 'g_456', 'fld_3030');

    const faqRaw = getRepeatableFieldValues(groups, 'g_453', {
        question: 'fld_3039',
        answer: 'fld_3040'
    });

    const faq = faqRaw
        .filter((f: any) => f.question)
        .map((f: any) => ({
            question: f.question,
            answer: f.answer || 'טרם התקבלה תשובה'
        }));

    // Fallback name logic: use fld_3142, otherwise "Category - Subcategory", otherwise Category
    const displayName = productName || (subCategoryName ? `${categoryName} - ${subCategoryName}` : categoryName);

    // Fallback description: use fld_3143, otherwise logistics comment, otherwise generic
    const displayDescription = productAbout || logisticsComment || 'אין תיאור זמין למוצר זה.';

    const result = {
        id: instance._id,
        name: displayName,
        category: categoryId,
        categoryName: categoryName,
        price: Number(price) || 0,
        location: locationObj?.text || 'לא צוין',
        imageUrl: imageObj?.location || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=1000',
        seller: String(sellerName || 'מוכר חסוי'),
        status: String(status || 'חדש'),
        description: displayDescription,
        manufacturer: subCategoryName || '-',
        model: '',
        purchaseDocumentation: imageObj?.file_name || '',
        interestedUserIds: interestedUserIds,
        memberSince: instance.insertTimestamp ? new Date(instance.insertTimestamp).getFullYear().toString() : '2024',
        faq: faq,
        sellerPhone: sellerPhone ? String(sellerPhone) : '',
        sellerEmail: sellerEmail ? String(sellerEmail) : '',
    };

    console.log('Mapped Product:', result.id, result.name, result.category, result.price);
    return result;
}

export async function getCategories() {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "e_172", // Categories entity
        type: 2,
        limit: [0, 50],
        with_archive: 0
    };

    try {
        console.log('Fetching categories from Origami:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const errorMsg = data.error_message || data.error || 'Unknown error';
            console.error('Origami Fetch Categories Failed:', response.status, errorMsg, data);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        return data.data || [];
    } catch (error) {
        console.error('Error fetching categories from Origami:', error);
        throw error;
    }
}

export async function getProductsBySeller(userId: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "e_175",
        return_groups: ["g_451", "g_452", "g_453", "g_455", "g_456"],
        filter: [
            ["fld_3130.instance_id", "=", userId]
        ]
    };

    try {
        console.log('Fetching posted products from Origami:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const errorMsg = data.error_message || data.error || 'Unknown error';
            console.error('Origami Fetch Posted Products Failed:', response.status, errorMsg, data);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        let instances = data.data || [];
        return instances;
    } catch (error) {
        console.error('Error fetching posted products from Origami:', error);
        throw error;
    }
}

export async function getInterestedProductsByUserId(userId: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    // 1. Fetch interests for the user
    const interestsUrl = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;
    const interestsBody = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "interests",
        return_groups: ["transaction_details"],
        type: 2,
        with_archive: 0,
        filter: [
            ["fld_3089", "!=", "true"],
            ["interested_details.interested_id", "=", userId]
        ]
    };

    try {
        console.log('Fetching user interests from Origami:', interestsUrl);
        const interestsResponse = await fetch(interestsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(interestsBody)
        });

        const interestsData = await interestsResponse.json();

        if (!interestsResponse.ok || interestsData.error) {
            console.error('Failed to fetch user interests:', interestsData);
            return [];
        }

        const interestsItems = interestsData.data || [];
        const productIds: string[] = [];

        interestsItems.forEach((item: any) => {
            const groups = item.instance_data.field_groups;
            const transIdObj = getFieldValue(groups, 'transaction_details', 'transaction_id');
            const transId = (transIdObj && typeof transIdObj === 'object') ? transIdObj.instance_id : transIdObj;
            if (transId && !productIds.includes(transId)) {
                productIds.push(transId);
            }
        });

        if (productIds.length === 0) {
            return [];
        }

        // 2. Fetch the corresponding products
        const productsUrl = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;
        const productsBody = {
            username: ORIGAMI_USERNAME,
            api_secret: ORIGAMI_SECRET,
            entity_data_name: "e_175",
            return_groups: ["g_451", "g_452", "g_453", "g_455", "g_456"],
            filter: [
                ["_id", "in", productIds]
            ]
        };

        const productsResponse = await fetch(productsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(productsBody)
        });

        const productsData = await productsResponse.json();

        // If _id filtering fails for some reason or returns error, fallback to empty to avoid crashing
        if (!productsResponse.ok || productsData.error) {
            console.error('Origami Fetch Interested Products Failed:', productsData);
            return [];
        }

        let instances = productsData.data || [];
        return instances;
    } catch (error) {
        console.error('Error fetching interested products from Origami:', error);
        throw error;
    }
}

export async function toggleProductLike(fld_3140: string, fld_3139: string, fld_3138: boolean) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const searchUrl = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;
    const searchBody = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "e_179",
        return_groups: ["g_469"],
        with_archive: 0,
        filter: [
            ["fld_3140.instance_id", "=", fld_3140],
            ["fld_3139.instance_id", "=", fld_3139]
        ]
    };

    try {
        const searchRes = await fetch(searchUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(searchBody) });
        const searchData = await searchRes.json();
        const existingInstances = searchData.data || [];

        if (existingInstances.length > 0) {
            const updateUrl = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/update_instance_fields/format/json`;
            const updatePromises = existingInstances.map((inst: any) => {
                const updateBody = {
                    username: ORIGAMI_USERNAME,
                    api_secret: ORIGAMI_SECRET,
                    entity_data_name: "e_179",
                    filter: [["_id", "=", inst.instance_data._id]],
                    field: [["fld_3138", fld_3138 ? "1" : "0"]]
                };
                return fetch(updateUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(updateBody) });
            });
            await Promise.all(updatePromises);
            return { success: true, updatedCount: existingInstances.length };
        } else {
            const createUrl = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/create_instance/format/json`;
            const createBody = {
                username: ORIGAMI_USERNAME,
                api_secret: ORIGAMI_SECRET,
                entity_data_name: "e_179",
                form_data: [{
                    group_data_name: "g_469",
                    data: [{ fld_3140: { instance_id: fld_3140 }, fld_3139: { instance_id: fld_3139 }, fld_3138: fld_3138 ? "1" : "0" }]
                }]
            };
            const res = await fetch(createUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(createBody) });
            return await res.json();
        }
    } catch (error) {
        console.error('Error toggling product like in Origami:', error);
        throw error;
    }
}

export async function getLikedProductsByUserId(fld_3140: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const searchUrl = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;
    const searchBody = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "e_179",
        return_groups: ["g_469"],
        with_archive: 0,
        filter: [
            ["fld_3140.instance_id", "=", fld_3140],
            ["fld_3138", "=", "1"]
        ]
    };

    try {
        console.log('Sending search for liked products body:', JSON.stringify(searchBody));
        const searchRes = await fetch(searchUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(searchBody) });
        const searchData = await searchRes.json();
        console.log('Liked products search response:', JSON.stringify(searchData).substring(0, 300));
        const items = searchData.data || [];
        const likedIds: string[] = [];

        items.forEach((item: any) => {
            const groups = item.instance_data.field_groups || [];
            if (groups.length > 0) {
                const targetField = getFieldValue(groups, 'g_469', 'fld_3139');
                if (targetField) {
                    const id = typeof targetField === 'object' ? targetField.instance_id : targetField;
                    if (id && !likedIds.includes(id)) likedIds.push(id);
                }
            }
        });

        if (likedIds.length === 0) return [];

        const productsUrl = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;
        const productsBody = {
            username: ORIGAMI_USERNAME,
            api_secret: ORIGAMI_SECRET,
            entity_data_name: "e_175",
            return_groups: ["g_451", "g_452", "g_453", "g_455", "g_456"],
            filter: [
                ["_id", "in", likedIds]
            ]
        };

        const productsResponse = await fetch(productsUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(productsBody) });
        const productsData = await productsResponse.json();

        if (!productsResponse.ok || productsData.error) return [];

        return productsData.data || [];
    } catch (error) {
        console.error('Error fetching liked products:', error);
        throw error;
    }
}

export async function getSubCategories(categoryId: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;

    // Fetch ALL sub-categories (no filter), then filter in code
    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "e_173",
        type: 2,
        limit: [0, 100],
        with_archive: 0
    };

    try {
        console.log(`Fetching all sub-categories from Origami for category ${categoryId}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const errorMsg = formatOrigamiError(data.error_message || data.error || 'Unknown error');
            console.error('Origami Fetch Sub-Categories Failed:', response.status, errorMsg);
            return [];
        }

        const allItems = data.data || [];
        if (allItems.length === 0) return [];

        // Log the first item's fields for debugging
        const sampleFields = allItems[0]?.instance_data?.field_groups?.[0]?.fields_data?.[0] || [];
        console.log('Sub-Category sample fields:', JSON.stringify(sampleFields.map((f: any) => ({
            name: f.field_name,
            dname: f.field_data_name,
            val: f.value,
            valType: typeof f.value === 'object' ? 'object' : typeof f.value
        })), null, 2));

        // Filter and map: find the category-link field (object with instance_id) and name field (string value)
        const results: { id: string; name: string }[] = [];

        for (const item of allItems) {
            const fields = item?.instance_data?.field_groups?.[0]?.fields_data?.[0] || [];

            let nameValue = '';
            let linkedCategoryId = '';

            for (const field of fields) {
                const val = field.value;
                // If the value is an object with instance_id, it's a link to another entity (category)
                if (val && typeof val === 'object' && val.instance_id) {
                    linkedCategoryId = val.instance_id;
                }
                // If it's a plain string and not empty, it's likely the name
                else if (typeof val === 'string' && val.trim() && !nameValue) {
                    nameValue = val;
                }
            }

            if (linkedCategoryId === categoryId && nameValue) {
                results.push({ id: item.instance_data._id, name: nameValue });
            }
        }

        console.log(`Found ${results.length} sub-categories for category ${categoryId}:`, results);
        return results;
    } catch (error) {
        console.error('Error fetching sub-categories from Origami:', error);
        return [];
    }
}

/**
 * Helper to extract an Origami instance_id from the user's origamiFields array
 */
function getOrigamiId(userData: any, fieldId: string): string | null {
    if (!userData || !userData.origamiFields || !Array.isArray(userData.origamiFields)) return null;
    const field = userData.origamiFields.find((f: any) => f.field_id === fieldId);
    if (!field || !field.default_value) return null;

    // If it's already an object with instance_id
    if (typeof field.default_value === 'object' && field.default_value.instance_id) {
        return field.default_value.instance_id;
    }

    // Fallback: if it's a string that looks like an ID
    if (typeof field.default_value === 'string' && field.default_value.length > 10) {
        return field.default_value;
    }

    return null;
}

export async function createProduct(productData: any, userData: any) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/create_instance/format/json`;

    // Try to get location ID if it's text
    let locationId = productData.location;
    if (productData.location === 'גלילות') {
        locationId = '69a83fb17c629a175d08646a';
    }

    // Extract IDs from userData if they aren't at the top level
    const subOrgId = userData.subOrganizationId || getOrigamiId(userData, '3129');
    const orgId = userData.organizationId || getOrigamiId(userData, '3128');
    const userId = userData.id;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "e_175",
        ov: "2",
        form_data: [
            {
                group_data_name: "g_451",
                data: [
                    {
                        fld_3027: { instance_id: productData.categoryId },
                        fld_3028: productData.subCategoryId ? { instance_id: productData.subCategoryId } : "",
                        fld_3029: productData.type,
                        fld_3031: String(productData.price || 0),
                        fld_3032: productData.quantity ? String(productData.quantity) : "",
                        fld_3033: productData.condition,
                        fld_3038: "ממתין לאישור",
                        fld_3099: { instance_id: locationId },
                        fld_3142: productData.name,
                        fld_3143: productData.description,
                    }
                ]
            },
            {
                group_data_name: "g_456",
                data: [
                    {
                        fld_3030: productData.image
                    }
                ]
            },
            {
                group_data_name: "g_452",
                data: [
                    {
                        fld_3034: `${userData.firstName} ${userData.lastName}`,
                        fld_3049: "",
                        fld_3035: userData.phone || "",
                        fld_3130: userId ? { instance_id: userId, text: `${userData.firstName} ${userData.lastName}` } : "",
                        fld_3036: userData.email || "",
                        fld_3037: subOrgId ? { instance_id: subOrgId, text: userData.subOrganization } : ""
                    }
                ]
            },
            {
                group_data_name: "g_454",
                data: [
                    {
                        fld_3042: "",
                        fld_3044: "",
                        fld_3076: "",
                        fld_3077: "",
                        fld_3078: "",
                        fld_3079: "",
                        fld_3132: ""
                    }
                ]
            },
            {
                group_data_name: "g_455",
                data: [
                    {
                        fld_3056: "",
                        fld_3057: ""
                    }
                ]
            }
        ]
    };

    try {
        console.log('Creating product in Origami:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const errorMsg = formatOrigamiError(data.error_message || data.error || 'Unknown error');
            console.error('Origami Create Product Failed:', response.status, errorMsg, data);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        return data.results || data;
    } catch (error) {
        console.error('Error creating product in Origami:', error);
        throw error;
    }
}

export function mapOrigamiCategory(raw: any) {
    const instance = raw.instance_data;
    const groups = instance.field_groups;

    const group1 = groups[0];
    const fields = group1?.fields_data?.[0] || [];
    const nameField = fields.find((f: any) => f.field_data_name === 'fld_3021' || f.field_name === 'שם');
    const name = nameField?.value || 'קטגוריה ללא שם';

    return {
        id: instance._id,
        name: name,
        icon: 'Package' // Default icon for all categories for now
    };
}
