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
    constructor(private readonly tokenType: string, private readonly token: string) {}

    // https://developer.spotify.com/documentation/web-api/reference/#/operations/get-current-users-profile
    readonly getCurrentUserProfile = async (): Promise<GetMeResponse> => {
        const apiUrl = 'https://api.spotify.com/v1/me';

        const response = await axios.get<GetMeParams, AxiosResponse<GetMeResponse>>(apiUrl, {
            headers: {
                Authorization: `${this.tokenType} ${this.token}`,
            },
        });

        if (response.status < 200 || response.status >= 300) {
            console.log('[E]SpotifyUserApi:getCurrentUserProfile', response.data);

            throw new Error('failed_to_fetch_token');
        }

        return response.data;
    }

    readonly getUserPlaylists = async (userId: string, limit: number, offset = 0): Promise<GetPlaylistsResponse> => {
        const queryString = qs.stringify({
            limit,
            offset,
        });
        const apiUrl = `https://api.spotify.com/v1/users/${userId}/playlists?${queryString}`;

        const response = await axios.get<GetPlaylistsParams, AxiosResponse<GetPlaylistsResponse>>(apiUrl, {
            headers: {
                Authorization: `${this.tokenType} ${this.token}`,
            },
        });

        if (response.status < 200 || response.status >= 300) {
            console.log('[E]SpotifyUserApi:getCurrentUserProfile', response.data);

            throw new Error('failed_to_fetch_token');
        }

        return response.data;
    }

    readonly getPlaylistItems = async (playlistId: string, offset = 0): Promise<GetPlaylistTracksResponse> => {
        const params: Partial<GetPlaylistTracksParams> = {
            additional_types: 'track',
            limit: 50,
            offset: offset,
            market: 'HK',
            fields: 'items(track(name,href,album(name,href)))',
        };
        const queryString = qs.stringify(params);
        const apiUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?${queryString}`;

        const response = await axios.get<GetPlaylistTracksParams, AxiosResponse<GetPlaylistTracksResponse>>(apiUrl, {
            headers: {
                Authorization: `${this.tokenType} ${this.token}`,
            },
        });

        if (response.status < 200 || response.status >= 300) {
            console.log('[E]SpotifyUserApi:getPlaylistItems', response.data);

            throw new Error('failed_to_fetch_playlist_items');
        }

        return response.data;
    }
}
