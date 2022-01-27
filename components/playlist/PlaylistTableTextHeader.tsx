import { Button } from '@mui/material';
import playlistStyles from './index.module.css';

export const PlaylistTableTextHeader = (props: PlaylistTableTextHeaderProps) => {
    const { title, onNewPlaylistButtonClick } = props;

    return (
        <div className={playlistStyles.tableHeader}>
            <h4>
                {title}
            </h4>
            {onNewPlaylistButtonClick ? (
                <Button size="small" sx={{ marginLeft: 'auto' }} onClick={onNewPlaylistButtonClick}>
                    +
                </Button>
            ) : null}
        </div>
    );
};

type PlaylistTableTextHeaderProps = {
    title: string,
    onNewPlaylistButtonClick: (() => void) | null;
}