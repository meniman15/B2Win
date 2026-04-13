import dotenv from 'dotenv';
dotenv.config();

const ORIGAMI_ACCOUNT_NAME = process.env.ORIGAMI_ACCOUNT_NAME;
const ORIGAMI_USERNAME = process.env.ORIGAMI_USERNAME;
const ORIGAMI_SECRET = process.env.ORIGAMI_SECRET;

function formatOrigamiError(error: any) {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        // Handle validation errors specifically as requested
        if (error.type === 'validation' && Array.isArray(error.column)) {
            const validationDetails = error.column
                .map((col: any) => `"${col.field_name}": ${col.message || 'ערך לא תקין'}`)
                .join('\n');

            return `אירעה שגיאה ביצירת הפריט, נא לוודא שכל השדות תקינים ולנסות שנית.\nשגיאה:\n${validationDetails}`;
        }

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
            const interestMap: { [productId: string]: { interestId: string, reported: boolean } } = {};
            try {
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
                        ["interested_id.instance_id", "=", userId]
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
                        const interestId = item.instance_data._id;
                        const transIdValue = getFieldValue(groups, 'transaction_details', 'transaction_id');
                        const transId = transIdValue?.instance_id || transIdValue;
                        const status = getFieldValue(groups, 'interested_details', 'fld_3074') || '';
                        if (transId && !interestList.includes(transId)) {
                            interestList.push(transId);
                        }
                        if (transId && interestId) {
                            interestMap[transId] = {
                                interestId,
                                reported: status === 'דווח מכירה על ידי מתעניין'
                            };
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

            const isAdminValue = getDetailsFieldValue('fld_3364');

            return {
                id: instance._id,
                firstName: userFirstName,
                lastName: userLastName,
                email: email,
                phone: telephone,
                isAdmin: isAdminValue === 1 || isAdminValue === '1' || isAdminValue === true,
                organization: typeof orgValue === 'object' ? orgValue.text : (orgValue || 'B2Win'),
                organizationId: typeof orgValue === 'object' ? orgValue.instance_id : null,
                subOrganization: typeof subOrgValue === 'object' ? subOrgValue.text : subOrgValue,
                subOrganizationId: typeof subOrgValue === 'object' ? subOrgValue.instance_id : null,
                status: getDetailsFieldValue('status') || 'Active',
                origamiFields: origamiFields,
                interestList: interestList,
                interestMap: interestMap,
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
                        subOrganization: userData.subOrganization,
                        fld_3364: userData.isAdmin
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
            // Send the full error object (including column array) to the user
            console.error('Origami Registration Failed:', data.error);
            throw new Error(formatOrigamiError(data.error));
            // Attach the error object for downstream error handling (e.g. in Express)
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
        // If error has .origamiError, rethrow as is for Express error handler to send as JSON
        if ((error as any).origamiError) {
            throw error;
        }
        throw error;
    }
}

export async function updateUserProfile(userId: string, data: any) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/update_instance_fields/format/json`;

    const fieldsToUpdate = [];
    if (data.firstName !== undefined) fieldsToUpdate.push(["first_name", data.firstName]);
    if (data.lastName !== undefined) fieldsToUpdate.push(["last_name", data.lastName]);
    if (data.email !== undefined) fieldsToUpdate.push(["email", data.email]);
    if (data.phone !== undefined) fieldsToUpdate.push(["telephone", data.phone]);

    if (data.organizationId) {
        fieldsToUpdate.push(["organization", { instance_id: data.organizationId, text: data.organization }]);
    } else if (data.organization !== undefined) {
        fieldsToUpdate.push(["organization", data.organization]);
    }

    if (data.subOrganizationId) {
        fieldsToUpdate.push(["subOrganization", { instance_id: data.subOrganizationId, text: data.subOrganization }]);
    } else if (data.subOrganization !== undefined) {
        fieldsToUpdate.push(["subOrganization", data.subOrganization]);
    }

    if (fieldsToUpdate.length === 0) return { success: true };

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "users",
        filter: [["_id", "=", userId]],
        field: fieldsToUpdate
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const resData = await response.json();

        if (!response.ok || resData.error) {
            const errorMsg = resData.error_message || resData.error || 'Unknown error';
            console.error('Origami Update User Failed:', response.status, errorMsg, resData);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        return { success: true, updated: true };
    } catch (error) {
        console.error('Error updating user profile with Origami:', error);
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
                        interested_id: { instance_id: userData.id, text: `${userData.firstName} ${userData.lastName}` },
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
        // Return the created instance data which includes the _id
        return data.instance || { _id: data.instance_id } || data;
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
                "interested_id.instance_id",
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

        // Inject interests into instances for mapping
        return await injectInterests(instances);
    } catch (error) {
        console.error('Error fetching products from Origami:', error);
        throw error;
    }
}
async function injectInterests(instances: any[]) {
    if (!instances || instances.length === 0) return instances;

    // Use a Set for unique IDs if needed, but here simple map is fine
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

        try {
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
        } catch (err) {
            console.error('Error injecting interests:', err);
            // Non-blocking error, just continue without interests
        }
    }

    // Inject interests into instances
    instances.forEach((inst: any) => {
        const prodId = inst.instance_data._id;
        inst.interestedUserIds = interestMap[prodId] || [];
    });

    return instances;
}

export async function getProductInterests(productId: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;
    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "interests",
        return_groups: ["transaction_details", "interested_details"],
        type: 2,
        with_archive: 0,
        filter: [
            ["transaction_id.instance_id", "=", productId],
            ["fld_3089", "!=", "true"]
        ]
    };

    try {
        console.log(`Fetching detailed interests for product: ${productId}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            data = { error: text };
        }

        if (!response.ok) {
            throw new Error(data.error_message || data.error || `Origami error: ${response.statusText}`);
        }

        const instances = data.data || [];

        const uniqueInterestsMap = new Map();

        instances.forEach((item: any) => {
            const groups = item.instance_data.field_groups;

            // Extract the user basic details
            const userIdObj = getFieldValue(groups, 'interested_details', 'interested_id');
            const fullName = getFieldValue(groups, 'interested_details', 'interested_full_name');
            const phone = getFieldValue(groups, 'interested_details', 'interested_telephone');
            const email = getFieldValue(groups, 'interested_details', 'interested_email');
            const quantity = getFieldValue(groups, 'interested_details', 'desired_quantity');
            const statusStr = getFieldValue(groups, 'interested_details', 'fld_3074');
            // The interests entity might not correctly mirror the buyer's subOrg, we fetch from users below.

            const userId = typeof userIdObj === 'object' ? userIdObj?.instance_id : userIdObj;

            const reporterObj = getFieldValue(groups, 'g_504', 'fld_3353');
            const reporter = typeof reporterObj === 'object' ? reporterObj?.text : reporterObj;

            if (userId && !uniqueInterestsMap.has(userId)) {
                uniqueInterestsMap.set(userId, {
                    id: item.instance_data._id,
                    userId,
                    userName: typeof userIdObj === 'object' ? userIdObj?.text : fullName || 'משתמש לא ידוע',
                    phone: phone || '',
                    email: email || '',
                    quantity: quantity || 1,
                    status: statusStr || '',
                    reporter: reporter || '',
                    subOrg: '',
                    organization: ''
                });
            }
        });

        const uniqueInterests = Array.from(uniqueInterestsMap.values());

        // Fetch organization and sub-organization details natively from the users entity
        await Promise.all(uniqueInterests.map(async (interest: any) => {
            const userDetails = await getUserOrgDetails(interest.userId);
            interest.organization = userDetails.organization;
            interest.subOrg = userDetails.subOrg;
        }));

        return uniqueInterests;
    } catch (error) {
        console.error(`Error fetching detailed interests for ${productId}:`, error);
        return [];
    }
}

