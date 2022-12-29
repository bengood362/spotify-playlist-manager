import axios, { AxiosResponse } from 'axios';
import * as R from 'ramda';
import qs from 'qs';
import React, { useState, useCallback, useEffect } from 'react';
import type { NextPage, NextPageContext } from 'next';
import Head from 'next/head';
import Image from 'next/image';

import SpotifyUserApi from '../../apis/SpotifyUserApi';
import SpotifyAuthApi from '../../apis/SpotifyAuthApi';
import type { Track } from '../../apis/SpotifyUserApi/_types/tracks';
import type { PostPlaylistResponse, GetPlaylistResponse, GetPlaylistsResponse, Playlist } from '../../apis/SpotifyUserApi/_types/playlists';
import { PostTrackBody, PostTrackResponse, PutTrackResponse } from '../api/spotify/playlists/[pid]/tracks';

import { ISpotifyAuthorizationStore, SpotifyAuthorization, spotifyAuthorizationStore } from '../../stores/SpotifyAuthorizationStore';

import homeStyles from '../../styles/Home.module.css';
import pageStyles from './index.module.css';

import { Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { PlaylistTable } from '../../components/playlist/PlaylistTable';
import { TrackTable } from '../../components/track/TrackTable';
import { NewPlaylistDialogContainer } from '../../components/dialog/NewPlaylistDialog/NewPlaylistDialogContainer';
import { SyncTableContainer } from '../../components/SyncTable/SyncTableContainer';
import { SyncPlaylistConflictDialogContainer } from '../../components/dialog/SyncPlaylistConflictDialog/SyncPlaylistConflictDialogContainer';
import { PlaylistTableTextHeader } from '../../components/playlist/PlaylistTableTextHeader';
import { PlaylistDetailsContainer } from '../../components/PlaylistDetails/PlaylistDetailsContainer';
import { StandardHorizontalDivider } from '../../components/HorizontalDivider/StandardHorizontalDivider';

import { useFetchPlaylistItems } from '../../client/hooks/useFetchPlaylistItems';

import { parseAuthorization } from '../../server/request/header/parseAuthorization';
import { fromIssueTokenByRefreshTokenResponse } from '../../server/model/adapter/spotifyAuthorization';
import { parseSessionId } from '../../server/request/header/parseSessionId';
import { ErrorProps, isErrorProps } from '../../types/ErrorProps';

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
): Promise<{ props: SpotifyPlaylistManagerProps }> => {
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
        console.error('[E]/pages/spotify-playlist-manager:fetchPageWithRetry', err);

        if (err instanceof Error && err.message === 'access_token_expired') {
            const newAuthorization = await handleAccessTokenExpiredError(sessionId, authorization)(spotifyAuthApi, spotifyAuthorizationStore);
            const newSpotifyUserApi = new SpotifyUserApi(newAuthorization.tokenType, newAuthorization.accessToken);

            return await fetchPageWithRetry(sessionId, newAuthorization, retry - 1, err)(spotifyAuthorizationStore, spotifyAuthApi, newSpotifyUserApi);
        }

        return await fetchPageWithRetry(sessionId, authorization, retry - 1, err)(spotifyAuthorizationStore, spotifyAuthApi, spotifyUserApi);
    }
};

export async function getServerSideProps(context: NextPageContext): Promise<{ props: SpotifyPlaylistManagerProps }> {
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
            console.error('[E]:/spotify-playlist-manager:getServerSideProps:', 'no_cookie');

            throw new Error('not_logged_in');
        }

        const sessionId = parseSessionId(cookieHeader);
        const authorization = await parseAuthorization(cookieHeader);

        if (!authorization || !sessionId) {
            console.error('[E]/spotify-playlist-manager:getServerSideProps:', 'no_authorization');

            throw new Error('not_logged_in');
        }

        const spotifyAuthApi = new SpotifyAuthApi({ username: process.env.SPOTIFY_CLIENT_ID, password: process.env.SPOTIFY_CLIENT_SECRET });
        const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);

        return await fetchPageWithRetry(sessionId, authorization, 1, null)(spotifyAuthorizationStore, spotifyAuthApi, spotifyUserApi);
    } catch (err) {
        // TODO: redirect to authorize for not_logged_in
        const defaultProps = {
            spotifyUserId: '',
            playlistsTotalCount: -1,
            playlists: [],
        };

        console.error('[E]/pages/spotify-playlist-manager:getServerSideProps', err);

        if (err instanceof Error) {
            if (err.message === 'not_logged_in') {
                return {
                    props: {
                        ...defaultProps,

                        error: err.message,
                        redirectUri: '/spotify-playlist-manager/oauth2/authorize',
                    },
                };
            }

            return {
                props: {
                    ...defaultProps,

                    error: err.message,
                },
            };
        }

        return {
            props: {
                ...defaultProps,

                error: 'internal',
            }, // will be passed to the page component as props
        };
    }
}

