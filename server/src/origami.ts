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

        // Origami usually returns an array of instances
        if (data && data.instances && data.instances.length > 0) {
            const userInstance = data.instances[0];

            // Extract field metadata if available
            const origamiFields = userInstance.fields_data ? userInstance.fields_data.map((f: any) => ({
                field_id: f.field_id,
                field_name: f.field_name,
                default_value: f.value || f.default_value || ''
            })) : [];

            return {
                id: userInstance._id,
                firstName: userInstance.first_name || firstName,
                lastName: userInstance.last_name || lastName,
                email: userInstance.email || '',
                phone: userInstance.telephone || phone,
                organization: userInstance.organization || 'B2Win',
                status: userInstance.status || 'Active',
                origamiId: userInstance._id,
                origamiFields: origamiFields
            };
        }

        return null;
    } catch (error) {
        console.error('Error authenticating with Origami:', error);
        throw error;
    }
}
