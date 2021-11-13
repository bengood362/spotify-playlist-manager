import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import styles from '../../../styles/Home.module.css';

const clientId = '5bec90e6dcf84c9491493e025a08a9ed';
const scopes = ['playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-public'].join(' ');
const host = 'https://accounts.spotify.com';
const redirectUri = 'http://127.0.0.1:3000/api/oauth2/spotify/callback';

const authorizeUrl = `${host}/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

const Home: NextPage = () => {
    return (
        <div className={styles.container}>
            <Head>
                <title>Authorize spotify</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <a href={authorizeUrl}>
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

export default Home;
