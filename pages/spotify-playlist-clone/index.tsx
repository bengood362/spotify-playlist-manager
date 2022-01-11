import qs from 'qs';
import React, { useState, useCallback, useEffect } from 'react';
import type { NextPage, NextPageContext } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import SpotifyUserApi from '../../apis/SpotifyUserApi';
import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import styles from '../../styles/Home.module.css';
import { ErrorProps, isErrorProps } from '../../types/ErrorProps';
import { PlaylistTable } from '../../components/playlist/PlaylistTable';
import { TrackTable } from '../../components/track/TrackTable';
import { parseAuthorization } from '../../server/request/header/parseAuthorization';
import { Track } from '../../apis/SpotifyUserApi/_types/tracks/Track';
import axios from 'axios';
import { GetTrackResponse } from '../api/spotify/playlists/[pid]/tracks';
import SpotifyAuthApi from '../../apis/SpotifyAuthApi';
import { ISpotifyAuthorizationStore, SpotifyAuthorization, spotifyAuthorizationStore } from '../../stores/SpotifyAuthorizationStore';
import { parseSessionId } from '../../server/request/header/parseSessionId';
import { fromIssueTokenByRefreshTokenResponse } from '../../server/model/adapter/spotifyAuthorization';
import { Button } from '@mui/material';
import { GetPlaylistsResponse } from '../../apis/SpotifyUserApi/_types/playlists/GetPlaylistsResponse';

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
        console.error('[E]fetchPageWithRetry', err);
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
        console.log('[I]/pages/spotify-playlist-clone:getServerSideProps');

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
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    useEffect(() => {
        if(isErrorProps(props)){
            return;
        }

        setPlaylists(props.playlists);
    }, [setPlaylists]);

    const handlePlaylistRowClick = useCallback(async (playlist: Playlist) => {
        setSelectedPlaylist(playlist);
    }, [setSelectedPlaylist]);

    const handleTrackRowClick = useCallback((track: Track) => {
        console.log('Home:handleTrackRowClick:track', track);
    }, []);

    const handlePlaylistNextPageButtonClick = useCallback(async () => {
        console.log('Home:handlePlaylistNextPageButtonClick');

        const querystring = qs.stringify({
            offset: playlists.length,
            limit: 5,
        })

        const getPlaylistsResponse = await axios.get<GetPlaylistsResponse>(`/api/spotify/playlists?${querystring}`);

        if (getPlaylistsResponse.status === 200) {
            console.log('getPlaylistsResponse', playlists, getPlaylistsResponse.data);

            setPlaylists([...playlists, ...getPlaylistsResponse.data.items]);
        }
    }, [playlists, setPlaylists]);

    useEffect(() => {
        (async () => {
            if (!selectedPlaylist) {
                return;
            }

            const getTracksResponse = await axios.get<GetTrackResponse>(`/api/spotify/playlists/${selectedPlaylist.id}/tracks`);

            if (getTracksResponse.status === 200) {
                console.log('[I]tracksResponse', getTracksResponse.data);

                setTracks(getTracksResponse.data.items.map(({ track }) => (track)));
            }
        })();
    }, [selectedPlaylist]);

    if (isErrorProps(props)) {
        return <pre>{props.error}</pre>;
    }

    const {
        spotifyUserId,
        playlistsTotalCount,
    } = props;

    return (
        <div className={styles.container}>
            <Head>
                <title>Main</title>
                <meta name="description" content="Generated by create next app" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <h3>
                    Hello {spotifyUserId}
                    <p>{playlistsTotalCount}</p>
                </h3>
                <PlaylistTable
                    selectedPlaylist={selectedPlaylist}
                    onPlaylistRowClick={handlePlaylistRowClick}
                    playlists={playlists}
                />
                {playlists.length < playlistsTotalCount ? (
                    <React.Fragment>
                        <Button onClick={() => handlePlaylistNextPageButtonClick()}>
                            next
                        </Button>
                    </React.Fragment>
                ) : null}

                {selectedPlaylist !== null ? (
                    <React.Fragment>
                        <hr />
                        <TrackTable
                            tracks={tracks}
                            onTrackRowClick={handleTrackRowClick}
                        />
                    </React.Fragment>
                ) : null}
            </main>

            <footer className={styles.footer}>
                <a
                    href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Powered by{' '}
                    <span className={styles.logo}>
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