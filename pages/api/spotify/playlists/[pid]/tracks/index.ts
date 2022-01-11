import type { NextApiRequest, NextApiResponse } from 'next';
import SpotifyUserApi from '../../../../../../apis/SpotifyUserApi';
import type { GetPlaylistTracksResponse } from '../../../../../../apis/SpotifyUserApi/_types/tracks/GetPlaylistTracksResponse';
import { parseAuthorization } from '../../../../../../server/request/header/parseAuthorization';
import { parseFiniteNumber } from '../../../../../../server/request/queryparam/parseFiniteNumber';

export type GetTrackResponse = GetPlaylistTracksResponse;
type ErrorResponse = {
    message: string,
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GetTrackResponse | ErrorResponse>,
) {
    try {
        if (
            !process.env.SPOTIFY_CLIENT_ID ||
            !process.env.SPOTIFY_CLIENT_SECRET ||
            !process.env.SPOTIFY_REDIRECT_URI
        ) {
            throw new Error('invalid_config');
        }

        const cookie = req.headers.cookie ?? '';
        const authorization = await parseAuthorization(cookie);

        if (!authorization) {
            throw new Error('unauthorized');
        }

        const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);

        const playlistId = req.query['pid'];
        const offset = parseFiniteNumber(req.query['offset'], 0);

        if (typeof playlistId !== 'string' || offset === null) {
            throw new Error('bad_request');
        }

        const playlistItems = await spotifyUserApi.getPlaylistItems(playlistId, 5, offset);

        res.status(200).json(playlistItems);
    } catch (err) {
        console.log('[E]:/api/oauth2/spotify/callback', err);

        res.status(500).json({ message: 'internal_server_error' });
    }
}
