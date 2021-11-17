import styles from './index.module.css';
import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';

export const PlaylistRow = (props: PlaylistRowProps) => {
    const { playlist } = props;

    return (
        <div className={styles.row} key={`${playlist.type}-${playlist.id}`}>
            {playlist.name}
        </div>
    );
};

type PlaylistRowProps = {
    playlist: Playlist,
}