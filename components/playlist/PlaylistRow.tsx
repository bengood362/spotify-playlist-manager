import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { TableCell, TableRow } from '@mui/material';
import { useCallback } from 'react';

export const PlaylistRow = (props: PlaylistRowProps) => {
    const { playlist, selected, onClick } = props;

    const handleClick = useCallback(() => {
        onClick(playlist);
    }, [onClick, playlist]);

    return (
        <TableRow hover={true} selected={selected} onClick={handleClick} key={`${playlist.type}-${playlist.id}`}>
            <TableCell>
                {playlist.owner.display_name}
            </TableCell>
            <TableCell>
                {playlist.name}
            </TableCell>
        </TableRow>
    );
};

type PlaylistRowProps = {
    playlist: Playlist,
    selected: boolean,
    onClick: (playlist: Playlist) => void;
}