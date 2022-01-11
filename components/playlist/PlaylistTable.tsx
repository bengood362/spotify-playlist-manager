import { Table, TableContainer, TableBody } from '@mui/material';
import { PlaylistRow } from './PlaylistRow';
import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';

export const PlaylistTable = (props: PlaylistTableProps) => {
    const { selectedPlaylist, playlists, onPlaylistRowClick } = props;

    const playlistRows = playlists.map((playlist) => {
        return (
            <PlaylistRow
                selected={selectedPlaylist ? selectedPlaylist.id === playlist.id : false}
                key={`${playlist.type}-${playlist.id}`}
                onClick={() => onPlaylistRowClick(playlist)}
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
    playlists: Playlist[],
    selectedPlaylist: Playlist | null,
    onPlaylistRowClick: (playlist: Playlist) => void,
};