import R from 'ramda';
import axios, { AxiosResponse } from 'axios';
import qs from 'qs';
import { GetMeParams } from './_types/me/GetMeParams';
import { GetMeResponse } from './_types/me/GetMeResponse';
import { GetPlaylistsParams } from './_types/playlists/GetPlaylistsParams';
import { GetPlaylistsResponse } from './_types/playlists/GetPlaylistsResponse';
import { GetPlaylistTracksParams } from './_types/tracks/GetPlaylistTracksParams';
import { GetPlaylistTracksResponse } from './_types/tracks/GetPlaylistTracksResponse';

export default class SpotifyUserApi {
    // requires user oauth
    constructor(
        private tokenType: string,
        private accessToken: string,
    ) {}

    refreshTokenRetryExceptionFilter = <P extends any[], R, F extends (...args: P) => PromiseLike<R>>(func: F) => async (...args: Parameters<F>): Promise<ReturnType<F>> => {
        try {
            return await func(...args);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const authHeader = err.response?.headers['www-authenticate'];

                // Bearer realm="spotify", error="invalid_token", error_description="The access token expired"
                if (authHeader) {
                    const pairs = authHeader.split(', ').map((kv): [string, string] => {
                        const kvComponent = kv.split('=');
                        const [key, value] = kvComponent;

                        return [key, value];
                    });
                    const authHeaderObj = R.fromPairs(pairs);

                    if (/The access token expired/.test(authHeaderObj['error_description'])) {
                        throw new Error('access_token_expired');
                    }
                }
            }

            throw err;
        }
    }

    // https://developer.spotify.com/documentation/web-api/reference/#/operations/get-current-users-profile
    readonly getCurrentUserProfile = this.refreshTokenRetryExceptionFilter(async (): Promise<GetMeResponse> => {
        const apiUrl = 'https://api.spotify.com/v1/me';

        const response = await axios.get<GetMeParams, AxiosResponse<GetMeResponse>>(apiUrl, {
            headers: {
                Authorization: `${this.tokenType} ${this.accessToken}`,
            },
        });

        if (response.status !== 200) {
            console.error('[E]SpotifyUserApi:getCurrentUserProfile', response.data);

            throw new Error('failed_to_fetch_token');
        }

        return response.data;
    })

    readonly getUserPlaylists = this.refreshTokenRetryExceptionFilter(async (
        userId: string,
        limit = 50,
        offset = 0,
    ): Promise<GetPlaylistsResponse> => {
        const queryString = qs.stringify({
            limit,
            offset,
        });
        const apiUrl = `https://api.spotify.com/v1/users/${userId}/playlists?${queryString}`;

        const response = await axios.get<GetPlaylistsParams, AxiosResponse<GetPlaylistsResponse>>(apiUrl, {
            headers: {
                Authorization: `${this.tokenType} ${this.accessToken}`,
            },
        });

        if (response.status !== 200) {
            console.error('[E]SpotifyUserApi:getUserPlaylists', response.data);

            throw new Error('failed_to_fetch_user_playlists');
        }

        return response.data;
    });

    readonly getPlaylist = this.refreshTokenRetryExceptionFilter(async (
        playlistId: string,
    ): Promise<GetPlaylistsResponse> => {
        const apiUrl = `https://api.spotify.com/v1/playlists/${playlistId}`;

        const response = await axios.get<GetPlaylistsParams, AxiosResponse<GetPlaylistsResponse>>(apiUrl, {
            headers: {
                Authorization: `${this.tokenType} ${this.accessToken}`,
            },
        });

        if (response.status !== 200) {
            console.error('[E]SpotifyUserApi:getUserPlaylists', response.data);

            throw new Error('failed_to_fetch_user_playlists');
        }

        return response.data;
    });

    readonly getPlaylistItems = this.refreshTokenRetryExceptionFilter(async (
        playlistId: string,
        limit = 5,
        offset = 0,
    ): Promise<GetPlaylistTracksResponse> => {
        const params: Partial<GetPlaylistTracksParams> = {
            additional_types: 'track',
            limit: limit,
            offset: offset,
            market: 'HK',
        };
        const queryString = qs.stringify(params);
        const apiUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?${queryString}`;

        const response = await axios.get<GetPlaylistTracksParams, AxiosResponse<GetPlaylistTracksResponse>>(apiUrl, {
            headers: {
                Authorization: `${this.tokenType} ${this.accessToken}`,
            },
        });

        if (response.status !== 200) {
            console.error('[E]SpotifyUserApi:getPlaylistItems', response.data);

            throw new Error('failed_to_fetch_playlist_items');
        }

        return response.data;
    })
}
