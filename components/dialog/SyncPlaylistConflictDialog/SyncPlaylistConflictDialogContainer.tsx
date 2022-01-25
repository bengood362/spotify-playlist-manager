import axios, { AxiosResponse } from 'axios';
import { useCallback } from 'react';

import { Playlist } from '../../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { Track } from '../../../apis/SpotifyUserApi/_types/tracks/Track';
import { PostTrackBody, PostTrackResponse, PutTrackBody, PutTrackResponse } from '../../../pages/api/spotify/playlists/[pid]/tracks';

import { SyncPlaylistConflictDialogView } from './SyncPlaylistConflictDialogView';

export const SyncPlaylistConflictDialogContainer = (props: SyncPlaylistConflictDialogProps) => {
    const {
        open,
        dismissDialog,
        fromUris,
        toPlaylist,
        toTracks,
        toTrackTotalCount,

        onSuccessAppend,
        onSuccessOverwrite,
        onError,
    } = props;

    const createAppendToPlaylistCallback = (
        playlist: Playlist,
        uris: string[],
        position: number,
    ) => {
        return useCallback(async () => {
            try {
                const response = await axios.post<PostTrackResponse, AxiosResponse<PostTrackResponse>, PostTrackBody>(`/api/spotify/playlists/${playlist.id}/tracks`, { uris, position }, {
                    headers: { 'Content-Type': 'application/json' },
                });

                if (response.status === 201) {
                    onSuccessAppend(response.data);
                } else {
                    throw response.data;
                }
            } catch (err) {
                onError(err);
            } finally {
                dismissDialog();
            }
        }, [playlist, uris, position, onSuccessAppend, onError, dismissDialog]);
    };

    const handleOverwriteButtonClick = useCallback(async () => {
        try {
            const response = await axios.put<PutTrackResponse, AxiosResponse<PutTrackResponse>, PutTrackBody>(`/api/spotify/playlists/${toPlaylist.id}/tracks`, { uris: fromUris, snapshotId: toPlaylist.snapshot_id }, {
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.status === 201) {
                onSuccessOverwrite(response.data);
            } else {
                throw response.data;
            }
        } catch (err) {
            onError(err);
        } finally {
            dismissDialog();
        }
    }, [toPlaylist, fromUris, dismissDialog, onSuccessOverwrite, onError]);

    const handleAppendFromBeginningButtonClick = createAppendToPlaylistCallback(toPlaylist, fromUris, 0);
    const handleAppendToEndButtonClick =  createAppendToPlaylistCallback(toPlaylist, fromUris, toTrackTotalCount);

    const handleCancelButtonClick = useCallback(async () => {
        dismissDialog();
    }, [dismissDialog]);

    return (
        <SyncPlaylistConflictDialogView
            open={open}
            playlist={toPlaylist}
            tracks={toTracks}

            onOverwriteButtonClick={handleOverwriteButtonClick}
            onAppendFromBeginningButtonClick={handleAppendFromBeginningButtonClick}
            onAppendToEndButtonClick={handleAppendToEndButtonClick}
            onCancelButtonClick={handleCancelButtonClick}
        />
    );
};

type SyncPlaylistConflictDialogProps = {
    open: boolean,
    fromUris: string[],
    toPlaylist: Playlist,
    toTracks: Track[],
    toTrackTotalCount: number,

    dismissDialog: () => void,
    onSuccessAppend: (response: PostTrackResponse) => void,
    onSuccessOverwrite: (response: PutTrackResponse) => void,
    onError: (error: unknown) => void,
}
