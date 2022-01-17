import type { NextApiRequest, NextApiResponse } from 'next';
import SpotifyUserApi from '../../../../apis/SpotifyUserApi';
import { GetPlaylistsResponse } from '../../../../apis/SpotifyUserApi/_types/playlists/GetPlaylistsResponse';
import { PostPlaylistResponse } from '../../../../apis/SpotifyUserApi/_types/playlists/PostPlaylistResponse';
import { parseAuthorization } from '../../../../server/request/header/parseAuthorization';
import { parseFiniteNumber } from '../../../../server/request/queryparam/parseFiniteNumber';

type ErrorResponse = {
    message: string,
}

async function get(
    req: NextApiRequest,
    res: NextApiResponse<GetPlaylistsResponse | ErrorResponse>,
) {
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

    const offset = parseFiniteNumber(req.query['offset'], 0);
    const limit = parseFiniteNumber(req.query['limit'], 5);

    if (limit === null || offset === null) {
        throw new Error('bad_request');
    }

    const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);

    const currentUserProfile = await spotifyUserApi.getCurrentUserProfile();
    const userPlaylistsData = await spotifyUserApi.getUserPlaylists(currentUserProfile.id, limit, offset);

    res.status(200).json(userPlaylistsData);
}

async function post(
    req: NextApiRequest,
    res: NextApiResponse<PostPlaylistResponse | ErrorResponse>,
) {
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

    const name = typeof req.body['name'] === 'string' ? req.body['name'] : null;
    const description = typeof req.body['description'] === 'string' ? req.body['description'] : null;

    if (name === null || description === null) {
        throw new Error('bad_request');
    }

    const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);

    const currentUserProfile = await spotifyUserApi.getCurrentUserProfile();
    const userPlaylistsData = await spotifyUserApi.createPlaylist(currentUserProfile.id, {
        name,
        description,
        collaborative: false,
        public: true,
    });

    res.status(201).json(userPlaylistsData);
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GetPlaylistsResponse | PostPlaylistResponse | ErrorResponse>,
) {
    try {
        if (req.method === 'GET') {
            return get(req, res);
        } else if (req.method === 'POST') {
            return post(req, res);
        } else {
            throw new Error('unexpected_http_method');
        }
    } catch (err) {
        console.error('[E]:/api/oauth2/spotify/callback', { err, method: req.method });

        res.status(500).json({ message: 'internal_server_error' });
    }
}
