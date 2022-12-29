import React, { useEffect } from 'react';
import type { NextPage, NextPageContext } from 'next';
import Head from 'next/head';
import Image from 'next/image';

import SpotifyUserApi from '../../apis/SpotifyUserApi';
import SpotifyAuthApi from '../../apis/SpotifyAuthApi';

import { ISpotifyAuthorizationStore, SpotifyAuthorization, spotifyAuthorizationStore } from '../../stores/SpotifyAuthorizationStore';

import homeStyles from '../../styles/Home.module.css';

import { parseAuthorization } from '../../server/request/header/parseAuthorization';
import { fromIssueTokenByRefreshTokenResponse } from '../../server/model/adapter/spotifyAuthorization';
import { parseSessionId } from '../../server/request/header/parseSessionId';
import { ErrorProps, isErrorProps } from '../../types/ErrorProps';
import { Queue, QueueItem } from '../../apis/SpotifyUserApi/_types/queue';
import { AxiosError } from 'axios';
import { Artist } from '../../apis/SpotifyUserApi/_types/artists';
import IndiecastPublicApi from '../../apis/IndiecastPublicApi';

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
    indiecastPublicApi: IndiecastPublicApi,
): Promise<{ props: WebPlayerProps }> => {
    if (retry < 0) {
        throw lastError;
    }

    try {
        const currentProfile = await spotifyUserApi.getCurrentUserProfile();
        const userQueue = await spotifyUserApi.getUserQueue();
        const results = await indiecastPublicApi.search('我很掛念你');

        console.log('results', results.data.search.tracks);
        // TODO: get spotify queue

        return {
            props: {
                spotifyUserId: currentProfile.id,
                currentlyPlaying: userQueue.currently_playing,
                queue: userQueue.queue,
            }, // will be passed to the page component as props
        };
    } catch (err) {
        // TODO: retry-backoff
        console.error('[E]/pages/webplayer:fetchPageWithRetry', err);

        if (err instanceof Error && err.message === 'access_token_expired') {
            const newAuthorization = await handleAccessTokenExpiredError(sessionId, authorization)(spotifyAuthApi, spotifyAuthorizationStore);
            const newSpotifyUserApi = new SpotifyUserApi(newAuthorization.tokenType, newAuthorization.accessToken);

            return await fetchPageWithRetry(sessionId, newAuthorization, retry - 1, err)(spotifyAuthorizationStore, spotifyAuthApi, newSpotifyUserApi, indiecastPublicApi);
        }

        return await fetchPageWithRetry(sessionId, authorization, retry - 1, err)(spotifyAuthorizationStore, spotifyAuthApi, spotifyUserApi, indiecastPublicApi);
    }
};

export async function getServerSideProps(context: NextPageContext): Promise<{ props: WebPlayerProps }> {
    const indiecastPublicApi = new IndiecastPublicApi();

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
            console.error('[E]:/webplayer:getServerSideProps:', 'no_cookie');

            throw new Error('not_logged_in');
        }

        const sessionId = parseSessionId(cookieHeader);
        const authorization = await parseAuthorization(cookieHeader);

        if (!authorization || !sessionId) {
            console.error('[E]/webplayer:getServerSideProps:', 'no_authorization');

            throw new Error('not_logged_in');
        }

        const spotifyAuthApi = new SpotifyAuthApi({ username: process.env.SPOTIFY_CLIENT_ID, password: process.env.SPOTIFY_CLIENT_SECRET });
        const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);

        return await fetchPageWithRetry(sessionId, authorization, 1, null)(spotifyAuthorizationStore, spotifyAuthApi, spotifyUserApi, indiecastPublicApi);
    } catch (err) {
        // TODO: redirect to authorize for not_logged_in
        const defaultProps = {
            spotifyUserId: '',
            currentlyPlaying: null,
            queue: [],
        };

        console.error('[E]/pages/webplayer:getServerSideProps', err);

        if (err instanceof Error) {
            if ('isAxiosError' in err && err['isAxiosError']) {
                const axiosError = (err as AxiosError).toJSON();

                if ((axiosError as any)['status'] === 401) {
                    return {
                        props: {
                            ...defaultProps,

                            error: (err as Error).message,
                            redirectUri: '/api/oauth2/spotify/logout?prev=webplayer',
                        },
                    };
                }
            } else if (err.message === 'not_logged_in') {
                return {
                    props: {
                        ...defaultProps,

                        error: err.message,
                        redirectUri: '/spotify-playlist-manager/oauth2/authorize?prev=webplayer',
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

const Webplayer: NextPage<WebPlayerProps> = (props: WebPlayerProps) => {
    const {
        spotifyUserId = '-1',
        currentlyPlaying,
        queue,
    } = props;

    useEffect(() => {
        if (isErrorProps(props)) {
            return;
        }
    }, [props]);

    if (isErrorProps(props)) {
        if (props.redirectUri && typeof global.window?.location !== 'undefined') {
            location.href = props.redirectUri;
        }

        return (
            <pre>{props.error}</pre>
        );
    }

    const getMergedArtist = (artists: Artist[]) => artists.map(({ name }) => name).join(',');

    return (
        <div className={homeStyles.container}>
            <Head>
                <title>Web Player</title>
                <meta name="description" content="Generated by create next app" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={homeStyles.main}>
                <h3>
                    Spotify: Hello {spotifyUserId}
                </h3>
                <h4>
                    Web player
                </h4>
                {currentlyPlaying && (
                    <p>Currently playing in spotify: {getMergedArtist(currentlyPlaying.artists)} - {currentlyPlaying.name}</p>
                )}
                <p>
                    {queue.map((queueItem) => (
                        <div key={queueItem.name}>{getMergedArtist(queueItem.artists)} - {queueItem.name}</div>
                    ))}
                </p>
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

export default Webplayer;

type WebPlayerProps = Partial<ErrorProps> & {
    spotifyUserId: string;
    currentlyPlaying: QueueItem | null,
    queue: Queue;
}