async function getUserOrgDetails(userId: string) {
    if (!userId) return { organization: '', subOrg: '' };
    try {
        const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;
        const body = {
            username: ORIGAMI_USERNAME,
            api_secret: ORIGAMI_SECRET,
            entity_data_name: "users",
            filter: [["_id", "=", userId]]
        };
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data: any = await response.json();

        if (data && data.data && data.data.length > 0) {
            const groups = data.data[0].instance_data.field_groups;
            const orgValue = getFieldValue(groups, 'user_details', 'organization');
            const subOrgValue = getFieldValue(groups, 'user_details', 'subOrganization');

            return {
                organization: typeof orgValue === 'object' ? orgValue?.text : orgValue || '',
                subOrg: typeof subOrgValue === 'object' ? subOrgValue?.text : subOrgValue || ''
            };
        }
    } catch (e) {
        console.error('Error fetching user org details for id:', userId, e);
    }
    return { organization: '', subOrg: '' };
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
    const sellerIdObj = getFieldValue(groups, 'g_452', 'fld_3130');
    const logisticsComment = getFieldValue(groups, 'g_455', 'fld_3057');
    const imageObj = getFieldValue(groups, 'g_456', 'fld_3030');
    const purchaseDocObj = getFieldValue(groups, 'g_451', 'fld_3357');
    const productQuantity = getFieldValue(groups, 'g_451', 'fld_3032');

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
        imageUrl: imageObj?.location || '',
        seller: String(sellerName || 'מוכר חסוי'),
        sellerId: sellerIdObj?.instance_id || '',
        status: String(status || 'חדש'),
        description: displayDescription,
        manufacturer: subCategoryName || '-',
        model: '',
        purchaseDocumentation: purchaseDocObj?.file_name || '',
        purchaseDocUrl: purchaseDocObj?.location || '',
        interestedUserIds: interestedUserIds,
        memberSince: instance.insertTimestamp ? new Date(instance.insertTimestamp).getFullYear().toString() : '2024',
        faq: faq,
        sellerPhone: sellerPhone ? String(sellerPhone) : '',
        sellerEmail: sellerEmail ? String(sellerEmail) : '',
        quantity: productQuantity ? Number(productQuantity) : 1,
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

export async function getLocations() {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "e_149",
        return_groups: ["g_379"],
        type: 2,
        limit: [0, 100],
        with_archive: 0
    };

    try {
        console.log('Fetching locations from Origami:', url);
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
            console.error('Origami Fetch Locations Failed:', response.status, errorMsg, data);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        const instances = data.data || [];
        return instances.map((item: any) => {
            const groups = item.instance_data.field_groups;
            const group = groups.find((g: any) => g.field_group_data.group_data_name === 'g_379');
            const fields = group?.fields_data?.[0] || [];
            const textField = fields.find((f: any) => f.field_data_name === 'fld_2426');

            return {
                id: item.instance_data._id,
                text: textField?.value || 'Unnamed Location'
            };
        });
    } catch (error) {
        console.error('Error fetching locations from Origami:', error);
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
        return await injectInterests(instances);
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
            ["interested_id.instance_id", "=", userId]
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
        return await injectInterests(instances);
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

        return await injectInterests(productsData.data || []);
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
                        fld_3357: productData.purchaseDoc || ""
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
            const errorMsg = formatOrigamiError(data.error || data.error_message || 'Unknown error');
            console.error('Origami Create Product Failed:', response.status, errorMsg, JSON.stringify(data));
            // Throw the formatted message directly
            throw new Error(errorMsg);
        }

        return data.results || data;
    } catch (error) {
        console.error('Error creating product in Origami:', error);
        throw error;
    }
}

