import { Artist } from '../artists';

export type Image = {
    url: string;
    height: number;
    width: number;
};
export type AlbumMetadata = {
    album_group: 'album' | 'single' | 'compilation' | 'appears_on'
    artists: Artist[]
}
export type AlbumContent = {
    id: string;
    name: string;
    release_date: string;
    release_date_precision: 'year' | 'month' | 'day';
    album_type: string;
    total_tracks: number;
    available_markets: string[];
    external_urls: { spotify?: string }[];
    href: string;
    images: Image[];
    restrictions: { reason?: string };
    type: string;
    uri: string;
}
export type Album = AlbumMetadata & AlbumContent;