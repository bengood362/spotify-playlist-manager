import axios, { AxiosResponse, AxiosBasicCredentials } from 'axios';
import { GetTokenParams } from './_types/token/GetTokenParams';
import { GetTokenResponse } from './_types/token/GetTokenResponse';

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

    readonly getTokenByAuthCode = async (authCode: string): Promise<GetTokenResponse> => {
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

