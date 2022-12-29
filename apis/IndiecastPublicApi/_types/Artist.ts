import gql from 'graphql-tag';

export const ArtistFragment = gql`
    fragment ArtistFragment on Artist {
        id
        photos
        name
    }
`;