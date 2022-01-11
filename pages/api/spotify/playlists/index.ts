import type { NextApiRequest, NextApiResponse } from 'next';
import SpotifyUserApi from '../../../../apis/SpotifyUserApi';
import { GetPlaylistsResponse } from '../../../../apis/SpotifyUserApi/_types/playlists/GetPlaylistsResponse';
import { parseAuthorization } from '../../../../server/request/header/parseAuthorization';
import { parseFiniteNumber } from '../../../../server/request/queryparam/parseFiniteNumber';

type ErrorResponse = {
    message: string,
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GetPlaylistsResponse | ErrorResponse>,
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

        const currentUserProfile = await spotifyUserApi.getCurrentUserProfile();

        const offset = parseFiniteNumber(req.query['offset'], 0);
        const limit = parseFiniteNumber(req.query['limit'], 5);

        if (limit === null || offset === null) {
            throw new Error('bad_request');
        }

        const userPlaylistsData = await spotifyUserApi.getUserPlaylists(currentUserProfile.id, limit, offset);

        res.status(200).json(userPlaylistsData);
    } catch (err) {
        console.error('[E]:/api/oauth2/spotify/callback', err);

        res.status(500).json({ message: 'internal_server_error' });
    }
}
