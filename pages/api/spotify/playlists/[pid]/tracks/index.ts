import Promise from 'bluebird';
import type { NextApiRequest, NextApiResponse } from 'next';
import SpotifyUserApi from '../../../../../../apis/SpotifyUserApi';
import type { GetPlaylistTracksResponse } from '../../../../../../apis/SpotifyUserApi/_types/tracks/GetPlaylistTracksResponse';
import { parseAuthorization } from '../../../../../../server/request/header/parseAuthorization';
import { parseFiniteNumber } from '../../../../../../server/request/queryparam/parseFiniteNumber';
import { parseStringArray } from '../../../../../../server/request/queryparam/parseStringArray';

export type PutTrackResponse = { responses: GetPlaylistTracksResponse[] };
export type PostTrackResponse = { responses: GetPlaylistTracksResponse[] };
export type GetTrackResponse = GetPlaylistTracksResponse;
type ErrorResponse = {
    message: string,
}

const addPlaylistItemsChunked = (playlistId: string, uris: string[], startPosition = 0, chunkSize = 100) => async (spotifyUserApi: SpotifyUserApi): Promise<GetPlaylistTracksResponse[]> => {
    const urisBatches = new Array(Math.ceil(uris.length / chunkSize)).fill(0).map((_, index) => uris.slice(index * chunkSize, (index + 1) * chunkSize));

    const responses = await Promise.map(urisBatches, async (urisBatch, index) => {
        const result = await spotifyUserApi.addItemsToPlaylist(
            playlistId,
            {
                uris: urisBatch,
                position: startPosition + index * chunkSize,
            },
        );

        await Promise.delay(500); // 0.5s delay for every pagination

        return result;
    }, { concurrency: 1 });

    return responses;
};

/**
 * Directly overwrite playlist items
 * */
async function put(
    req: NextApiRequest,
    res: NextApiResponse<PutTrackResponse | ErrorResponse>,
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

    const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);
    const playlistId = typeof req.query['pid'] === 'string' ? req.query['pid'] : null;
    const uris = parseStringArray(req.body['uris']);

    if (playlistId === null || uris === null) {
        throw new Error('bad_request');
    }

    // TODO: compare for diff as optimization?
    do {
        const getPlaylistItems = await spotifyUserApi.getPlaylistItems(playlistId);

        if (getPlaylistItems.total === 0) {
            break;
        }

        const uris = getPlaylistItems.items.map(({ track }) => (track.uri));

        await spotifyUserApi.deletePlaylistItems(playlistId, { uris });
        await Promise.delay(500); // 0.5s delay for every pagination
    } while (true);


    const addItemsToPlaylistResponses = await addPlaylistItemsChunked(playlistId, uris, 0, 100)(spotifyUserApi);

    res.status(201).json({ responses: addItemsToPlaylistResponses });
}

/**
 * Direct add items to playlist
 * assumption: no track is inside the playlist yet
 * */
async function post(
    req: NextApiRequest,
    res: NextApiResponse<PostTrackResponse | ErrorResponse>,
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

    const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);
    const playlistId = typeof req.query['pid'] === 'string' ? req.query['pid'] : null;
    const uris = parseStringArray(req.body['uris']);
    const position = parseFiniteNumber(req.body['position'], null);

    if (playlistId === null || uris === null || position === null) {
        throw new Error('bad_request');
    }

    // preflight to check if playlist
    const getPlaylistResponse = await spotifyUserApi.getPlaylistItems(playlistId);

    if (getPlaylistResponse.total > 0) {
        throw new Error('unprocessable_entity');
    }

    const addItemsToPlaylistResponses = await addPlaylistItemsChunked(playlistId, uris, position, 100)(spotifyUserApi);

    res.status(201).json({ responses: addItemsToPlaylistResponses });
}

async function get(
    req: NextApiRequest,
    res: NextApiResponse<GetTrackResponse | ErrorResponse>,
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

    const spotifyUserApi = new SpotifyUserApi(authorization.tokenType, authorization.accessToken);

    const playlistId = typeof req.query['pid'] === 'string' ? req.query['pid'] : null;
    const limit = parseFiniteNumber(req.query['limit'], 5);
    const offset = parseFiniteNumber(req.query['offset'], 0);

    if (playlistId === null || offset === null) {
        throw new Error('bad_request');
    }

    const playlistItems = await spotifyUserApi.getPlaylistItems(playlistId, limit, offset);

    res.status(200).json(playlistItems);
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GetTrackResponse | PutTrackResponse | PostTrackResponse | ErrorResponse>,
) {
    try {
        if (req.method === 'GET') {
            return get(req, res);
        } else if (req.method === 'POST') {
            return post(req, res);
        } else if (req.method === 'PUT') {
            return put(req, res);
        }
    } catch (err) {
        console.error('[E]:/api/oauth2/spotify/playlists/[pid]/tracks', { err, method: req.method });

        res.status(500).json({ message: 'internal_server_error' });
    }
}
