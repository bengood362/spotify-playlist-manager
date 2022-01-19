import { Table, TableContainer, TableBody } from '@mui/material';
import { TrackRow } from './TrackRow';
import { Track } from '../../apis/SpotifyUserApi/_types/tracks/Track';

export const TrackTable = (props: TrackTableProps) => {
    const { tracks, onTrackRowClick } = props;

    const trackRows = tracks.map((track, index) => {
        return (
            <TrackRow
                index={index + 1}
                selected={false}
                key={`${track.type}-${track.id}-${index}`}
                onClick={() => onTrackRowClick(track)}
                track={track}
            />
        );
    });

    return (
        <TableContainer>
            <Table size="small">
                <TableBody>
                    {trackRows}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

type TrackTableProps = {
    tracks: Track[],
    onTrackRowClick: (track: Track) => void,
};