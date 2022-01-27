import React from 'react';

import pageStyles from './index.module.css';

import { PlaylistTable } from '../playlist/PlaylistTable';
import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { PlaylistTableTextHeader } from '../playlist/PlaylistTableTextHeader';

export const SyncTableView = (props: SyncTableViewProps) => {
    const { playlists, selectedPlaylist, handlePlaylistRowClick, handleNewPlaylistButtonClick } = props;

    return (
        <div className={pageStyles.playlistContainer}>
            <PlaylistTableTextHeader
                title={`Sync: ${selectedPlaylist?.name ?? 'playlist'}`}
                onNewPlaylistButtonClick={handleNewPlaylistButtonClick}
            />
            <PlaylistTable
                selectedPlaylist={selectedPlaylist}
                onPlaylistRowClick={handlePlaylistRowClick}
                playlists={playlists}
            />
        </div>
    );
};

type SyncTableViewProps = {
    selectedPlaylist: Playlist | null;
    handlePlaylistRowClick: (playlist: Playlist) => void;
    handleNewPlaylistButtonClick: () => void;
    playlists: Playlist[];
}