enum PanelDisplayMode {
    NONE,
    SYNC,
    PLAYLIST_DETAILS,
}

const Home: NextPage<SpotifyPlaylistManagerProps> = (props: SpotifyPlaylistManagerProps) => {
    const {
        spotifyUserId = '-1',
        playlistsTotalCount = -1,
    } = props;

    const [shouldShowNewPlaylistDialog, setShouldShowNewPlaylistDialog] = useState(false);
    const [shouldShowConflictResolutionDialog, setShouldShowConflictResolutionDialog] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [displayMode, setDisplayMode] = useState<PanelDisplayMode>(PanelDisplayMode.NONE);

    const [selectedFromPlaylist, setSelectedFromPlaylist] = useState<Playlist | null>(null);
    const [selectedToPlaylist, setSelectedToPlaylist] = useState<Playlist | null>(null);
    const [fromTracks, fromTracksTotalCount, handleFromTracksNextPageButtonClick] = useFetchPlaylistItems(selectedFromPlaylist);
    const [toTracks, toTracksTotalCount, handleToTracksNextPageButtonClick] = useFetchPlaylistItems(selectedToPlaylist);

    useEffect(() => {
        if (isErrorProps(props)) {
            return;
        }

        setPlaylists(props.playlists);
    }, [setPlaylists, props]);

    const handleSetDisplayMode = useCallback((_event, mode) => {
        setDisplayMode(mode);
    }, [setDisplayMode]);

    const handleSyncPlaylistError = useCallback((err: unknown) => {
        console.error('[E]/pages/spotify-playlist-manager:handleSyncPlaylistError', err);
    }, []);
    const handleAppendPlaylistItemsSuccessful = useCallback(async (_response: PostTrackResponse) => {
        console.log('[I]/pages/spotify-playlist-manager:handleAppendPlaylistItemsSuccessful');

        if (!selectedToPlaylist) {
            return;
        }

        const getPlaylistResponse = await axios.get<GetPlaylistResponse>(`/api/spotify/playlists/${selectedToPlaylist.id}`);

        if (getPlaylistResponse.status === 200) {
            const index = R.indexOf(selectedToPlaylist, playlists);

            if (index === -1) {
                setPlaylists([...playlists, getPlaylistResponse.data]);
                setSelectedToPlaylist(getPlaylistResponse.data);
            } else {
                setPlaylists(R.set(R.lensIndex(index), getPlaylistResponse.data, playlists));
                setSelectedToPlaylist(getPlaylistResponse.data);
            }
        }
    }, [selectedToPlaylist, setSelectedToPlaylist, playlists, setPlaylists]);
    const handleOverwritePlaylistItemsSuccessful = useCallback(async (_response: PutTrackResponse) => {
        console.log('[I]/pages/spotify-playlist-manager:handleOverwritePlaylistItemsSuccessful');

        if (!selectedToPlaylist) {
            return;
        }

        const getPlaylistResponse = await axios.get<GetPlaylistResponse>(`/api/spotify/playlists/${selectedToPlaylist.id}`);

        if (getPlaylistResponse.status === 200) {
            const index = R.indexOf(selectedToPlaylist, playlists);

            if (index === -1) {
                setPlaylists([...playlists, getPlaylistResponse.data]);
                setSelectedToPlaylist(getPlaylistResponse.data);
            } else {
                setPlaylists(R.set(R.lensIndex(index), getPlaylistResponse.data, playlists));
                setSelectedToPlaylist(getPlaylistResponse.data);
            }
        }
    }, [selectedToPlaylist, setSelectedToPlaylist, playlists, setPlaylists]);

    const handleCreateNewPlaylistSuccess = useCallback((result: PostPlaylistResponse) => {
        console.log('[I]/pages/spotify-playlist-manager:handleCreateNewPlaylistSuccess', result);

        setPlaylists([result, ...playlists]);
    }, [playlists, setPlaylists]);
    const handleCreateNewPlaylistError = useCallback((err: unknown) => {
        console.error('[E]/pages/spotify-playlist-manager:handleCreateNewPlaylistError', err);
    }, []);
    const handleDismissNewPlaylistDialog = useCallback(() => {
        setShouldShowNewPlaylistDialog(false);
    }, [setShouldShowNewPlaylistDialog]);
    const handleDismissSyncPlaylistConflictDialog = useCallback(() => {
        setShouldShowConflictResolutionDialog(false);
    }, [setShouldShowConflictResolutionDialog]);

    const handleFromPlaylistRowClick = useCallback(async (playlist: Playlist) => {
        console.log('[I]/pages/spotify-playlist-manager:handleFromPlaylistRowClick', playlist);

        if (playlist === selectedFromPlaylist) {
            setSelectedFromPlaylist(null);
            setDisplayMode(PanelDisplayMode.NONE);
        } else {
            setSelectedFromPlaylist(playlist);

            if (displayMode === PanelDisplayMode.NONE) {
                setDisplayMode(PanelDisplayMode.PLAYLIST_DETAILS);
            }
        }
    }, [selectedFromPlaylist, setSelectedFromPlaylist, displayMode, setDisplayMode]);

    const handleTrackRowClick = useCallback((track: Track) => {
        console.log('[I]/pages/spotify-playlist-manager:handleTrackRowClick:track', track);
    }, []);

    const handlePlaylistNextPageButtonClick = useCallback(async () => {
        console.log('[I]/pages/spotify-playlist-manager:handlePlaylistNextPageButtonClick');

        const querystring = qs.stringify({
            offset: playlists.length,
        });

        const getPlaylistsResponse = await axios.get<GetPlaylistsResponse>(`/api/spotify/playlists?${querystring}`);

        if (getPlaylistsResponse.status === 200) {
            setPlaylists((prevPlaylists) => ([...prevPlaylists, ...getPlaylistsResponse.data.items]));
        }
    }, [setPlaylists]);

    const handleSyncButtonClick = useCallback(async () => {
        console.log('[I]/pages/spotify-playlist-manager:handleSyncButtonClick');

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
            });

            if (response.status !== 201) {
                throw response.data;
            }

            const getPlaylistResponse = await axios.get<GetPlaylistResponse>(`/api/spotify/playlists/${selectedToPlaylist.id}`);

            if (getPlaylistResponse.status === 200) {
                const index = R.indexOf(selectedToPlaylist, playlists);

                if (index === -1) {
                    setPlaylists([...playlists, getPlaylistResponse.data]);
                    setSelectedToPlaylist(getPlaylistResponse.data);
                } else {
                    setPlaylists(R.set(R.lensIndex(index), getPlaylistResponse.data, playlists));
                    setSelectedToPlaylist(getPlaylistResponse.data);
                }
            }
        }
    }, [selectedFromPlaylist, selectedToPlaylist, setShouldShowConflictResolutionDialog, fromTracks, toTracks, setSelectedToPlaylist, setPlaylists, playlists]);

    const handleSyncTablePlaylistSelected = useCallback((playlist: Playlist | null) => {
        setSelectedToPlaylist(playlist);
    }, [setSelectedToPlaylist]);

    if (isErrorProps(props)) {
        if (props.redirectUri && typeof global.window?.location !== 'undefined') {
            location.href = props.redirectUri;
        }

        return (
            <pre>{props.error}</pre>
        );
    }

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
                <h4>
                    Spotify playlist manager
                </h4>
                <div>
                    <ToggleButtonGroup
                        color="primary"
                        value={displayMode}
                        exclusive
                        onChange={handleSetDisplayMode}
                    >
                        <ToggleButton disabled={selectedFromPlaylist === null} value={PanelDisplayMode.SYNC}>
                            Sync
                        </ToggleButton>
                        <ToggleButton disabled={selectedFromPlaylist === null} value={PanelDisplayMode.PLAYLIST_DETAILS}>
                            Playlist Details
                        </ToggleButton>
                    </ToggleButtonGroup>
                </div>
                <div className={pageStyles.playlistSection}>
                    <div className={pageStyles.playlistTableSection}>
                        <div className={pageStyles.panelContainer}>
                            <PlaylistTableTextHeader title="Playlists" onNewPlaylistButtonClick={null} />
                            <PlaylistTable
                                selectedPlaylist={selectedFromPlaylist}
                                onPlaylistRowClick={handleFromPlaylistRowClick}
                                playlists={playlists}
                            />
                        </div>

                        <div className={pageStyles.verticalDivider} />

                        <div className={pageStyles.panelContainer}>
                            <RightPanelChildren
                                displayMode={displayMode}
                                playlists={playlists}
                                selectedFromPlaylist={selectedFromPlaylist}
                                spotifyUserId={spotifyUserId}

                                handleSyncTablePlaylistSelected={handleSyncTablePlaylistSelected}
                                handleCreateNewPlaylistSuccess={handleCreateNewPlaylistSuccess}
                            />
                        </div>
                    </div>

                    {playlists.length < playlistsTotalCount ? (
                        <React.Fragment>
                            <StandardHorizontalDivider />

                            <Button onClick={handlePlaylistNextPageButtonClick}>
                                more playlists
                            </Button>
                        </React.Fragment>
                    ) : null}
                </div>

                <StandardHorizontalDivider />

                <div className={pageStyles.bottomContainer}>
                    <BottomPanelChildren
                        displayMode={displayMode}
                        selectedFromPlaylist={selectedFromPlaylist}
                        selectedToPlaylist={selectedToPlaylist}
                        fromTracks={fromTracks}
                        toTracks={toTracks}
                        fromTracksTotalCount={fromTracksTotalCount}
                        toTracksTotalCount={toTracksTotalCount}
                        handleFromTracksNextPageButtonClick={handleFromTracksNextPageButtonClick}
                        handleToTracksNextPageButtonClick={handleToTracksNextPageButtonClick}
                        handleTrackRowClick={handleTrackRowClick}
                    />
                </div>

                <div className={pageStyles.actionButtonSection}>
                    <Button
                        sx={{ marginTop: 2 }}
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

