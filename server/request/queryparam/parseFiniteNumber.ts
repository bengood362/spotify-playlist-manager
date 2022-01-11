import { QueryParam } from './_types/QueryParam';

export const parseFiniteNumber = (s: QueryParam, fallback: number | null = null): number | null => {
    if (typeof s !== 'string') {
        return fallback;
    }

    const result = parseInt(s);

    if (!isFinite(result)) {
        return fallback;
    }

    return result;
};