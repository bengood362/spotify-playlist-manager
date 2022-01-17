import axios from 'axios';
import qs from 'qs';
import { useState, useCallback, useEffect } from 'react';
import { Playlist } from '../../apis/SpotifyUserApi/_types/playlists/Playlist';
import { Track } from '../../apis/SpotifyUserApi/_types/tracks/Track';
import { GetTrackResponse } from '../../pages/api/spotify/playlists/[pid]/tracks';

export const useFetchPlaylistItems = (selectedPlaylist: Playlist | null): [Track[], number, () => Promise<void>] => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [tracksTotalCount, setTracksTotalCount] = useState<number>(0);

    const handleTracksNextPageButtonClick = useCallback(async () => {
        console.log('[I]useFetchPlaylistItems:handleTracksNextPageButtonClick');

        if (selectedPlaylist === null) {
            return;
        }

        const querystring = qs.stringify({
            offset: tracks.length,
        });

        const getTracksResponse = await axios.get<GetTrackResponse>(`/api/spotify/playlists/${selectedPlaylist.id}/tracks?${querystring}`);

        if (getTracksResponse.status === 200) {
            setTracks([...tracks, ...getTracksResponse.data.items.map(({ track }) => (track))]);
        }
    }, [selectedPlaylist, tracks, setTracks]);

    useEffect(() => {
        (async () => {
            if (!selectedPlaylist) {
                setTracksTotalCount(0);
                setTracks([]);

                return;
            }

            const getTracksResponse = await axios.get<GetTrackResponse>(`/api/spotify/playlists/${selectedPlaylist.id}/tracks`);

            if (getTracksResponse.status === 200) {
                setTracksTotalCount(getTracksResponse.data.total);
                setTracks(getTracksResponse.data.items.map(({ track }) => (track)));
            }
        })();
    }, [selectedPlaylist, setTracksTotalCount, setTracks]);

    return [tracks, tracksTotalCount, handleTracksNextPageButtonClick];
};