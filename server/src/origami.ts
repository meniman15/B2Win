import dotenv from 'dotenv';
dotenv.config();

const ORIGAMI_ACCOUNT_NAME = process.env.ORIGAMI_ACCOUNT_NAME;
const ORIGAMI_USERNAME = process.env.ORIGAMI_USERNAME;
const ORIGAMI_SECRET = process.env.ORIGAMI_SECRET;

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

            return {
                id: instance._id,
                firstName: userFirstName,
                lastName: userLastName,
                email: email,
                phone: telephone,
                organization: typeof orgValue === 'object' ? orgValue.text : (orgValue || 'B2Win'),
                subOrganization: typeof subOrgValue === 'object' ? subOrgValue.text : subOrgValue,
                status: getDetailsFieldValue('status') || 'Active',
                origamiFields: origamiFields,
                interestList: interestList
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
            const errorMsg = data.error_message || data.error || 'Unknown error';
            if (response.status === 200) {
                const errorMessage = errorMsg.message ? `${errorMsg.type} - ${errorMsg.message}` : errorMsg.type;
                console.error('Origami Interest Submission Failed:', errorMessage);
                throw new Error(`Origami API error: ${errorMessage}`);
            } else {
                console.error('Origami Interest Submission Failed:', response.status, errorMsg, data);
                throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
            }
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
