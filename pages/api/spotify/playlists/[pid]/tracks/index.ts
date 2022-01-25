import Promise from 'bluebird';
import type { NextApiRequest, NextApiResponse } from 'next';
import SpotifyUserApi from '../../../../../../apis/SpotifyUserApi';
import { DeletePlaylistItemsResponse } from '../../../../../../apis/SpotifyUserApi/_types/playlists/tracks/DeletePlaylistItemsResponse';
import type { GetPlaylistTracksResponse } from '../../../../../../apis/SpotifyUserApi/_types/tracks/GetPlaylistTracksResponse';
import { parseAuthorization } from '../../../../../../server/request/header/parseAuthorization';
import { parseFiniteNumber } from '../../../../../../server/request/queryparam/parseFiniteNumber';
import { parseStringArray } from '../../../../../../server/request/queryparam/parseStringArray';

export type PutTrackBody = { uris: string[], snapshotId: string };
export type PutTrackResponse = { responses: GetPlaylistTracksResponse[] };
export type PostTrackBody = { uris: string[], position: number };
export type PostTrackResponse = { responses: GetPlaylistTracksResponse[] };
export type GetTrackResponse = GetPlaylistTracksResponse;
type ErrorResponse = {
    message: string,
}

const chunk = <T>(array: T[], chunkSize: number): T[][] => {
    const chunkedArray = new Array(Math.ceil(array.length / chunkSize)).fill(0).map((_, index) => array.slice(index * chunkSize, (index + 1) * chunkSize));

    return chunkedArray;
};

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
const batchGetPlaylistItemsResponses = (playlistId: string) => async (spotifyUserApi: SpotifyUserApi): Promise<GetPlaylistTracksResponse[]> => {
    // TODO: stack overflow...!
    async function getPlaylistItems(playlistId: string, pageSize = 50, offset = 0, total: GetPlaylistTracksResponse[] = []): Promise<GetPlaylistTracksResponse[]> {
        const getPlaylistItemsResponse = await spotifyUserApi.getPlaylistItems(playlistId, pageSize, offset);

        if (offset >= getPlaylistItemsResponse.total) {
            return total;
        }

        await Promise.delay(500);

        return await getPlaylistItems(playlistId, pageSize, offset + getPlaylistItemsResponse.items.length, [...total, getPlaylistItemsResponse]);
    }

    const playlistResponses = await getPlaylistItems(playlistId);

    return playlistResponses;
};

// TODO: spotify has bug for batch deleting playlist that has same items
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
const batchDeletePlaylistItems = (playlistId: string, uris: string[], chunkSize = 30) => async (spotifyUserApi: SpotifyUserApi): Promise<DeletePlaylistItemsResponse[]> => {
    const urisBatches = chunk(uris, chunkSize);

    // TODO: rate limiting
    const responses = await Promise.reduce<string[], DeletePlaylistItemsResponse[]>(urisBatches, async (responses, uris) => {
        const lastResponse = responses.length > 0 ? responses[responses.length - 1] : null;
        const response = await spotifyUserApi.deletePlaylistItems(playlistId, {
            tracks: uris.map((uri) => ({ uri })),
            ...(lastResponse ? { snapshot_id: lastResponse.snapshot_id } : {}),
        });

        await Promise.delay(500);

        return [...responses, response];
    }, []);

    return responses;
};

const addPlaylistItemsChunked = (playlistId: string, uris: string[], startPosition = 0, chunkSize = 50) => async (spotifyUserApi: SpotifyUserApi): Promise<GetPlaylistTracksResponse[]> => {
    const urisBatches = chunk(uris, chunkSize);

    // TODO: rate limiting
    const responses = await Promise.map(urisBatches, async (urisBatch, index) => {
        const result = await spotifyUserApi.addItemsToPlaylist(
            playlistId,
            {
                uris: urisBatch,
                position: startPosition + index * chunkSize,
            },
        );

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
    const snapshotId = typeof req.body['snapshotId'] === 'string' ? req.body['snapshotId'] : null;

    if (playlistId === null || uris === null || snapshotId === null) {
        throw new Error('bad_request');
    }

    // TODO: compare for diff as optimization?
    const playlistItemsResponses = await batchGetPlaylistItemsResponses(playlistId)(spotifyUserApi);
    const tracks = playlistItemsResponses.map((response) => (
        response.items.map(({ track }) => (track))
    )).reduce((acc, next) => [...acc, ...next], []);
    const trackUris = tracks.map((track) => {
        // NOTE: spotify market region issue - different region has different uri
        if (track.linked_from) {
            return track.linked_from.uri;
        } else {
            return track.uri;
        }
    });

    await batchDeletePlaylistItems(playlistId, trackUris)(spotifyUserApi);

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
    const position = typeof req.body['position'] === 'number' ? req.body['position'] : null;

    if (playlistId === null || uris === null || position === null) {
        throw new Error('bad_request');
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
    const limit = parseFiniteNumber(req.query['limit'], 50);
    const offset = parseFiniteNumber(req.query['offset'], 0);

    if (playlistId === null || offset === null) {
        throw new Error('bad_request');
    }

    const playlistItems = await spotifyUserApi.getPlaylistItems(playlistId, limit, offset);

    res.setHeader('Cache-Control', 'no-store');
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
