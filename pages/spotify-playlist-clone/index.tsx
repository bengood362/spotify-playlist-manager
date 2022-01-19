import axios, { AxiosResponse } from 'axios';
import qs from 'qs';
import React, { useState, useCallback, useEffect } from 'react';
import type { NextPage, NextPageContext } from 'next';
import Head from 'next/head';
import Image from 'next/image';

import SpotifyUserApi from '../../apis/SpotifyUserApi';
import SpotifyAuthApi from '../../apis/SpotifyAuthApi';
import type { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import type { Track } from '../../apis/SpotifyUserApi/_types/tracks/Track';
import type { GetPlaylistsResponse } from '../../apis/SpotifyUserApi/_types/playlists/GetPlaylistsResponse';

import { ISpotifyAuthorizationStore, SpotifyAuthorization, spotifyAuthorizationStore } from '../../stores/SpotifyAuthorizationStore';

import homeStyles from '../../styles/Home.module.css';
import pageStyles from './index.module.css';

import { Button } from '@mui/material';
import { ErrorProps, isErrorProps } from '../../types/ErrorProps';
import { PlaylistTable } from '../../components/playlist/PlaylistTable';
import { TrackTable } from '../../components/track/TrackTable';
import { NewPlaylistDialogContainer } from '../../components/dialog/NewPlaylistDialog/NewPlaylistDialogContainer';

import { useFetchPlaylistItems } from '../../client/hooks/useFetchPlaylistItems';

import { parseAuthorization } from '../../server/request/header/parseAuthorization';
import { parseSessionId } from '../../server/request/header/parseSessionId';
import { fromIssueTokenByRefreshTokenResponse } from '../../server/model/adapter/spotifyAuthorization';
import { PostPlaylistResponse } from '../../apis/SpotifyUserApi/_types/playlists/PostPlaylistResponse';
import { SyncPlaylistConflictDialogContainer } from '../../components/dialog/SyncPlaylistConflictDialog/SyncPlaylistConflictDialogContainer';
import { PostTrackBody, PostTrackResponse, PutTrackResponse } from '../api/spotify/playlists/[pid]/tracks';

const handleAccessTokenExpiredError = (
    sessionId: string,
    authorization: SpotifyAuthorization,
) => async (
    spotifyAuthApi: SpotifyAuthApi,
    spotifyAuthorizationStore: ISpotifyAuthorizationStore,
): Promise<SpotifyAuthorization> => {
    try {
        const tokenResponseData = await spotifyAuthApi.refreshAccessToken(authorization.refreshToken);

        const newAuthorization = {
            ...authorization,
            ...fromIssueTokenByRefreshTokenResponse(tokenResponseData, new Date()),
        };

        await spotifyAuthorizationStore.set(sessionId, newAuthorization);

        return newAuthorization;
    } catch (err) {
        // if for any reason access token doesn't work, destroy the session
        await spotifyAuthorizationStore.del(sessionId);

        throw err;
    }
};

const fetchPageWithRetry = (
    sessionId: string,
    authorization: SpotifyAuthorization,
    retry = 1, lastError: unknown = null,
) => async (
    spotifyAuthorizationStore: ISpotifyAuthorizationStore,
    spotifyAuthApi: SpotifyAuthApi,
    spotifyUserApi: SpotifyUserApi,
): Promise<{ props: SpotifyPlaylistCloneProps }> => {
    if (retry < 0) {
        throw lastError;
    }

    try {
        const currentProfile = await spotifyUserApi.getCurrentUserProfile();
        const getPlaylistsResponse = await spotifyUserApi.getUserPlaylists(currentProfile.id);

        return {
            props: {
                spotifyUserId: currentProfile.id,
                // playlists: getPlaylistsResponse.items.filter((playlist) => playlist.owner.id === currentProfile.id), // TODO: if only get owner userId -> doesn't work for pagination
                playlists: getPlaylistsResponse.items,
                playlistsTotalCount: getPlaylistsResponse.total,
            }, // will be passed to the page component as props
        };
    } catch (err) {
        // TODO: retry-backoff
        console.error('[E]/pages/spotify-playlist-clone:fetchPageWithRetry', err);

        if (err instanceof Error && err.message === 'access_token_expired') {
            const newAuthorization = await handleAccessTokenExpiredError(sessionId, authorization)(spotifyAuthApi, spotifyAuthorizationStore);
            const newSpotifyUserApi = new SpotifyUserApi(newAuthorization.tokenType, newAuthorization.accessToken);

            return await fetchPageWithRetry(sessionId, newAuthorization, retry - 1, err)(spotifyAuthorizationStore, spotifyAuthApi, newSpotifyUserApi);
        }

        return await fetchPageWithRetry(sessionId, authorization, retry - 1, err)(spotifyAuthorizationStore, spotifyAuthApi, spotifyUserApi);
    }
};

export async function getServerSideProps(context: NextPageContext): Promise<{ props: SpotifyPlaylistCloneProps }> {
    try {
        if (
            !process.env.SPOTIFY_CLIENT_ID ||
            !process.env.SPOTIFY_CLIENT_SECRET ||
            !process.env.SPOTIFY_REDIRECT_URI
        ) {
            throw new Error('invalid_config');
        }

        const cookieHeader = context.req?.headers.cookie;

        if (!cookieHeader) {
            console.error('[E]:/spotify-playlist-clone:getServerSideProps:', 'no_cookie');

            throw new Error('not_logged_in');
        }

        const sessionId = parseSessionId(cookieHeader);
        const authorization = await parseAuthorization(cookieHeader);

        if (!authorization || !sessionId) {
            console.error('[E]/spotify-playlist-clone:getServerSideProps:', 'no_authorization');

            throw new Error('not_logged_in');
        }

        const spotifyAuthApi = new SpotifyAuthApi({ username: process.env.SPOTIFY_CLIENT_ID, password: process.env.SPOTIFY_CLIENT_SECRET });
        const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);

        return await fetchPageWithRetry(sessionId, authorization, 1, null)(spotifyAuthorizationStore, spotifyAuthApi, spotifyUserApi);
    } catch (err) {
        // TODO: redirect to authorize for not_logged_in
        console.error('[E]/pages/spotify-playlist-clone:getServerSideProps', err);

        if (err instanceof Error) {
            return {
                props: {
                    error: err.message,
                },
            };
        }

        return {
            props: {
                error: 'internal',
            }, // will be passed to the page component as props
        };
    }
}

