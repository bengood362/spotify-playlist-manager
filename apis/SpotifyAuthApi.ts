import axios, { AxiosResponse, AxiosBasicCredentials } from 'axios';

const redirectUri = 'http://127.0.0.1:3000/api/oauth2/spotify/callback';

export default class SpotifyAuthApi {
    private readonly apiHost = 'https://accounts.spotify.com';
    private readonly authorization: AxiosBasicCredentials;

    // requires basic client auth
    constructor(
        authorization: AxiosBasicCredentials,
    ) {
        this.authorization = authorization;
    }

    async getTokenByAuthCode(authCode: string): Promise<GetTokenResponse> {
        const apiUrl = `${this.apiHost}/api/token`;
        const params = new URLSearchParams();

        params.append('code', authCode);
        params.append('redirect_uri', redirectUri);
        params.append('grant_type', 'authorization_code');

        // TODO: authorize
        const response = await axios.post<GetTokenParams, AxiosResponse<GetTokenResponse>>(
            apiUrl,
            params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                auth: this.authorization,
            },
        );

        if (response.status < 200 || response.status >= 300) {
            console.log('[E]SpotifyAuthApi:getTokenByAuthCode', response.data);

            throw new Error('failed_to_fetch_token');
        }

        return response.data;
    }
}

/**
 * http://127.0.0.1:3000/api/oauth2/spotify/callback?code=#########
 */
type GetTokenParams = {
    code: string,
    redirect_uri: string,
    grant_type: string,
}

// https://developer.spotify.com/documentation/general/guides/authorization/code-flow/
export type GetTokenResponse = {
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
