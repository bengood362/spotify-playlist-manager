import { parse } from 'cookie';
import { CookieKey } from '../../../constants/CookieKey';
import { spotifyAuthorizationStore } from '../../../stores/SpotifyAuthorizationStore';

export const parseAuthorization = async (cookieHeader: string) => {
    const cookieMap = parse(cookieHeader, { decode: (s) => decodeURIComponent(s) });
    const cookieSessionId = cookieMap[CookieKey.SESSION_ID_COOKIE_KEY];

    if (!cookieSessionId) {
        return null;
    }

    const sessionId = cookieSessionId.trim();

    const authorization = await spotifyAuthorizationStore.get(sessionId);

    return authorization;
};