const Home: NextPage<SpotifyPlaylistCloneProps> = (props: SpotifyPlaylistCloneProps) => {
    const [shouldShowNewPlaylistDialog, setShouldShowNewPlaylistDialog] = useState(false);
    const [shouldShowConflictResolutionDialog, setShouldShowConflictResolutionDialog] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    const [selectedFromPlaylist, setSelectedFromPlaylist] = useState<Playlist | null>(null);
    const [selectedToPlaylist, setSelectedToPlaylist] = useState<Playlist | null>(null);
    const [fromTracks, fromTracksTotalCount, handleFromTracksNextPageButtonClick] = useFetchPlaylistItems(selectedFromPlaylist)
    const [toTracks, toTracksTotalCount, handleToTracksNextPageButtonClick] = useFetchPlaylistItems(selectedToPlaylist)


    useEffect(() => {
        if(isErrorProps(props)){
            return;
        }

        setPlaylists(props.playlists);
    }, [setPlaylists]);

    const handleSyncPlaylistError = useCallback((err: unknown) => {
        console.error('[E]/pages/spotify-playlist-clone:handleSyncPlaylistError', err);
    }, []);
    const handleAppendPlaylistItemsSuccessful = useCallback((_response: PostTrackResponse) => {
        console.log('[I]/pages/spotify-playlist-clone:handleAppendPlaylistItemsSuccessful');
    }, []);
    const handleOverwritePlaylistItemsSuccessful = useCallback((_response: PutTrackResponse) => {
        console.log('[I]/pages/spotify-playlist-clone:handleOverwritePlaylistItemsSuccessful');
    }, []);

    const handleCreateNewPlaylistSuccess = useCallback((result: PostPlaylistResponse) => {
        console.log('[I]/pages/spotify-playlist-clone:handleCreateNewPlaylistSuccess', result);

        setPlaylists([result, ...playlists]);
    }, [playlists, setPlaylists]);
    const handleCreateNewPlaylistError = useCallback((err: unknown) => {
        console.error('[E]/pages/spotify-playlist-clone:handleCreateNewPlaylistError', err);
    }, []);
    const handleDismissNewPlaylistDialog = useCallback(() => {
        setShouldShowNewPlaylistDialog(false);
    }, [setShouldShowNewPlaylistDialog]);
    const handleDismissSyncPlaylistConflictDialog = useCallback(() => {
        setShouldShowConflictResolutionDialog(false);
    }, [setShouldShowConflictResolutionDialog]);

    const handleFromPlaylistRowClick = useCallback(async (playlist: Playlist) => {
        console.log('[I]/pages/spotify-playlist-clone:handleFromPlaylistRowClick', playlist)

        if (playlist === selectedFromPlaylist) {
            setSelectedFromPlaylist(null);
        } else {
            setSelectedFromPlaylist(playlist);
        }
    }, [selectedFromPlaylist, setSelectedFromPlaylist]);

    const handleToPlaylistRowClick = useCallback(async (playlist: Playlist) => {
        console.log('[I]/pages/spotify-playlist-clone:handleToPlaylistRowClick', playlist)

        if (playlist === selectedToPlaylist) {
            setSelectedToPlaylist(null);
        } else {
            setSelectedToPlaylist(playlist);
        }
    }, [selectedToPlaylist, setSelectedToPlaylist]);

    const handleTrackRowClick = useCallback((track: Track) => {
        console.log('[I]/pages/spotify-playlist-clone:handleTrackRowClick:track', track);
    }, []);

    const handleNewPlaylistButtonClick = useCallback(() => {
        console.log('[I]/pages/spotify-playlist-clone:handleNewPlaylistButtonClick');

        setShouldShowNewPlaylistDialog(true);
    }, [setShouldShowNewPlaylistDialog]);

    const handlePlaylistNextPageButtonClick = useCallback(async () => {
        console.log('[I]/pages/spotify-playlist-clone:handlePlaylistNextPageButtonClick');

        const querystring = qs.stringify({
            offset: playlists.length,
        })

        const getPlaylistsResponse = await axios.get<GetPlaylistsResponse>(`/api/spotify/playlists?${querystring}`);

        if (getPlaylistsResponse.status === 200) {
            setPlaylists([...playlists, ...getPlaylistsResponse.data.items]);
        }
    }, [playlists, setPlaylists]);

    const handleSyncButtonClick = useCallback(async () => {
        console.log('[I]/pages/spotify-playlist-clone:handleSyncButtonClick');

        if (selectedFromPlaylist === null || selectedToPlaylist === null) {
            return;
        }

        if (toTracks.length > 0) {
            // TODO: show dialog for append/ overwrite/ cancel
            setShouldShowConflictResolutionDialog(true);
        } else {
            const uris = fromTracks.map(({ uri }) => uri);

            const response = await axios.post<PostTrackResponse, AxiosResponse<PostTrackResponse>, PostTrackBody>(`/api/spotify/playlists/${selectedToPlaylist.id}/tracks`, { uris, position: 0 }, {
                headers: { 'Content-Type': 'application/json' },
            })

            if (response.status !== 201) {
                throw response.data;
            }

            return response.data;
        }

    }, [selectedFromPlaylist, selectedToPlaylist, setShouldShowConflictResolutionDialog, fromTracks, toTracks]);

    if (isErrorProps(props)) {
        return <pre>{props.error}</pre>;
    }

    const {
        spotifyUserId,
        playlistsTotalCount,
    } = props;

    return (
        <div className={homeStyles.container}>
            <Head>
                <title>Main</title>
                <meta name="description" content="Generated by create next app" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={homeStyles.main}>
                <h3>
                    Hello {spotifyUserId}
                </h3>
                <div className={pageStyles.playlistSection}>
                    <div className={pageStyles.playlistTableSection}>
                        <div className={pageStyles.playlistContainer}>
                            <h4>
                                From playlist
                            </h4>
                            <PlaylistTable
                                selectedPlaylist={selectedFromPlaylist}
                                onPlaylistRowClick={handleFromPlaylistRowClick}
                                playlists={playlists}
                            />
                        </div>

                        <div className={pageStyles.verticalDivider} />

                        <div className={pageStyles.playlistContainer}>
                            <div className={pageStyles.playlistTitleContainer}>
                                <h4>
                                    To playlist
                                </h4>
                                <Button size="small" sx={{ marginLeft: 'auto'}} onClick={handleNewPlaylistButtonClick}>
                                    +
                                </Button>
                            </div>
                            <PlaylistTable
                                selectedPlaylist={selectedToPlaylist}
                                onPlaylistRowClick={handleToPlaylistRowClick}
                                playlists={playlists}
                            />
                        </div>
                    </div>


                    {playlists.length < playlistsTotalCount ? (
                        <React.Fragment>
                            <div className={pageStyles.horizontalDivider} />

                            <Button onClick={handlePlaylistNextPageButtonClick}>
                                more playlists
                            </Button>
                        </React.Fragment>
                    ) : null}
                </div>

                <div className={pageStyles.horizontalDivider} />

                {/* TODO: merge two table to achieve same height */}
                <div className={pageStyles.trackTableSection}>
                    <div className={pageStyles.trackTableContainer}>
                        <TrackTable
                            tracks={selectedFromPlaylist === null ? [] : fromTracks}
                            onTrackRowClick={handleTrackRowClick}
                        />

                        {selectedFromPlaylist !== null && fromTracks.length < fromTracksTotalCount ? (
                            <React.Fragment>
                                <div className={pageStyles.horizontalDivider} />

                                <Button onClick={handleFromTracksNextPageButtonClick}>
                                    more tracks
                                </Button>
                            </React.Fragment>
                        ) : null}
                    </div>

                    <div className={pageStyles.verticalDivider} />

                    <div className={pageStyles.trackTableContainer}>
                        <TrackTable
                            tracks={selectedToPlaylist === null ? [] : toTracks}
                            onTrackRowClick={handleTrackRowClick}
                        />

                        {selectedToPlaylist !== null && toTracks.length < toTracksTotalCount ? (
                            <React.Fragment>
                                <div className={pageStyles.horizontalDivider} />

                                <Button onClick={handleToTracksNextPageButtonClick}>
                                    more tracks
                                </Button>
                            </React.Fragment>
                        ) : null}
                    </div>
                </div>

                <div className={pageStyles.actionButtonSection}>
                    <Button
                        disabled={selectedFromPlaylist === null || selectedToPlaylist === null}
                        variant="contained"
                        size="medium"
                        onClick={handleSyncButtonClick}
                    >
                        Sync
                    </Button>
                </div>

                <NewPlaylistDialogContainer
                    open={shouldShowNewPlaylistDialog}
                    dismissDialog={handleDismissNewPlaylistDialog}

                    onSuccess={handleCreateNewPlaylistSuccess}
                    onError={handleCreateNewPlaylistError}
                />

                {selectedToPlaylist !== null ? (
                    <SyncPlaylistConflictDialogContainer
                        open={selectedToPlaylist && shouldShowConflictResolutionDialog}
                        dismissDialog={handleDismissSyncPlaylistConflictDialog}
                        // TODO: improve fromUris by putting fromPlaylist
                        fromUris={fromTracks.map(({ uri }) => (uri))}
                        toPlaylist={selectedToPlaylist}
                        toTracks={toTracks}
                        toTrackTotalCount={toTracksTotalCount}

                        onError={handleSyncPlaylistError}
                        onSuccessAppend={handleAppendPlaylistItemsSuccessful}
                        onSuccessOverwrite={handleOverwritePlaylistItemsSuccessful}
                    />
                ) : null}
            </main>

            <footer className={homeStyles.footer}>
                <a
                    href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Powered by{' '}
                    <span className={homeStyles.logo}>
                        <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
                    </span>
                </a>
            </footer>
        </div>
    );
};

export default Home;

type SpotifyPlaylistCloneProps = ErrorProps | {
    spotifyUserId: string;
    playlists: Playlist[];
    playlistsTotalCount: number,
}