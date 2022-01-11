import { IssueTokenByAuthCodeResponse } from '../../../apis/SpotifyAuthApi/_types/token/IssueTokenByAuthCodeResponse';
import { IssueTokenByRefreshTokenResponse } from '../../../apis/SpotifyAuthApi/_types/token/IssueTokenByRefreshTokenResponse';
import { SpotifyAuthorization } from '../../../stores/SpotifyAuthorizationStore';

export function fromIssueTokenByAuthCodeResponse(tokenResponseData: IssueTokenByAuthCodeResponse, datetime: Date): SpotifyAuthorization {
    const {
        access_token: accessToken,
        expires_in: expiresIn,
        refresh_token: refreshToken,
        scope: scope,
        token_type: tokenType,
    } = tokenResponseData;

    const authorization = {
        accessToken,
        refreshToken,
        tokenType,
        scope,
        expiresIn,
        issuedAt: Math.floor(datetime.getTime() / 1000),
    };

    return authorization;
}

export function fromIssueTokenByRefreshTokenResponse(tokenResponseData: IssueTokenByRefreshTokenResponse, datetime: Date): Omit<SpotifyAuthorization, 'refreshToken'> {
    const {
        access_token: accessToken,
        expires_in: expiresIn,
        scope: scope,
        token_type: tokenType,
    } = tokenResponseData;

    const authorization = {
        accessToken,
        tokenType,
        scope,
        expiresIn,
        issuedAt: Math.floor(datetime.getTime() / 1000),
    };

    return authorization;
}
