// https://developer.spotify.com/documentation/web-api/reference/#/operations/remove-tracks-playlist

import { Track } from '../../tracks/Track';

export type DeletePlaylistItemsBody = {
    /**
     * @property {string[]} uris
     * An array of objects containing Spotify URIs of the tracks or episodes to remove. For example: { "tracks": [{ "uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh" },{ "uri": "spotify:track:1301WleyT98MSxVHPZCA6M" }] }. A maximum of 100 objects can be sent at once.
     * NOTE: positions is 0-based index, that is reverse-engineering from spotify web frontend: {uri: "spotify:track:0iFGdFbrDDJw5FBImSAEUy", positions: [2]}
     * */
    tracks: (Pick<Track, 'uri'> & { positions?: number[] })[],

    /**
     * @property {string} [snapshot_id]
     * The playlist's snapshot ID against which you want to make the changes. The API will validate that the specified items exist and in the specified positions and make the changes, even if more recent changes have been made to the playlist.
     * */
    snapshot_id?: string,
};