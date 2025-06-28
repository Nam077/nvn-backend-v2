export const PAGINATION_TYPE = {
    OFFSET: 'offset',
    CURSOR: 'cursor',
} as const;

export type PaginationType = (typeof PAGINATION_TYPE)[keyof typeof PAGINATION_TYPE];
