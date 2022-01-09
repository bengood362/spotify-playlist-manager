import { Track } from './Track';

// https://developer.spotify.com/documentation/web-api/reference/#/operations/get-list-users-playlists
export type GetPlaylistTracksResponse = {
    href: string,
    items: Track[],
    limit: number,
    next: string | null,
    offset: number,
    previous: string | null,
    total: number,
}