type SpotifyPlaylistManagerProps = Partial<ErrorProps> & {
    spotifyUserId: string;
    playlists: Playlist[];
    playlistsTotalCount: number,
}

type RightPanelChildrenProps = {
    displayMode: PanelDisplayMode,
    playlists: Playlist[],
    selectedFromPlaylist: Playlist | null,
    spotifyUserId: string,

    handleSyncTablePlaylistSelected: (playlist: Playlist | null) => void;
    handleCreateNewPlaylistSuccess: (playlist: Playlist) => void;

}

const RightPanelChildren = (props: RightPanelChildrenProps) => {
    const { displayMode, playlists, selectedFromPlaylist, spotifyUserId, handleSyncTablePlaylistSelected, handleCreateNewPlaylistSuccess } = props;

    switch (displayMode) {
        case PanelDisplayMode.NONE: {
            return (null);
        }

        case PanelDisplayMode.SYNC: {
            return (
                <SyncTableContainer
                    playlists={playlists.filter((playlist) => playlist.owner.id === spotifyUserId)}
                    onPlaylistSelected={handleSyncTablePlaylistSelected}
                    onCreateNewPlaylistSuccess={handleCreateNewPlaylistSuccess}
                />
            );
        }

        case PanelDisplayMode.PLAYLIST_DETAILS: {
            if (!selectedFromPlaylist) {
                return (null);
            }

            return (
                <PlaylistDetailsContainer playlist={selectedFromPlaylist} />
            );
        }

        default: {
            return (null);
        }
    }
};

