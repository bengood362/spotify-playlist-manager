import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { Track } from '../../apis/SpotifyUserApi/_types/tracks/Track';

import { TrackTable } from '../track/TrackTable';
import { Button } from '@mui/material';
import { StandardHorizontalDivider } from '../HorizontalDivider/StandardHorizontalDivider';

export const PlaylistDetailsView = (props: PlaylistDetailsViewProps) => {
    const {
        playlist,
        tracks,
        hasNext,
        onTracksNextPageButtonClick,
        onTrackRowClick,
    } = props;

    return (
        <div>
            <h4>
                Playlist: {playlist.name}
            </h4>
            <p>
                {playlist.description}
            </p>
            <TrackTable
                tracks={tracks}
                onTrackRowClick={onTrackRowClick}
            />
            {hasNext ? (
                <>
                    <StandardHorizontalDivider />

                    <Button onClick={onTracksNextPageButtonClick}>
                        more tracks
                    </Button>
                </>
            ) : null}
        </div>
    );
};

type PlaylistDetailsViewProps = {
    playlist: Playlist;
    tracks: Track[];
    hasNext: boolean;
    onTracksNextPageButtonClick: () => void;
    onTrackRowClick: (track: Track) => void;
}