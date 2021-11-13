import axios, { AxiosResponse } from 'axios';

export default class SpotifyUserApi {
    // requires user oauth
    constructor(private readonly tokenType: string, private readonly token: string) {}

    // https://developer.spotify.com/documentation/web-api/reference/#/operations/get-current-users-profile
    async getCurrentUserProfile(): Promise<CurrentUserProfileResponse> {
        const apiUrl = 'https://api.spotify.com/v1/me';

        const response = await axios.get<Record<string, never>, AxiosResponse<CurrentUserProfileResponse>>(apiUrl, {
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

type UserProfileImage = {
    url: string,
    height: number,
    width: number,
}
type CurrentUserProfileResponse = {
    'country': string,
    'display_name': string,
    'email': string,
    'explicit_content': {
        'filter_enabled': boolean,
        'filter_locked': boolean
    },
    'external_urls': {
        'spotify': string
    },
    'followers': {
        'href': string,
        'total': number
    },
    'href': string,
    'id': string,
    'images': UserProfileImage[],
    'product': string,
    'type': string,
    'uri': string
  }