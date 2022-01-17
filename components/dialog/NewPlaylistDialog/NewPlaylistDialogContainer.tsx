import axios, { AxiosResponse } from 'axios';
import { ChangeEvent, useEffect, useCallback, useState } from 'react';
import { PostPlaylistResponse } from '../../../apis/SpotifyUserApi/_types/playlists/PostPlaylistResponse';
import { PostPlaylistBody } from '../../../pages/api/spotify/playlists';
import { NewPlaylistDialogView } from './NewPlaylistDialogView';

export const NewPlaylistDialogContainer = (props: NewPlaylistDialogContainerProps) => {
    const { open, dismissDialog, onSuccess, onError } = props;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isNameDirty, setIsNameDirty] = useState(false);
    const [nameErrorText, setNameErrorText] = useState<string | null>(null);
    const [isValidForm, setIsValidForm] = useState(false);

    // initialization for open
    useEffect(() => {
        setName('');
        setDescription('');
        setIsNameDirty(false);
        setNameErrorText(null);
    }, [open, setName, setDescription, setIsNameDirty, setNameErrorText]);

    // form validation
    useEffect(() => {
        if (name.trim() === '') {
            setIsValidForm(false);
        } else {
            setIsValidForm(true);
        }
    }, [name, setIsValidForm]);

    const createNewPlaylist = useCallback(async (name: string, description: string) => {
        try {
            const response = await axios.post<PostPlaylistResponse, AxiosResponse<PostPlaylistResponse>, PostPlaylistBody>('/api/spotify/playlists', { name, description }, { headers: { 'Content-Type': 'application/json' } });

            if (response.status !== 201) {
                throw response.data;
            }

            return response.data;
        } catch (err) {
            console.log('[E]NewPlaylistDialogContainer.createNewPlaylist', err);

            throw err;
        }
    }, []);

    const handleConfirmClick = useCallback(async () => {
        try {
            console.log('NewPlaylistDialogContainer.handleConfirmClick', {
                name,
                description,
            });

            if (!isValidForm) {
                return;
            }

            const result = await createNewPlaylist(name, description);

            onSuccess(result);
            dismissDialog();
        } catch (err) {
            console.error('[E]NewPlaylistDialogContainer.handleConfirmClick', err);

            onError(err);
        }
    }, [name, description, dismissDialog, isValidForm, onSuccess, onError]);

    const handleNameChange = useCallback((event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        setIsNameDirty(true);
        setName(event.target.value);

        if (event.target.value === '') {
            setNameErrorText('name cannot be empty');
        } else {
            setNameErrorText(null);
        }
    }, [setName, setIsNameDirty, setNameErrorText]);

    const handleDescriptionChange = useCallback((event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        setDescription(event.target.value);
    }, [setDescription]);

    return (
        <NewPlaylistDialogView
            open={open}
            name={name}
            description={description}
            nameErrorText={isNameDirty ? nameErrorText : null}
            disableConfirm={!isValidForm}

            onCancelClick={dismissDialog}
            onOverlayClick={dismissDialog}
            onConfirmClick={handleConfirmClick}
            onNameChange={handleNameChange}
            onDescriptionChange={handleDescriptionChange}
        />
    );
};

type NewPlaylistDialogContainerProps = {
    open: boolean;
    dismissDialog: () => void,
    onSuccess: (response: PostPlaylistResponse) => void,
    onError: (error: unknown) => void,
}
