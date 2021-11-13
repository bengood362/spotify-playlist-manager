export type ErrorProps = {
    error: string,
}

export function isErrorProps(r: Record<string, unknown>): r is ErrorProps {
    return typeof r['error'] === 'string';
}