import styles from './index.module.css';

export const PlaylistTable = (props: PlaylistTableProps) => {
    return (
        <div className={styles.table}>
            {props.children}
        </div>
    );
};

type PlaylistTableProps = {
    children: React.ReactNode,
};