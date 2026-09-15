// Vercel Serverless Function: GET /api/auth/github/config
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientId = process.env.GITHUB_CLIENT_ID || 'Ov23li3wozYY6QgyE2zy';

  return res.status(200).json({
    oauth_enabled: true,
    client_id: clientId,
  });
}
