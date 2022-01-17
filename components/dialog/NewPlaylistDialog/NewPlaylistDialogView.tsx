import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { ChangeEvent } from 'react';

export const NewPlaylistDialogView = (props: NewPlaylistDialogViewProps) => {
    const {
        open,
        name,
        description,
        nameErrorText,
        disableConfirm,

        onCancelClick,
        onConfirmClick,
        onOverlayClick,
        onNameChange,
        onDescriptionChange,
    } = props;

    return (
        <Dialog open={open} fullWidth={true} onBackdropClick={onOverlayClick}>
            <DialogTitle>
                New playlist
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2} sx={{ paddingTop: 1, paddingBottom: 1 }}>
                    <TextField
                        error={Boolean(nameErrorText)}
                        helperText={nameErrorText}
                        value={name}
                        required={true}
                        defaultValue="New playlist"
                        variant="outlined"
                        label="Name"
                        onChange={onNameChange}
                    />
                    <TextField
                        value={description}
                        variant="outlined"
                        label="Description"
                        multiline={true}
                        rows={3}
                        onChange={onDescriptionChange}
                    />
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onCancelClick}>
                    Cancel
                </Button>
                <Button variant="contained" disabled={disableConfirm} onClick={onConfirmClick}>
                    Submit
                </Button>
            </DialogActions>
        </Dialog>
    );
};

type NewPlaylistDialogViewProps = {
    open: boolean;
    name: string;
    description: string;
    nameErrorText: string | null;
    disableConfirm: boolean;

    onOverlayClick: () => void;
    onCancelClick: () => void;
    onConfirmClick: () => void;
    onNameChange: (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
    onDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
}