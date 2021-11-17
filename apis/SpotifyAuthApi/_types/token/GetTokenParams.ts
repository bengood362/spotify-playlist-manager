/**
 * http://127.0.0.1:3000/api/oauth2/spotify/callback?code=#########
 */
export type GetTokenParams = {
    code: string,
    redirect_uri: string,
    grant_type: string,
}

