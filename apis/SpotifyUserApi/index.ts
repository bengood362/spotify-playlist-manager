import * as R from 'ramda';
import axios, { AxiosResponse } from 'axios';
import qs from 'qs';
import { GetMeParams, GetMeResponse } from './_types/me';
import {
    PostPlaylistBody,
    PostPlaylistResponse,
    GetPlaylistsParams,
    GetPlaylistsResponse,
    GetPlaylistParams,
    GetPlaylistResponse,
} from './_types/playlists';

import { GetPlaylistTracksParams, GetPlaylistTracksResponse } from './_types/tracks';

import {
    AddPlaylistItemsBody,
    AddPlaylistItemsResponse,
    DeletePlaylistItemsBody,
    DeletePlaylistItemsResponse,
} from './_types/playlists/tracks';

// TODO: forward axios http error
// TODO: access token expiration - retry by apiClient
export default class SpotifyUserApi {
    // requires user oauth
    constructor(
        private tokenType: string,
        private accessToken: string,
    ) {}

    invalidAccessTokenExceptionFilter = <P extends any[], R, F extends (...args: P) => PromiseLike<R>>(func: F) => async (...args: Parameters<F>): Promise<ReturnType<F>> => {
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

    readonly createPlaylist = this.invalidAccessTokenExceptionFilter(async (
        userId: string,
        playlistConfiguration: PostPlaylistBody,
    ): Promise<PostPlaylistResponse> => {
        const apiUrl = `https://api.spotify.com/v1/users/${userId}/playlists`;

        const response = await axios.post<PostPlaylistResponse, AxiosResponse<PostPlaylistResponse>, PostPlaylistBody>(apiUrl, playlistConfiguration, {
            headers: {
                Authorization: `${this.tokenType} ${this.accessToken}`,
            },
        });

        if (response.status !== 201) {
            console.error('[E]SpotifyUserApi:createPlaylist', response.data);

            throw new Error('failed_to_create_playlist');
        }

        return response.data;
    })

    readonly addItemsToPlaylist = this.invalidAccessTokenExceptionFilter(async (
        playlistId: string,
        playlistItemDescriptor: AddPlaylistItemsBody,
    ): Promise<AddPlaylistItemsResponse> => {
        const apiUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

        const response = await axios.post<AddPlaylistItemsResponse, AxiosResponse<AddPlaylistItemsResponse>, AddPlaylistItemsBody>(apiUrl, playlistItemDescriptor, {
            headers: {
                Authorization: `${this.tokenType} ${this.accessToken}`,
            },
        });

        if (response.status !== 201) {
            console.error('[E]SpotifyUserApi:addItemsToPlaylist', response.data);

            throw new Error('failed_to_add_items_to_playlist');
        }

        return response.data;
    })

    readonly deletePlaylistItems = this.invalidAccessTokenExceptionFilter(async (
        playlistId: string,
        playlistItemDescriptor: DeletePlaylistItemsBody,
    ): Promise<DeletePlaylistItemsResponse> => {
        const apiUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

        const response = await axios.delete<DeletePlaylistItemsResponse, AxiosResponse<DeletePlaylistItemsResponse>, DeletePlaylistItemsBody>(
            apiUrl,
            {
                data: playlistItemDescriptor,
                headers: {
                    Authorization: `${this.tokenType} ${this.accessToken}`,
                },
            },
        );

        if (response.status !== 200) {
            console.error('[E]SpotifyUserApi:deletePlaylistItems', response.data);

            throw new Error('failed_to_delete_items_from_playlist');
        }

        return response.data;
    })

    // https://developer.spotify.com/documentation/web-api/reference/#/operations/get-current-users-profile
    readonly getCurrentUserProfile = this.invalidAccessTokenExceptionFilter(async (): Promise<GetMeResponse> => {
        const apiUrl = 'https://api.spotify.com/v1/me';

        const response = await axios.get<GetMeParams, AxiosResponse<GetMeResponse>>(apiUrl, {
            headers: {
                Authorization: `${this.tokenType} ${this.accessToken}`,
            },
        });

        if (response.status !== 200) {
            console.error('[E]SpotifyUserApi:getCurrentUserProfile', response.data);

            throw new Error('failed_to_fetch_user_profile');
        }

        return response.data;
    })

    readonly getUserPlaylists = this.invalidAccessTokenExceptionFilter(async (
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

    readonly getPlaylist = this.invalidAccessTokenExceptionFilter(async (
        playlistId: string,
    ): Promise<GetPlaylistResponse> => {
        const apiUrl = `https://api.spotify.com/v1/playlists/${playlistId}`;

        const response = await axios.get<GetPlaylistParams, AxiosResponse<GetPlaylistResponse>>(apiUrl, {
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

    readonly getPlaylistItems = this.invalidAccessTokenExceptionFilter(async (
        playlistId: string,
        limit = 50,
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
