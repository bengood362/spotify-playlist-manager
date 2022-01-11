import { Track } from '../../apis/SpotifyUserApi/_types/tracks/Track';
import { TableCell, TableRow } from '@mui/material';

export const TrackRow = (props: TrackRowProps) => {
    const { index, track, selected, onClick } = props;

    return (
        <TableRow selected={selected} onClick={() => onClick(track)} key={`${track.type}-${track.id}`}>
            <TableCell>
                {index}
            </TableCell>
            <TableCell>
                {track.name}
            </TableCell>
        </TableRow>
    );
};

type TrackRowProps = {
    index: number,
    track: Track,
    selected: boolean,
    onClick: (track: Track) => void;
}