import { parse } from 'cookie';
import type { NextPage, NextPageContext } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import SpotifyUserApi from '../../apis/SpotifyUserApi';
import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { CookieKey } from '../../constants/CookieKey';
import { spotifyAuthorizationStore } from '../../stores/SpotifyAuthorizationStore';
import styles from '../../styles/Home.module.css';
import { ErrorProps, isErrorProps } from '../../types/ErrorProps';
import { PlaylistTable } from '../../components/playlist/PlaylistTable';

export async function getServerSideProps(context: NextPageContext): Promise<{ props: SpotifyPlaylistCloneProps }> {
    try {
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

        const cookieMap = parse(cookieHeader, { decode: (s) => decodeURIComponent(s) });
        const sessionId = cookieMap[CookieKey.SESSION_ID_COOKIE_KEY].trim();
        const authorization = await spotifyAuthorizationStore.get(sessionId);

        if (!authorization) {
            console.log('[E]:/spotify-playlist-clone:getServerSideProps:', 'no_authorization');

            return {
                props: {
                    error: 'not_logged_in',
                },
            };
        }

        const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);
        const currentProfile = await spotifyUserApi.getCurrentUserProfile();
        // TODO: pagination all
        const getPlaylistsResponse = await spotifyUserApi.getUserPlaylists(currentProfile.id, 50);

        return {
            props: {
                spotifyUserId: currentProfile.id,
                playlists: getPlaylistsResponse.items.filter((playlist) => playlist.owner.id === currentProfile.id),
            }, // will be passed to the page component as props
        };
    } catch (err) {
        return {
            props: {
                error: 'internal',
            }, // will be passed to the page component as props
        };
    }
}

const Home: NextPage<SpotifyPlaylistCloneProps> = (props: SpotifyPlaylistCloneProps) => {
    if (isErrorProps(props)) {
        return <pre>
            {props.error}
        </pre>;
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>Main</title>
                <meta name="description" content="Generated by create next app" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <h3>
                    Hello {props.spotifyUserId}
                </h3>
                <PlaylistTable playlists={props.playlists} />
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
}