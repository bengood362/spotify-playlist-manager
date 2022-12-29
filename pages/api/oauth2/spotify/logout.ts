import { serialize } from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';
import { CookieKey } from '../../../../constants/CookieKey';

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
        res.setHeader('Set-Cookie', [
            serialize(CookieKey.SESSION_ID_COOKIE_KEY, '', { httpOnly: true, sameSite: 'lax', path: '/', expires: new Date(0) }),
        ]);

        // NOTE: 302 doesnt allow to save cookie
        const TARGET_PATH = '/';
        const responseText = `<html><head><meta http-equiv="refresh" content="2;url=${TARGET_PATH}" /></head></html>`;

        res.redirect(200, responseText);
    } catch (err) {
        console.error('[E]:/api/oauth2/spotify/callback', err);

        res.status(500).json({ message: 'internal_server_error' });
    }
}
