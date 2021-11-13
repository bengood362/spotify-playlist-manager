import type { NextPage, NextPageContext } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import styles from '../../../styles/Home.module.css';
import { ErrorProps, isErrorProps } from '../../../types/ErrorProps';


export async function getStaticProps(_context: NextPageContext): Promise<{ props: HomePageProps }> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const scopes = ['playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-public'].join(' ');
    const host = 'https://accounts.spotify.com';
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!redirectUri) {
        throw new Error('invalid_config');
    }

    const authorizeUrl = `${host}/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return {
        props: {
            authorizeUrl,
        },
    };
}

const Home: NextPage<HomePageProps> = (props: HomePageProps) => {
    if (isErrorProps(props)) {
        return <pre>
            {props.error}
        </pre>;
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
    authorizeUrl: string,
} | ErrorProps;

export default Home;
