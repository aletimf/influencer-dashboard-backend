import { google } from 'googleapis';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // --- Campaign protection gate ---
    const requestedSheetId = req.query.sheetId;
    const protectedMap = JSON.parse(process.env.PROTECTED_CAMPAIGNS || '{}');
    const isProtected = Object.prototype.hasOwnProperty.call(protectedMap, requestedSheetId);

    if (isProtected) {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        try {
            const claims = jwt.verify(token, process.env.JWT_SECRET);
            if (claims.campaignId !== requestedSheetId) {
                return res.status(403).json({ error: 'Not authorized for this campaign' });
            }
        } catch {
            return res.status(401).json({ error: 'Session expired' });
        }
    }
    // --- end gate; open campaigns fall straight through ---

    try {
        const { sheetId, sheetName, range = 'A1:E100' } = req.query;
        if (!sheetId || !sheetName) {
            return res.status(400).json({ error: 'Missing sheetId or sheetName' });
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                project_id: process.env.GOOGLE_PROJECT_ID,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!${range}`,
        });

        const values = response.data.values || [];

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
