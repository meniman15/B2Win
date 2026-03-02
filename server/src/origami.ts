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
            const getFieldValue = (name: string) => {
                const field = fields.find((f: any) => f.field_data_name === name);
                return field?.value || field?.default_value || '';
            };

            // Map all fields for metadata
            const origamiFields = fields.map((f: any) => ({
                field_id: f.field_id,
                field_name: f.field_name,
                default_value: f.value || f.default_value || ''
            }));

            console.log('Origami Fields:', JSON.stringify(origamiFields));

            // Extract display values, handling object values for 'select-from-entity'
            const userFirstName = getFieldValue('first_name') || firstName;
            const userLastName = getFieldValue('last_name') || lastName;
            const email = getFieldValue('email');
            const telephone = getFieldValue('telephone') || phone;
            const orgValue = getFieldValue('organization');
            const subOrgValue = getFieldValue('subOrganization');

            return {
                id: instance._id,
                firstName: userFirstName,
                lastName: userLastName,
                email: email,
                phone: telephone,
                organization: typeof orgValue === 'object' ? orgValue.text : (orgValue || 'B2Win'),
                subOrganization: typeof subOrgValue === 'object' ? subOrgValue.text : subOrgValue,
                status: getFieldValue('status') || 'Active',
                origamiId: instance._id,
                origamiFields: origamiFields
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

        // Return the created instance data if needed
        return data.data?.[0]?.instance_data || data;
    } catch (error) {
        console.error('Error registering with Origami:', error);
        throw error;
    }
}
