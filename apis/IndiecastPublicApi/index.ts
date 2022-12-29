import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { ArtistFragment } from './_types/Artist';
import { TrackFragment } from './_types/Track';

export default class IndiecastPublicApi {
    private readonly apolloClient: ApolloClient<any>;
    private readonly apiHost = process.env.INDIECAST_API_HOST;

    constructor() {
        this.apolloClient = new ApolloClient({
            uri: this.apiHost,
            cache: new InMemoryCache(),
        });
    }

    async search(input: string, offset = 0, limit = 10) {
        const query = gql`
            ${TrackFragment}
            ${ArtistFragment}

            query search($offset: Int, $limit: Int, $input: SearchQueryInput!) {
                search(offset: $offset, limit: $limit, input: $input) {
                    tracks {
                        ...TrackFragment
                    }
                    artists {
                        ...ArtistFragment
                    }
                }
            }
        `;

        return await this.apolloClient.query({
            query: query,
            variables: { input: { query: input }, offset, limit },
        });
    }
}