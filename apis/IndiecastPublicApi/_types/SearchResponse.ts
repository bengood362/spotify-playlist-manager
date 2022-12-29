import gql from 'graphql-tag';
import { ArtistFragment } from './Artist';
import { TrackFragment } from './Track';

export const SearchResponseFragment = gql`
    ${ArtistFragment}
    ${TrackFragment}
    fragment SearchResponseFragment on SearchResponse {
        tracks {
            ...TrackFragment
        }
        artists {
            ...ArtistFragment
        }
    }
`;