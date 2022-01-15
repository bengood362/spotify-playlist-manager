import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { TableCell, TableRow } from '@mui/material';

export const PlaylistRow = (props: PlaylistRowProps) => {
    const { playlist, selected, onClick } = props;

    return (
        <TableRow hover={true} selected={selected} onClick={() => onClick(playlist)} key={`${playlist.type}-${playlist.id}`}>
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