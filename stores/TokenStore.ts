type Token = {
    accessToken: string;
    refreshToken: string;
}

class TokenStore {
    private tokenMap: Record<string, Token> = {};

    set(key: string, token: Token) {
        this.tokenMap = {
            ...this.tokenMap,
            [key]: token,
        };
    }
}

export const tokenStore = new TokenStore();