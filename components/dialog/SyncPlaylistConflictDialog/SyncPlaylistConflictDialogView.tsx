import { Grid, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { Playlist } from '../../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { Track } from '../../../apis/SpotifyUserApi/_types/tracks/Track';
import { TrackTable } from '../../track/TrackTable';

export const SyncPlaylistConflictDialogView = (props: SyncPlaylistConflictDialogViewProps) => {
    const {
        open,
        playlist,
        tracks,

        onOverwriteButtonClick,
        onAppendFromBeginningButtonClick,
        onAppendToEndButtonClick,
        onCancelButtonClick,
    } = props;

    return (
        <Dialog open={open} fullWidth={true}>
            <DialogTitle>
                Playlist has existing tracks
            </DialogTitle>

            <DialogContent>
                <DialogContentText>
                    {playlist.name}
                </DialogContentText>

                <TrackTable
                    tracks={tracks}
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    onTrackRowClick={() => {}}
                />
            </DialogContent>

            <DialogActions>
                <Grid container item spacing={1} direction="column" sx={{ justifyContent: 'flex-end' }}>
                    <Grid item sx={{ marginLeft: 'auto' }}>
                        <Button
                            size="small"
                            color="warning"
                            variant="contained"
                            onClick={onOverwriteButtonClick}
                        >
                            Overwrite
                        </Button>
                    </Grid>

                    <Grid container item direction="row" spacing={1}>
                        <Grid item xs={2}>
                            <Button size="small" variant="outlined" onClick={onCancelButtonClick}>
                                Cancel
                            </Button>
                        </Grid>
                        <Grid container item xs={10} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            <Grid item>
                                <Button
                                    size="small"
                                    color="primary"
                                    variant="contained"
                                    onClick={onAppendFromBeginningButtonClick}
                                >
                                    Append from the start
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button
                                    size="small"
                                    color="primary"
                                    variant="contained"
                                    onClick={onAppendToEndButtonClick}
                                >
                                    Append to the end
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </DialogActions>
        </Dialog>
    );
};

type SyncPlaylistConflictDialogViewProps = {
    open: boolean,
    playlist: Playlist,
    tracks: Track[],

    onOverwriteButtonClick: () => void,
    onAppendFromBeginningButtonClick: () => void,
    onAppendToEndButtonClick: () => void,
    onCancelButtonClick: () => void,
}