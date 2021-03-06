import { serialize } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';
import { spotifyAuthorizationStore } from '../../../../stores/SpotifyAuthorizationStore';
import { nanoid } from 'nanoid';
import { CookieKey } from '../../../../constants/CookieKey';
import SpotifyAuthApi from '../../../../apis/SpotifyAuthApi';
import { fromIssueTokenByAuthCodeResponse } from '../../../../server/model/adapter/spotifyAuthorization';

type Data = {
    message: string,
}
type ErrorResponse = {
    message: string,
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data | ErrorResponse>,
) {
    try {
        if (
            !process.env.SPOTIFY_CLIENT_ID ||
            !process.env.SPOTIFY_CLIENT_SECRET ||
            !process.env.SPOTIFY_REDIRECT_URI
        ) {
            throw new Error('invalid_config');
        }

        const spotifyAuthApi = new SpotifyAuthApi({
            username: process.env.SPOTIFY_CLIENT_ID,
            password: process.env.SPOTIFY_CLIENT_SECRET,
        });

        const code = req.query['code'];

        if (typeof code !== 'string') {
            throw new Error('bad_request');
        }

        const tokenResponseData = await spotifyAuthApi.getTokenByAuthCode(code);

        const authorization = fromIssueTokenByAuthCodeResponse(tokenResponseData, new Date());
        const sessionId = req.cookies[CookieKey.SESSION_ID_COOKIE_KEY] ?? nanoid();

        await spotifyAuthorizationStore.set(sessionId, authorization);

        res.setHeader('Set-Cookie', [
            serialize(CookieKey.SESSION_ID_COOKIE_KEY, sessionId, { httpOnly: true, sameSite: 'lax', path: '/' }),
        ]);

        // NOTE: 302 doesnt allow to save cookie
        const TARGET_PATH = '/spotify-playlist-manager';
        const responseText = `<html><head><meta http-equiv="refresh" content="2;url=${TARGET_PATH}" /></head></html>`;

        res.redirect(200, responseText);
    } catch (err) {
        console.error('[E]:/api/oauth2/spotify/callback', err);

        res.status(500).json({ message: 'internal_server_error' });
    }
}
