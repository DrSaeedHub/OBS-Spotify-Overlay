require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

// Store code verifiers temporarily (in production, use Redis or similar)
const codeVerifiers = new Map();

// Generate PKCE code verifier and challenge
function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
    return { codeVerifier, codeChallenge };
}

// OAuth Login - Initiate Spotify authentication
app.get('/auth/login', (req, res) => {
    const { codeVerifier, codeChallenge } = generatePKCE();

    const scopes = [
        'user-read-currently-playing',
        'user-read-playback-state',
        'user-read-email'
    ].join(' ');

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.SPOTIFY_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', process.env.REDIRECT_URI);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Store verifier with a session ID
    const sessionId = crypto.randomBytes(16).toString('hex');
    codeVerifiers.set(sessionId, codeVerifier);

    res.cookie('session_id', sessionId, { httpOnly: false });
    res.redirect(authUrl.toString());
});

// OAuth Callback - Handle Spotify redirect
app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    const sessionId = req.cookies?.session_id;
    const codeVerifier = codeVerifiers.get(sessionId);

    if (!code || !codeVerifier) {
        return res.redirect('/?error=authentication_failed');
    }

    try {
        // Exchange authorization code for tokens
        const tokenResponse = await axios.post(
            'https://accounts.spotify.com/api/token',
            new URLSearchParams({
                client_id: process.env.SPOTIFY_CLIENT_ID,
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.REDIRECT_URI,
                code_verifier: codeVerifier,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // Clean up used verifier
        codeVerifiers.delete(sessionId);

        // Redirect to main page with tokens
        const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
        const redirectUrl = new URL(`${baseUrl}/`);
        redirectUrl.searchParams.set('access_token', access_token);
        redirectUrl.searchParams.set('refresh_token', refresh_token);
        redirectUrl.searchParams.set('expires_in', expires_in);

        res.redirect(redirectUrl.toString());
    } catch (error) {
        console.error('Token exchange error:', error.response?.data || error.message);
        res.redirect('/?error=token_exchange_failed');
    }
});

// Proxy endpoint to get current track (to avoid CORS issues)
app.get('/api/current-track', async (req, res) => {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!accessToken) {
        return res.status(401).json({ error: 'No access token provided' });
    }

    try {
        const response = await axios.get(
            'https://api.spotify.com/v1/me/player/currently-playing',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        // If nothing is playing, Spotify returns 204
        if (response.status === 204) {
            return res.json({ isPlaying: false });
        }

        const data = response.data;
        if (!data.item) {
            return res.json({ isPlaying: false });
        }

        res.json({
            isPlaying: true,
            track: {
                id: data.item.id,
                name: data.item.name,
                artists: data.item.artists.map(artist => artist.name).join(', '),
                album: data.item.album.name,
                image: data.item.album.images[0]?.url || data.item.album.images[1]?.url || '',
                duration: data.item.duration_ms,
                progress: data.progress_ms,
                isPlaying: data.is_playing,
            },
        });
    } catch (error) {
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'Token expired or invalid' });
        }
        console.error('Spotify API error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch current track' });
    }
});

// Refresh access token
app.post('/api/refresh-token', async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({ error: 'No refresh token provided' });
    }

    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
                client_id: process.env.SPOTIFY_CLIENT_ID,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        res.json({
            access_token: response.data.access_token,
            expires_in: response.data.expires_in,
        });
    } catch (error) {
        console.error('Token refresh error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Spotify OBS Overlay server running on http://localhost:${PORT}`);
    console.log(`🔗 Make sure to add ${process.env.REDIRECT_URI} to your Spotify app's redirect URIs`);
});
