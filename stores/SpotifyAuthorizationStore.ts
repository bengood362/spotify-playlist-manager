import { GetTokenResponse } from '../apis/SpotifyAuthApi';

type SpotifyAuthorization = {
    accessToken: GetTokenResponse['access_token'],
    tokenType: GetTokenResponse['token_type'],
    refreshToken: GetTokenResponse['refresh_token'],
    expiresIn: GetTokenResponse['expires_in'],
    scope: GetTokenResponse['scope'],

    /**
     * @property {issuedAt} string An Access Token that can be provided in subsequent calls, for example to Spotify Web API services.
     **/
    issuedAt: number
}

class SpotifyAuthorizationStore {
    public authorizationMap: Record<string, SpotifyAuthorization> = {};

    set(key: string, authorization: SpotifyAuthorization): void {
        console.log('key added', key);

        this.authorizationMap = {
            ...this.authorizationMap,
            [key]: authorization,
        };
    }

    get(key: string): SpotifyAuthorization | null {
        return this.authorizationMap[key] ?? null;
    }
}

// TODO: currently the singleton wont work, as nextjs doesnt "cache" the import
export const spotifyAuthorizationStore = new SpotifyAuthorizationStore();