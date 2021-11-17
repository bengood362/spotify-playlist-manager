import axios, { AxiosResponse } from 'axios';
import { GetMeParams } from './_types/me/GetMeParams';
import { GetMeResponse } from './_types/me/GetMeResponse';
import { GetPlaylistsParams } from './_types/playlists/GetPlaylistsParams';
import { GetPlaylistsResponse } from './_types/playlists/GetPlaylistsResponse';

export default class SpotifyUserApi {
    // requires user oauth
    constructor(private readonly tokenType: string, private readonly token: string) {}

    // https://developer.spotify.com/documentation/web-api/reference/#/operations/get-current-users-profile
    async getCurrentUserProfile(): Promise<GetMeResponse> {
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

    // TODO: pagination all
    async getUserPlaylists(userId: string): Promise<GetPlaylistsResponse> {
        const apiUrl = `https://api.spotify.com/v1/users/${userId}/playlists`;

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
}