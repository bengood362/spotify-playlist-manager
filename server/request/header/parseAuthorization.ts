import { SpotifyAuthorization, spotifyAuthorizationStore } from '../../../stores/SpotifyAuthorizationStore';
import { parseSessionId } from './parseSessionId';

export const parseAuthorization = async (cookieHeader: string): Promise<SpotifyAuthorization | null> => {
    const sessionId = parseSessionId(cookieHeader);

    if (!sessionId) {
        return null;
    }

    const authorization = await spotifyAuthorizationStore.get(sessionId);

    return authorization;
};
