import { Album } from '../albums/Album';
import { Artist } from '../artists/Artist';

export type Track = {
    album: Album,
    artists: Artist[],
    disc_number: number,
    duration_ms: number,
    episode: boolean,
    explicit: boolean,
    external_ids: {isrc: string},
    external_urls: {spotify: string},
    href: string,
    id: string,
    is_local: boolean,
    is_playable: boolean,
    name: string,
    popularity: number,
    preview_url: string,
    track: true,
    track_number: number,
    type: 'track',
    uri: string,
};