// https://developer.spotify.com/documentation/web-api/reference/#/operations/create-playlist
export type PostPlaylistBody = {
    /** @property {string} name The name for the new playlist, for example "Your Coolest Playlist". This name does not need to be unique; a user may have several playlists with the same name. */
    name: string

    /** @property {boolean} name Defaults to true. If true the playlist will be public, if false it will be private. To be able to create private playlists, the user must have granted the playlist-modify-private scope. */
    public: boolean

    /** @property {boolean} collaborative Defaults to false. If true the playlist will be collaborative. Note: to create a collaborative playlist you must also set public to false. To create collaborative playlists you must have granted playlist-modify-private and playlist-modify-public scopes. */
    collaborative: boolean

    /** @property {string} description value for playlist description as displayed in Spotify Clients and in the Web API. */
    description: string
}