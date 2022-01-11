import Redis from 'ioredis';
import { IssueTokenByAuthCodeResponse } from '../apis/SpotifyAuthApi/_types/token/IssueTokenByAuthCodeResponse';

export type SpotifyAuthorization = {
    accessToken: IssueTokenByAuthCodeResponse['access_token'],
    tokenType: IssueTokenByAuthCodeResponse['token_type'],
    refreshToken: IssueTokenByAuthCodeResponse['refresh_token'],
    expiresIn: IssueTokenByAuthCodeResponse['expires_in'],
    scope: IssueTokenByAuthCodeResponse['scope'],

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

    async del(key: string): Promise<void> {
        await this.redisClient.del(this.getRedisKey(key));
    }

    async get(key: string): Promise<SpotifyAuthorization | null> {
        const result = await this.redisClient.hgetall(this.getRedisKey(key));

        return isSpotifyAuthorizationDto(result) ? toSpotifyAuthorization(result) : null;
    }
}

export interface ISpotifyAuthorizationStore {
    set(key: string, authorization: SpotifyAuthorization): Promise<void>
    get(key: string): Promise<SpotifyAuthorization | null>
    del(key: string): Promise<void>
}

// TODO: currently the singleton wont work, as nextjs doesnt "cache" the import
export const spotifyAuthorizationStore = new SpotifyAuthorizationStore();