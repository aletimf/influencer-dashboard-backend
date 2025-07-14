// api/sheets.js
import { google } from 'googleapis';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://timftools.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // API key validation
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    try {
        const { sheetId, sheetName, range = 'A1:E100' } = req.query;

        if (!sheetId || !sheetName) {
            return res.status(400).json({ error: 'Missing sheetId or sheetName' });
        }

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

        // Fetch data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!${range}`,
        });

        return res.json({
            success: true,
            data: response.data.values || [],
            sheetName,
            rowCount: response.data.values?.length || 0
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch data',
            details: error.message 
        });
    }
}
