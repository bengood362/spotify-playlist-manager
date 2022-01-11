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
import { fromGetTokenResponse } from '../../server/model/adapter/spotifyAuthorization';

const fetchPageWithRetry = async (sessionId: string, authorization: SpotifyAuthorization, spotifyAuthorizationStore: ISpotifyAuthorizationStore, spotifyAuthApi: SpotifyAuthApi, spotifyUserApi: SpotifyUserApi, retry = 1, lastError: unknown = null): Promise<{ props: SpotifyPlaylistCloneProps }> => {

    if (retry === 0) {
        throw lastError;
    }

    try {
        const currentProfile = await spotifyUserApi.getCurrentUserProfile();
        const getPlaylistsResponse = await spotifyUserApi.getUserPlaylists(currentProfile.id, 50);

        return {
            props: {
                spotifyUserId: currentProfile.id,
                playlists: getPlaylistsResponse.items.filter((playlist) => playlist.owner.id === currentProfile.id),
                playlistsTotalPages: getPlaylistsResponse.total,
                playlistsOffset: getPlaylistsResponse.offset,
            }, // will be passed to the page component as props
        };
    } catch (err) {
        if (err instanceof Error && err.message === 'access_token_expired') {
            const tokenResponseData = await spotifyAuthApi.refreshAccessToken(authorization.refreshToken);
            const newAuthorization = fromGetTokenResponse(tokenResponseData, new Date());

            await spotifyAuthorizationStore.set(sessionId, newAuthorization);

            return await fetchPageWithRetry(sessionId, newAuthorization, spotifyAuthorizationStore, spotifyAuthApi, spotifyUserApi, retry, err);
        }

        return await fetchPageWithRetry(sessionId, authorization, spotifyAuthorizationStore, spotifyAuthApi, spotifyUserApi, retry - 1, err);
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
            console.log('[E]:/spotify-playlist-clone:getServerSideProps:', 'no_cookie');
            // TODO: redirect to authorize

            return {
                props: {
                    error: 'not_logged_in',
                },
            };
        }

        const sessionId = parseSessionId(cookieHeader);
        const authorization = await parseAuthorization(cookieHeader);

        if (!authorization || !sessionId) {
            console.log('[E]:/spotify-playlist-clone:getServerSideProps:', 'no_authorization');

            return {
                props: {
                    error: 'not_logged_in',
                },
            };
        }

        const spotifyAuthApi = new SpotifyAuthApi({ username: process.env.SPOTIFY_CLIENT_ID, password: process.env.SPOTIFY_CLIENT_SECRET });
        const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);

        return await fetchPageWithRetry(sessionId, authorization, spotifyAuthorizationStore, spotifyAuthApi, spotifyUserApi, 1);
    } catch (err) {
        console.error('[E]/pages/spotify-playlist-clone:getServerSideProps', err);

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

    const handlePlaylistRowClick = useCallback(async (playlist: Playlist) => {
        setSelectedPlaylist(playlist);

        const getTracksResponse = await axios.get<GetTrackResponse>(`/api/spotify/playlists/${playlist.id}/tracks`);

        if (getTracksResponse.status === 200) {
            console.log('[I]tracksResponse', getTracksResponse.data);

            setTracks(getTracksResponse.data.items.map(({ track }) => (track)));
        }
    }, [setSelectedPlaylist]);

    const handleTrackRowClick = useCallback((track: Track) => {
        console.log('handleTrackRowClick:track', track);
    }, []);

    useEffect(() => {
        (async () => {
            console.log('selectedPlaylist', selectedPlaylist);
        })();
    }, [selectedPlaylist]);

    if (isErrorProps(props)) {
        return <pre>{props.error}</pre>;
    }

    const {
        spotifyUserId,
        playlists,
        playlistsTotalPages,
        playlistsOffset,
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
                    <p>{playlistsTotalPages}</p>
                    <p>{playlistsOffset}</p>
                </h3>
                <PlaylistTable
                    selectedPlaylist={selectedPlaylist}
                    onPlaylistRowClick={handlePlaylistRowClick}
                    playlists={playlists}
                />

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
    playlistsTotalPages: number,
    playlistsOffset: number,
}