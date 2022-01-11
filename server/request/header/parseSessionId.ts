import { parse } from 'cookie';
import { CookieKey } from '../../../constants/CookieKey';

export const parseSessionId = (cookieHeader: string) => {
    const cookieMap = parse(cookieHeader, { decode: (s) => decodeURIComponent(s) });
    const cookieSessionId = cookieMap[CookieKey.SESSION_ID_COOKIE_KEY];

    if (!cookieSessionId) {
        return null;
    }

    const sessionId = cookieSessionId.trim();

    return sessionId;
};
