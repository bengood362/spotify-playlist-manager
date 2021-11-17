import { GetMeResponse } from '../me/GetMeResponse';

type Image = {
    height: number,
    width: number,
    url: string,
}

export type Playlist = {
    collaborative: boolean,
    description: string,
    external_urls: {
        spotify: string,
    },
    href: string,
    id: string,
    images: Image[],
    name: string,
    owner: Pick<GetMeResponse, 'display_name' | 'external_urls' | 'href' | 'id' | 'type' | 'uri'>,
    primary_color: null, // not shown on docs??
    public: boolean,
    snapshot_id: string,
    tracks: {
        href: string,
        total: number,
    },
    type: 'playlist',
    uri: string
}