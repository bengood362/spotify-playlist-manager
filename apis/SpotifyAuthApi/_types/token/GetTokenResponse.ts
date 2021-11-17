// https://developer.spotify.com/documentation/general/guides/authorization/code-flow/
export type GetTokenResponse = {
    /**
     * @property {access_token} string An Access Token that can be provided in subsequent calls, for example to Spotify Web API services.
     **/
    access_token: string,
    /**
     * @property {token_type} string How the Access Token may be used: always “Bearer”.
     */
    token_type: string,
    /**
     * @property {scope} string A space-separated list of scopes which have been granted for this access_token
     */
    scope: string,
    /**
     * @property {expires_in} integer The time period (in seconds) for which the Access Token is valid.
     */
    expires_in: number,
    /**
     * @property {refresh_token} string A token that can be sent to the Spotify Accounts service in place of an authorization code. (When the access code expires, send a POST request to the Accounts service /api/token endpoint, but use this code in place of an authorization code. A new Access Token will be returned. A new refresh token might be returned too.)
     */
    refresh_token: string,
}
