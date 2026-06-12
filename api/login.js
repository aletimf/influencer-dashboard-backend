import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const ALLOWED_ORIGIN = 'https://imfreports.com';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end();

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { password, campaignId } = body;
    if (!password || !campaignId) return res.status(400).json({ error: 'Missing fields' });

    const map = JSON.parse(process.env.PROTECTED_CAMPAIGNS || '{}');
    const hash = map[campaignId];
    if (!hash) return res.status(400).json({ error: 'Campaign is not protected' });

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ campaignId }, process.env.JWT_SECRET, { expiresIn: '12h' });
    return res.status(200).json({ token });
}