export async function getOrganizations() {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "e_177",
        return_groups: ["g_460"],
        type: 2,
        with_archive: 0
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok || data.error) return [];

        return (data.data || []).map((item: any) => {
            const fields = item.instance_data.field_groups[0].fields_data[0];
            return {
                id: fields.find((f: any) => f.field_data_name === 'fld_3083')?.value || item.instance_data._id,
                instance_id: item.instance_data._id,
                name: fields.find((f: any) => f.field_data_name === 'fld_3082')?.value || 'Unnamed Org'
            };
        });
    } catch (error) {
        console.error('Error fetching organizations:', error);
        return [];
    }
}

export async function getSubOrganizations(orgId: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "e_174",
        return_groups: ["g_450"],
        type: 2,
        with_archive: 0,
        filter: [
            ["fld_3084.instance_id", "=", orgId]
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok || data.error) return [];

        return (data.data || []).map((item: any) => {
            const fields = item.instance_data.field_groups[0].fields_data[0];
            return {
                id: fields.find((f: any) => f.field_data_name === 'fld_3050')?.value || item.instance_data._id,
                instance_id: item.instance_data._id,
                name: fields.find((f: any) => f.field_data_name === 'fld_3026')?.value || 'Unnamed Sub-Org'
            };
        });
    } catch (error) {
        console.error('Error fetching sub-organizations:', error);
        return [];
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

export async function uploadFileToOrigami(fileBuffer: Buffer, fileName: string, mimeType: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/upload_file`;

    // In Node 21+, FormData and Blob are global. Since we are on Node 24, we can use them.
    const formData = new FormData();
    formData.append("username", ORIGAMI_USERNAME);
    formData.append("api_secret", ORIGAMI_SECRET);

    // Convert Buffer to Blob for FormData
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    formData.append("file", blob, fileName);

    try {
        console.log('Uploading file to Origami:', url);
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const data: any = await response.json();
        console.log('Origami Upload Full Response:', JSON.stringify(data));

        if (!response.ok || data.success !== "ok") {
            const errorMsg = data.message || "Upload failed";
            console.error('Origami Upload Failed:', response.status, errorMsg, data);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        console.log('Origami Upload Success:', data.results);

        // Extract the actual file metadata without the success/result wrappers
        const fileMetadata = data.results || data;
        if (fileMetadata.success) delete fileMetadata.success;
        if (fileMetadata.results) delete fileMetadata.results;

        return fileMetadata;
    } catch (error) {
        console.error('Error uploading file to Origami:', error);
        throw error;
    }
}

// ==================== Q&A Functions ====================

export async function getQuestionsForProduct(productId: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/instance_data/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "Q_A_details",
        return_groups: ["g_503"],
        with_archive: 0,
        filter: [
            ["Q_A_post.instance_id", "=", productId]
        ]
    };

    try {
        console.log('Fetching Q&A for product:', productId);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const errorMsg = formatOrigamiError(data.error_message || data.error || 'Unknown error');
            console.error('Origami Fetch Q&A Failed:', response.status, errorMsg);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        const instances = data.data || [];
        return instances
            .filter((item: any) => !item.instance_data.archived)
            .map((item: any) => {
                const groups = item.instance_data.field_groups;
                const question = getFieldValue(groups, 'g_503', 'Q_A_question');
                const answer = getFieldValue(groups, 'g_503', 'Q_A_answer');
                const askerObj = getFieldValue(groups, 'g_503', 'Q_A_Q');
                const answererObj = getFieldValue(groups, 'g_503', 'Q_A_A');
                const postObj = getFieldValue(groups, 'g_503', 'Q_A_post');
                const date = getFieldValue(groups, 'g_503', 'Q_A_date');
                const publishStatus = getFieldValue(groups, 'g_503', 'Q_A_publishStatus');

                return {
                    id: item.instance_data._id,
                    question: (typeof question === 'object' ? question?.text : question) || '',
                    answer: (typeof answer === 'object' ? answer?.text : answer) || '',
                    askerId: askerObj?.instance_id || (typeof askerObj === 'string' ? askerObj : ''),
                    askerName: (typeof askerObj === 'object' ? askerObj?.text : String(askerObj || '')) || '',
                    answererId: answererObj?.instance_id || (typeof answererObj === 'string' ? answererObj : ''),
                    productId: postObj?.instance_id || productId,
                    date: (typeof date === 'object' ? (date?.text || '') : String(date || '')),
                    isPublished: publishStatus === 'true' || publishStatus === true || publishStatus === '1' || publishStatus === 1 || !!(typeof answer === 'object' ? answer?.text : answer)
                };
            });
    } catch (error) {
        console.error('Error fetching Q&A from Origami:', error);
        throw error;
    }
}

export async function createQuestion(productId: string, question: string, askerId: string, askerName: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/create_instance/format/json`;

    const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "Q_A_details",
        form_data: [
            {
                group_data_name: "g_503",
                data: [
                    {
                        Q_A_question: question,
                        Q_A_answer: "",
                        Q_A_Q: { instance_id: askerId, text: askerName },
                        Q_A_A: "",
                        Q_A_post: { instance_id: productId },
                        Q_A_date: now,
                        Q_A_publishStatus: ""
                    }
                ]
            }
        ]
    };

    try {
        console.log('Creating Q&A question for product:', productId);
        console.log('Q&A Create Request Body:', JSON.stringify(body, null, 2));
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log('Q&A Create Full Response:', JSON.stringify(data, null, 2));

        if (!response.ok || data.error) {
            const errorMsg = formatOrigamiError(data.error_message || data.error || 'Unknown error');
            console.error('Origami Create Q&A Failed:', response.status, errorMsg);
            console.error('Full error data:', JSON.stringify(data, null, 2));
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        console.log('Origami Create Q&A Success:', JSON.stringify(data));
        return data.results || data;
    } catch (error) {
        console.error('Error creating Q&A in Origami:', error);
        throw error;
    }
}

export async function answerQuestion(qaId: string, answer: string, answererId: string, answererName: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/update_instance_fields/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "Q_A_details",
        filter: [["_id", "=", qaId]],
        field: [
            ["Q_A_answer", answer],
            ["Q_A_A", { instance_id: answererId, text: answererName }]
        ]
    };

    try {
        console.log('Answering Q&A question:', qaId);
        console.log('Q&A Answer Request Body:', JSON.stringify(body, null, 2));
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log('Q&A Answer Full Response:', JSON.stringify(data, null, 2));

        if (!response.ok || data.error) {
            const errorMsg = formatOrigamiError(data.error_message || data.error || 'Unknown error');
            console.error('Origami Answer Q&A Failed:', response.status, errorMsg);
            console.error('Full error data:', JSON.stringify(data, null, 2));
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        console.log('Origami Answer Q&A Success:', JSON.stringify(data));
        return data.results || data;
    } catch (error) {
        console.error('Error answering Q&A in Origami:', error);
        throw error;
    }
}

export async function deleteQuestion(qaId: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/remove_instance/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "Q_A_details",
        group_data_name: "g_503",
        _ids: [qaId]
    };

    try {
        console.log('Removing Q&A question instance:', qaId);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const errorMsg = formatOrigamiError(data.error_message || data.error || 'Unknown error');
            console.error('Origami Remove Q&A Failed:', response.status, errorMsg);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        console.log('Origami Remove Q&A Success:', JSON.stringify(data));
        return data.results || data;
    } catch (error) {
        console.error('Error removing Q&A in Origami:', error);
        throw error;
    }
}

