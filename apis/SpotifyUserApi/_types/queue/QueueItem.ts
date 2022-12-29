import { Album } from '../albums';
import { Artist } from '../artists';

export interface QueueItem {
    album: Album;
    artists: Artist[];

    duration_ms: number;
    /**
     * @property {boolean} explicit
     * Whether or not the track has explicit lyrics ( true = yes it does; false = no it does not OR unknown).
     * */
    explicit: boolean;

    name: string;
    is_playable: boolean;
}