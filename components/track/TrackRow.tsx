import { TableCell, TableRow } from '@mui/material';
import { useCallback } from 'react';

import { Track } from '../../apis/SpotifyUserApi/_types/tracks/Track';

export const TrackRow = (props: TrackRowProps) => {
    const { index, track, selected, onClick } = props;

    const handleClick = useCallback(() => {
        onClick(track);
    }, [onClick]);

    return (
        <TableRow selected={selected} onClick={handleClick} key={`${track.type}-${track.id}`}>
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