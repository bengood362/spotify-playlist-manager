import { GetTokenResponse } from '../../../apis/SpotifyAuthApi/_types/token/GetTokenResponse';
import { SpotifyAuthorization } from '../../../stores/SpotifyAuthorizationStore';

export function fromGetTokenResponse(tokenResponseData: GetTokenResponse, datetime: Date): SpotifyAuthorization {
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
