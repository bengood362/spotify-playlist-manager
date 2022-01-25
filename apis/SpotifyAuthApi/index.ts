import axios, { AxiosResponse, AxiosBasicCredentials } from 'axios';
import { GetTokenParams } from './_types/token/GetTokenParams';
import { IssueTokenByAuthCodeResponse } from './_types/token/IssueTokenByAuthCodeResponse';
import { IssueTokenByRefreshTokenResponse } from './_types/token/IssueTokenByRefreshTokenResponse';

export default class SpotifyAuthApi {
    private readonly apiHost = 'https://accounts.spotify.com';
    private readonly authorization: AxiosBasicCredentials;

    // requires basic client auth
    constructor(
        authorization: AxiosBasicCredentials,
    ) {
        this.authorization = authorization;
    }

    readonly refreshAccessToken = async (refreshToken: string): Promise<IssueTokenByRefreshTokenResponse> => {
        const apiUrl = `${this.apiHost}/api/token`;
        const params = new URLSearchParams();

        params.append('refresh_token', refreshToken);
        params.append('grant_type', 'refresh_token');

        // TODO: authorize
        const response = await axios.post<GetTokenParams, AxiosResponse<IssueTokenByRefreshTokenResponse>>(
            apiUrl,
            params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                auth: this.authorization,
            },
        );

        if (response.status < 200 || response.status >= 300) {
            console.error('[E]SpotifyAuthApi:refreshAccessToken', response.data);

            throw new Error('failed_to_fetch_token');
        }

        return response.data;
    }

    readonly getTokenByAuthCode = async (authCode: string): Promise<IssueTokenByAuthCodeResponse> => {
        const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

        if (!redirectUri) {
            throw new Error('invalid_config');
        }

        const apiUrl = `${this.apiHost}/api/token`;
        const params = new URLSearchParams();

        params.append('code', authCode);
        params.append('redirect_uri', redirectUri);
        params.append('grant_type', 'authorization_code');

        const response = await axios.post<GetTokenParams, AxiosResponse<IssueTokenByAuthCodeResponse>>(
            apiUrl,
            params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                auth: this.authorization,
            },
        );

        if (response.status < 200 || response.status >= 300) {
            console.error('[E]SpotifyAuthApi:getTokenByAuthCode', response.data);

            throw new Error('failed_to_fetch_token');
        }

        return response.data;
    }
}

