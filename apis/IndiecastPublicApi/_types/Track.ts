import gql from 'graphql-tag';
import { ArtistFragment } from './Artist';

export const TrackFragment = gql`
    ${ArtistFragment}
    fragment TrackFragment on Track {
        id
        name
        artist {
            ...ArtistFragment
        }
        lyrics
        originalUrl
        compressedUrls {
            url
            bitrate
        }
        releases {
            coverImage
        }
    }
`;