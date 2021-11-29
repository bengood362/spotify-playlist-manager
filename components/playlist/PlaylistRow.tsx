import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { TableCell, TableRow } from '@mui/material';

export const PlaylistRow = (props: PlaylistRowProps) => {
    const { playlist, selected, onClick } = props;

    return (
        <TableRow selected={selected} onClick={() => onClick(playlist)} key={`${playlist.type}-${playlist.id}`}>
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