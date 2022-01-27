import { useState, useCallback, useEffect } from 'react';
import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';

import { SyncTableView } from './SyncTableView';
import { NewPlaylistDialogContainer } from '../dialog/NewPlaylistDialog/NewPlaylistDialogContainer';

import { PostPlaylistResponse } from '../../apis/SpotifyUserApi/_types/playlists/PostPlaylistResponse';

export const SyncTableContainer = (props: SyncTableContainerProps) => {
    const { playlists, onCreateNewPlaylistSuccess, onPlaylistSelected } = props;

    const [shouldShowNewPlaylistDialog, setShouldShowNewPlaylistDialog] = useState(false);
    const [selectedToPlaylist, setSelectedToPlaylist] = useState<Playlist | null>(null);

    useEffect(() => {
        onPlaylistSelected(selectedToPlaylist);
    }, [onPlaylistSelected, selectedToPlaylist]);

    const handlePlaylistRowClick = useCallback(async (playlist: Playlist) => {
        console.log('[I]SyncTableContainer:handleToPlaylistRowClick', playlist);

        if (playlist === selectedToPlaylist) {
            setSelectedToPlaylist(null);
        } else {
            setSelectedToPlaylist(playlist);
        }
    }, [selectedToPlaylist, setSelectedToPlaylist]);

    const handleNewPlaylistButtonClick = useCallback(() => {
        console.log('[I]SyncTableContainer:handleNewPlaylistButtonClick');

        setShouldShowNewPlaylistDialog(true);
    }, [setShouldShowNewPlaylistDialog]);

    const handleDismissNewPlaylistDialog = useCallback(() => {
        setShouldShowNewPlaylistDialog(false);
    }, [setShouldShowNewPlaylistDialog]);

    const handleCreateNewPlaylistSuccess = useCallback((result: PostPlaylistResponse) => {
        console.log('[I]SyncTableContainer:handleCreateNewPlaylistSuccess', result);

        onCreateNewPlaylistSuccess(result);
    }, [onCreateNewPlaylistSuccess]);

    const handleCreateNewPlaylistError = useCallback((err: unknown) => {
        console.error('[E]SyncTableContainer:handleCreateNewPlaylistError', err);
    }, []);

    return (
        <>
            <SyncTableView
                selectedPlaylist={selectedToPlaylist}
                handleNewPlaylistButtonClick={handleNewPlaylistButtonClick}
                handlePlaylistRowClick={handlePlaylistRowClick}
                playlists={playlists}
            />
            <NewPlaylistDialogContainer
                open={shouldShowNewPlaylistDialog}
                dismissDialog={handleDismissNewPlaylistDialog}

                onSuccess={handleCreateNewPlaylistSuccess}
                onError={handleCreateNewPlaylistError}
            />
        </>
    );
};

type SyncTableContainerProps = {
    playlists: Playlist[];
    onPlaylistSelected: (playlist: Playlist | null) => void;
    onCreateNewPlaylistSuccess: (playlist: Playlist) => void;
}