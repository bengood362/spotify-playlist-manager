import { Playlist } from './Playlist';

// https://developer.spotify.com/documentation/web-api/reference/#/operations/get-list-users-playlists
export type GetPlaylistsResponse = {
    href: string,
    items: Playlist[],
    limit: number,
    next: string | null,
    offset: number,
    previous: string | null,
    total: number
}
