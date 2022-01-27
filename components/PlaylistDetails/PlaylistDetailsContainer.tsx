import { useCallback } from 'react';

import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { Track } from '../../apis/SpotifyUserApi/_types/tracks/Track';

import { PlaylistDetailsView } from './PlaylistDetailsView';

import { useFetchPlaylistItems } from '../../client/hooks/useFetchPlaylistItems';

export const PlaylistDetailsContainer = (props: PlaylistDetailsContainer) => {
    const { playlist } = props;
    const [tracks, tracksTotalCount, handleTracksNextPageButtonClick] = useFetchPlaylistItems(playlist);

    const hasNext = tracks.length < tracksTotalCount;

    const handleTrackRowClick = useCallback((track: Track) => {
        console.log('[I]PlaylistDetailsContainer:handleTrackRowClick:track', track);
    }, []);

    return (
        <PlaylistDetailsView
            playlist={playlist}
            tracks={tracks}
            hasNext={hasNext}
            onTracksNextPageButtonClick={handleTracksNextPageButtonClick}
            onTrackRowClick={handleTrackRowClick}
        />
    );
};

export type PlaylistDetailsContainer = {
    playlist: Playlist;
}