import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { Chip, TableCell, TableRow } from '@mui/material';
import { useCallback } from 'react';

export const PlaylistRow = (props: PlaylistRowProps) => {
    const { index, disabled, playlist, selected, onClick } = props;

    const handleClick = useCallback(() => {
        if (!disabled) {
            onClick(playlist);
        }
    }, [onClick, playlist]);

    return (
        <TableRow
            sx={disabled ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
            hover={!disabled} selected={selected}
            onClick={handleClick}
        >
            <TableCell>
                {index}
            </TableCell>
            <TableCell>
                {playlist.owner.display_name}
            </TableCell>
            <TableCell>
                {playlist.name}
                {playlist.public ? null : (
                    <Chip sx={{ marginLeft: 1, fontStyle: 'italic' }} size="small" label="private" />
                )}
                {playlist.collaborative ? (
                    <Chip sx={{ marginLeft: 1, fontStyle: 'italic'  }} size="small" label="collaborative" />
                ) : null}
            </TableCell>
        </TableRow>
    );
};

type PlaylistRowProps = {
    index: number,
    disabled: boolean,
    playlist: Playlist,
    selected: boolean,
    onClick: (playlist: Playlist) => void;
}