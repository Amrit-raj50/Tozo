// Vercel Serverless Function: POST /api/auth/github/callback
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const { code, redirect_uri } = req.body || {};
  if (!code) {
    return res.status(400).json({ detail: 'Authorization code is required' });
  }

  const clientId = process.env.GITHUB_CLIENT_ID || 'Ov23li3wozYY6QgyE2zy';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || 'b4b364e971707d4a2e5947a0fbc61d84f6691519';

  try {
    // 1. Exchange code for access token
    const tokenParams = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    };
    if (redirect_uri) {
      tokenParams.redirect_uri = redirect_uri;
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Tozo-Code-Companion/1.0',
      },
      body: JSON.stringify(tokenParams),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.status(400).json({ detail: tokenData.error_description || tokenData.error });
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return res.status(400).json({ detail: 'No access token received from GitHub.' });
    }

    // 2. Fetch authenticated user profile
    const authHeaders = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'Tozo-Code-Companion/1.0',
    };

    const userRes = await fetch('https://api.github.com/user', { headers: authHeaders });
    if (!userRes.ok) {
      return res.status(401).json({ detail: 'Failed to retrieve GitHub user profile.' });
    }
    const userData = await userRes.json();

    // 3. Fetch user repositories
    const reposRes = await fetch(
      'https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator',
      { headers: authHeaders }
    );
    const reposData = reposRes.ok ? await reposRes.json() : [];

    const formattedRepos = reposData.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      repo_url: r.html_url,
      description: r.description || 'No description provided.',
      stars: r.stargazers_count || 0,
      open_issues: r.open_issues_count || 0,
      language: r.language || 'Code',
      default_branch: r.default_branch || 'main',
      pushed_at: r.pushed_at,
      is_private: r.private || false,
    }));

    return res.status(200).json({
      user: {
        username: userData.login,
        name: userData.name || userData.login,
        avatar_url: userData.avatar_url,
        html_url: userData.html_url,
        bio: userData.bio || '',
        public_repos: userData.public_repos || 0,
        followers: userData.followers || 0,
        auth_method: 'github_oauth',
      },
      repositories: formattedRepos,
      token: accessToken,
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Internal server error during OAuth callback.' });
  }
}
