import type { NextPage, NextPageContext, GetServerSidePropsResult } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import SpotifyUserApi from '../../../apis/SpotifyUserApi';
import { parseAuthorization } from '../../../server/request/pipes/parseAuthorization';
import styles from '../../../styles/Home.module.css';

export async function getServerSideProps(context: NextPageContext): Promise<GetServerSidePropsResult<HomePageProps>> {
    try {
        // setup authorize url from config
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const scopes = ['playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-public'].join(' ');
        const host = 'https://accounts.spotify.com';
        const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

        if (!redirectUri) {
            throw new Error('invalid_config');
        }

        const authorizeUrl = `${host}/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        // fetch user
        const cookieHeader = context.req?.headers.cookie;

        if (!cookieHeader) {
            console.log('[E]:/spotify-playlist-clone:getServerSideProps:', 'no_cookie');
            // TODO: redirect to authorize

            return {
                props: {
                    authorizeUrl: authorizeUrl,
                    spotifyUserId: null,
                    error: 'not_logged_in',
                },
            };
        }

        const authorization = await parseAuthorization(cookieHeader);

        if (!authorization) {
            console.log('[E]:/spotify-playlist-clone:getServerSideProps:', 'no_authorization');

            return {
                props: {
                    authorizeUrl: authorizeUrl,
                    spotifyUserId: null,
                    error: 'not_logged_in',
                },
            };
        }

        // return userId
        const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);
        const currentProfile = await spotifyUserApi.getCurrentUserProfile();

        return {
            props: {
                authorizeUrl: authorizeUrl,
                spotifyUserId: currentProfile.id,
            },
        };
    } catch (err) {
        console.error('[E]/pages/spotify-playlist-clone/oauth2/authorize:getServerSideProps', err);

        return {
            props: {
                authorizeUrl: '',
                spotifyUserId: null,
                error: 'internal',
            }, // will be passed to the page component as props
        };
    }
}

const Home: NextPage<HomePageProps> = (props: HomePageProps) => {
    if (typeof window !== 'undefined' && props.spotifyUserId !== null) {
        window.location.href = '/spotify-playlist-clone';
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>Authorize spotify</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <a href={props.authorizeUrl}>
                    Authorize spotify
                </a>

                {props.error ? (
                    <p>
                        {props.error}
                    </p>
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

type HomePageProps = {
    spotifyUserId: string | null,
    authorizeUrl: string,
    error?: string,
};

export default Home;
