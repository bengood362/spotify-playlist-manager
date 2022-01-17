import { QueryParam } from './_types/QueryParam';

export const parseStringArray = (s: QueryParam, fallback: string[] | null = null): string[] | null => {
    if (typeof s === 'string') {
        return [s];
    }

    if (Array.isArray(s) && s.every((elem) => typeof elem === 'string')) {
        return s;
    }

    return fallback;
};