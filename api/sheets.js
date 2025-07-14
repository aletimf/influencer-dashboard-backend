import { google } from 'googleapis';

export default async function handler(req, res) {
    // Enhanced CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Log the request for debugging
    console.log('Request received:', {
        method: req.method,
        query: req.query,
        headers: req.headers
    });

    // API key validation
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
        console.log('Invalid API key:', apiKey);
        return res.status(401).json({ error: 'Invalid API key' });
    }

    try {
        const { sheetId, sheetName, range = 'A1:E100' } = req.query;

        if (!sheetId || !sheetName) {
            return res.status(400).json({ error: 'Missing sheetId or sheetName' });
        }

        console.log(`Fetching sheet: ${sheetId}, tab: ${sheetName}, range: ${range}`);

        // Google Sheets authentication
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                project_id: process.env.GOOGLE_PROJECT_ID,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Fetch data from Google Sheets
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!${range}`,
        });

        const values = response.data.values || [];
        console.log(`Successfully fetched ${values.length} rows`);

        return res.json({
            success: true,
            data: values,
            sheetName,
            rowCount: values.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching sheet data:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch data',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
