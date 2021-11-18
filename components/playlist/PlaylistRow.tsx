import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { TableCell, TableRow } from '@mui/material';

export const PlaylistRow = (props: PlaylistRowProps) => {
    const { playlist } = props;

    return (
        <TableRow key={`${playlist.type}-${playlist.id}`}>
            <TableCell>
                {playlist.name}
            </TableCell>
        </TableRow>
    );
};

type PlaylistRowProps = {
    playlist: Playlist,
}