import { IssueTokenByAuthCodeResponse } from './IssueTokenByAuthCodeResponse';

// https://developer.spotify.com/documentation/general/guides/authorization/code-flow/
export type IssueTokenByRefreshTokenResponse = Omit<IssueTokenByAuthCodeResponse, 'refresh_token'>;