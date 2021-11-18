import { Table, TableContainer, TableBody } from '@mui/material';
import { PlaylistRow } from './PlaylistRow';
import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';

export const PlaylistTable = (props: PlaylistTableProps) => {
    const playlistRows = props.playlists.map((playlist) => {
        return (
            <PlaylistRow
                key={`${playlist.type}-${playlist.id}`}
                playlist={playlist}
            />
        );
    });

    return (
        <TableContainer>
            <Table size="small">
                <TableBody>
                    {playlistRows}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

type PlaylistTableProps = {
    playlists: Playlist[]
};