type BottomPanelChildrenProps = {
    displayMode: PanelDisplayMode,
    selectedFromPlaylist: Playlist | null,
    selectedToPlaylist: Playlist | null,
    fromTracks: Track[],
    toTracks: Track[],
    fromTracksTotalCount: number,
    toTracksTotalCount: number,

    handleFromTracksNextPageButtonClick: () => void,
    handleToTracksNextPageButtonClick: () => void,
    handleTrackRowClick: (track: Track) => void,
}

const BottomPanelChildren = (props: BottomPanelChildrenProps) => {
    const {
        displayMode,
        selectedFromPlaylist,
        selectedToPlaylist,
        fromTracks,
        toTracks,
        fromTracksTotalCount,
        toTracksTotalCount,

        handleFromTracksNextPageButtonClick,
        handleToTracksNextPageButtonClick,
        handleTrackRowClick,
    } = props;

    if (displayMode !== PanelDisplayMode.SYNC) {
        return null;
    }

    return (
        <div className={pageStyles.trackTableSection}>
            <div className={pageStyles.trackTableContainer}>
                {selectedFromPlaylist ? (
                    <>
                        <h4>
                            Playlist: {selectedFromPlaylist.name}
                        </h4>
                        {fromTracks.length > 0 ? (
                            <TrackTable
                                tracks={fromTracks}
                                onTrackRowClick={handleTrackRowClick}
                            />
                        ) : (
                            <p>no songs</p>
                        )}

                        {fromTracks.length < fromTracksTotalCount ? (
                            <React.Fragment>
                                <StandardHorizontalDivider />

                                <Button onClick={handleFromTracksNextPageButtonClick}>
                                    more tracks
                                </Button>
                            </React.Fragment>
                        ) : null}
                    </>
                ) : null}
            </div>

            <div className={pageStyles.verticalDivider} />

            <div className={pageStyles.trackTableContainer}>
                {selectedToPlaylist ? (
                    <>
                        <h4>
                        Playlist: {selectedToPlaylist.name}
                        </h4>
                        {toTracks.length > 0 ? (
                            <TrackTable
                                tracks={toTracks}
                                onTrackRowClick={handleTrackRowClick}
                            />
                        ) : (
                            <p>No songs</p>
                        )}

                        {toTracks.length < toTracksTotalCount ? (
                            <React.Fragment>
                                <StandardHorizontalDivider />

                                <Button onClick={handleToTracksNextPageButtonClick}>
                                    more tracks
                                </Button>
                            </React.Fragment>
                        ) : null}
                    </>
                ) : null}
            </div>
        </div>
    );
};