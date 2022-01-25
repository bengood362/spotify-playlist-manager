import { NextApiRequest, NextApiResponse } from 'next';
import SpotifyUserApi from '../../../../../apis/SpotifyUserApi';
import { GetPlaylistResponse } from '../../../../../apis/SpotifyUserApi/_types/playlists/GetPlaylistResponse';
import { parseAuthorization } from '../../../../../server/request/header/parseAuthorization';

type ErrorResponse = {
    message: string,
}

const get = async (
    req: NextApiRequest,
    res: NextApiResponse<GetPlaylistResponse | ErrorResponse>,
) => {
    if (
        !process.env.SPOTIFY_CLIENT_ID ||
        !process.env.SPOTIFY_CLIENT_SECRET ||
        !process.env.SPOTIFY_REDIRECT_URI
    ) {
        throw new Error('invalid_config');
    }

    const playlistId = typeof req.query['pid'] === 'string' ? req.query['pid'] : null;

    if (playlistId === null) {
        throw new Error('bad_request');
    }

    const cookie = req.headers.cookie ?? '';
    const authorization = await parseAuthorization(cookie);

    if (!authorization) {
        throw new Error('unauthorized');
    }

    const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);

    res.status(200).json(await spotifyUserApi.getPlaylist(playlistId));
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GetPlaylistResponse | ErrorResponse>,
) {
    try {
        if (req.method === 'GET') {
            return get(req, res);
        } else {
            throw new Error('unsupported_method');
        }
    } catch (err) {
        console.error('[E]:/api/oauth2/spotify/playlists/[pid]/tracks', { err, method: req.method });

        res.status(500).json({ message: 'internal_server_error' });
    }
}