export async function updateProductStatus(productId: string, status: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/update_instance_fields/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "e_175",
        filter: [["_id", "=", productId]],
        field: [
            ["fld_3038", status]
        ]
    };

    try {
        console.log(`Updating product status in Origami: ${productId} -> ${status}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const errorMsg = formatOrigamiError(data.error_message || data.error || 'Unknown error');
            console.error('Origami Update Product Status Failed:', response.status, errorMsg);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        console.log('Origami Update Product Status Success:', JSON.stringify(data));
        return data.results || data;
    } catch (error) {
        console.error('Error updating product status in Origami:', error);
        throw error;
    }
}

export async function reportInterestSale(interestId: string, quantity: number, unitPrice: number, transferMethod: string, reporter: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    // Determine the correct status value based on the reporter
    // Based on Origami possible values: ["ממתין", "במשא ומתן", "דווח מכירה על ידי מתעניין", "נסגר", "בוטל"]
    let statusValue = "נסגר"; // Default for seller
    if (reporter.includes('מתעניין') || reporter.includes('קונה')) {
        statusValue = "דווח מכירה על ידי מתעניין";
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/update_instance_fields/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "interests",
        filter: [["_id", "=", interestId]],
        field: [
            ["desired_quantity", quantity],
            ["fld_3356", unitPrice],
            ["fld_3361", transferMethod],
            ["fld_3353", reporter],
            ["fld_3074", statusValue]
        ]
    };

    try {
        console.log(`Reporting interest sale in Origami: ${interestId}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            data = { error: text };
        }

        try {
            const fs = await import('fs');
            const path = await import('path');
            const logPath = '/Users/menigrossman/Projects/Be2Win/server/origami_debug.log';
            const logEntry = `\n[${new Date().toISOString()}] REQUEST: ${JSON.stringify(body, null, 2)}\nRESPONSE: ${text}\n`;
            fs.appendFileSync(logPath, logEntry);
        } catch (logErr) {
            console.error('Failed to write to debug log:', logErr);
        }

        if (!response.ok || data.error) {
            const errorMsg = formatOrigamiError(data.error_message || data.error || 'Unknown error');
            console.error('Origami Report Interest Sale Failed:', response.status, errorMsg);
            throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
        }

        console.log('Origami Report Interest Sale Success:', JSON.stringify(data));
        return data.results || data;
    } catch (error: any) {
        const fs = await import('fs');
        const logPath = '/Users/menigrossman/Projects/Be2Win/server/origami_debug.log';
        const logMsg = `\n[${new Date().toISOString()}] REPORT ERROR: ${error.message}\nStack: ${error.stack}\n`;
        try { fs.appendFileSync(logPath, logMsg); } catch (e) { }
        console.error('Error reporting interest sale to Origami:', error);
        throw error;
    }
}

