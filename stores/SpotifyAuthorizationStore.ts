import Redis from 'ioredis';
import { GetTokenResponse } from '../apis/SpotifyAuthApi/_types/token/GetTokenResponse';

export type SpotifyAuthorization = {
    accessToken: GetTokenResponse['access_token'],
    tokenType: GetTokenResponse['token_type'],
    refreshToken: GetTokenResponse['refresh_token'],
    expiresIn: GetTokenResponse['expires_in'],
    scope: GetTokenResponse['scope'],

    /**
     * @property {issuedAt} string An Access Token that can be provided in subsequent calls, for example to Spotify Web API services.
     **/
    issuedAt: number
}

type SpotifyAuthorizationDto = Omit<SpotifyAuthorization, 'issuedAt' | 'expiresIn'> & {
    issuedAt: string,
    expiresIn: string,
}

function isSpotifyAuthorizationDto(r: Record<string, any>): r is SpotifyAuthorizationDto {
    return (
        typeof r['accessToken'] === 'string' &&
        typeof r['tokenType'] === 'string' &&
        typeof r['refreshToken'] === 'string' &&
        typeof r['expiresIn'] === 'string' && !isNaN(parseInt(r['expiresIn'])) &&
        typeof r['scope'] === 'string' &&
        typeof r['issuedAt'] === 'string' && !isNaN(parseInt(r['issuedAt']))
    );
}

function toSpotifyAuthorization(sad: SpotifyAuthorizationDto): SpotifyAuthorization {
    return {
        ...sad,
        expiresIn: parseInt(sad.expiresIn),
        issuedAt: parseInt(sad.issuedAt),
    };
}

class SpotifyAuthorizationStore implements ISpotifyAuthorizationStore {
    private redisClient: Redis.Redis;
    private prefix: string;
    public authorizationMap: Record<string, SpotifyAuthorization> = {};

    constructor() {
        const { REDIS_URL, REDIS_PORT, REDIS_PASSWORD, REDIS_SECURE } = process.env;

        this.redisClient = new Redis(`redis${REDIS_SECURE === 't' ? 's' : ''}://:${REDIS_PASSWORD}@${REDIS_URL}:${REDIS_PORT}`, { maxRetriesPerRequest: 3 });
        this.prefix = 'spotify-copy-sess:';
    }

    private getRedisKey(key: string): string {
        return `${this.prefix}:${key}`;
    }

    async set(key: string, authorization: SpotifyAuthorization): Promise<void> {
        await this.redisClient.hset(this.getRedisKey(key), authorization);
    }

    async get(key: string): Promise<SpotifyAuthorization | null> {
        const result = await this.redisClient.hgetall(this.getRedisKey(key));

        return isSpotifyAuthorizationDto(result) ? toSpotifyAuthorization(result) : null;
    }
}

export interface ISpotifyAuthorizationStore {
    set(key: string, authorization: SpotifyAuthorization): Promise<void>
    get(key: string): Promise<SpotifyAuthorization | null>
}

// TODO: currently the singleton wont work, as nextjs doesnt "cache" the import
export const spotifyAuthorizationStore = new SpotifyAuthorizationStore();