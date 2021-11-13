import { serialize } from 'cookie';
import axios, { AxiosResponse } from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';
import { tokenStore } from '../../../../stores/TokenStore';
import { nanoid } from 'nanoid';

type Data = {
    message: string,
}
type ErrorResponse = {
    message: string,
}

const host = 'https://accounts.spotify.com';
const getTokenUrl = `${host}/api/token`;
const redirectUri = 'http://127.0.0.1:3000/api/oauth2/spotify/callback';

/**
 * http://127.0.0.1:3000/api/oauth2/spotify/callback?code=#########
 */

type GetTokenParams = {
    code: string,
    redirect_uri: string,
    grant_type: string,
}

// https://developer.spotify.com/documentation/general/guides/authorization/code-flow/
type GetTokenResponse = {
    /**
     * @property {access_token} string An Access Token that can be provided in subsequent calls, for example to Spotify Web API services.
     **/
    access_token: string,
    /**
     * @property {token_type} string How the Access Token may be used: always “Bearer”.
     */
    token_type: string,
    /**
     * @property {scope} string A space-separated list of scopes which have been granted for this access_token
     */
    scope: string,
    /**
     * @property {expires_in} integer The time period (in seconds) for which the Access Token is valid.
     */
    expires_in: number,
    /**
     * @property {refresh_token} string A token that can be sent to the Spotify Accounts service in place of an authorization code. (When the access code expires, send a POST request to the Accounts service /api/token endpoint, but use this code in place of an authorization code. A new Access Token will be returned. A new refresh token might be returned too.)
     */
    refresh_token: string,
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data | ErrorResponse>,
) {
    try {
        if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
            return res.status(500).json({ message: 'internal_server_error' });
        }

        const code = req.query['code'];

        if (typeof code !== 'string') {
            throw new Error('bad_request');
        }

        const params = new URLSearchParams();

        params.append('code', code);
        params.append('redirect_uri', redirectUri);
        params.append('grant_type', 'authorization_code');

        // TODO: authorize
        const tokenResponse = await axios.post<GetTokenParams, AxiosResponse<GetTokenResponse>>(
            getTokenUrl,
            params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                auth: {
                    username: process.env.SPOTIFY_CLIENT_ID,
                    password: process.env.SPOTIFY_CLIENT_SECRET,
                },
            },
        );

        if (tokenResponse.status !== 200) {
            console.log('error /api/oauth2/spotify/callback', tokenResponse.data);

            res.status(500).json({ message: 'internal_server_error' });
        }

        const {
            access_token: accessToken,
            expires_in: _expiresIn,
            refresh_token: refreshToken,
            scope: _scope,
            token_type: _tokenType,
        } = tokenResponse.data;

        const SESSION_ID_COOKIE_KEY = 'sessionId';

        const sessionId = req.cookies[SESSION_ID_COOKIE_KEY] ?? nanoid();

        tokenStore.set(sessionId, { accessToken, refreshToken });

        res.setHeader('Set-Cookie', [
            serialize('sessionId', nanoid(), { httpOnly: true, sameSite: 'lax' }),
        ]);

        // NOTE: 302 doesnt allow to save cookie
        const TARGET_PATH = '/spotify-playlist-clone';
        const responseText = `<html><head><meta http-equiv="refresh" content="2;url=${TARGET_PATH}" /></head></html>`;

        res.redirect(200, responseText);
    } catch (err) {
        console.log('error /api/oauth2/spotify/callback', err);

        res.status(500).json({ message: 'internal_server_error' });
    }
}