/**
 * Update the fld_3301 field (message to buyer) in the transaction_details group for a specific interest instance.
 * @param interestId The Origami instance ID of the interest
 * @param message The message to set in fld_3301
 */
export async function updateInterestMessage(interestId: string, message: string) {
    if (!ORIGAMI_ACCOUNT_NAME || !ORIGAMI_USERNAME || !ORIGAMI_SECRET) {
        throw new Error('Origami configuration is missing in .env');
    }

    const url = `https://${ORIGAMI_ACCOUNT_NAME}.origami.ms/entities/api/update_instance_fields/format/json`;

    const body = {
        username: ORIGAMI_USERNAME,
        api_secret: ORIGAMI_SECRET,
        entity_data_name: "interests",
        filter: [
            ["_id", "=", interestId]
        ],
        field: [
            ["fld_3301", message]
        ]
    };

    try {
        console.log('Updating interest message in Origami:', url, body);
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
                console.error('Origami Interest Message Update Failed:', errorMessage);
                throw new Error(`Origami API error: ${errorMessage}`);
            } else {
                console.error('Origami Interest Message Update Failed:', response.status, errorMsg, data);
                throw new Error(`Origami API error: ${response.status} - ${errorMsg}`);
            }
        }

        console.log('Origami Interest Message Update Success:', JSON.stringify(data));
        return data.results || data;
    } catch (error) {
        console.error('Error updating interest message with Origami:', error);
        throw error;
    }
}
