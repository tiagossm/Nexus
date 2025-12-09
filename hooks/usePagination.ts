import { useState } from 'react';

interface PaginationConfig {
    initialPage?: number;
    pageSize?: number;
}

interface PaginationResult {
    page: number;
    pageSize: number;
    from: number;
    to: number;
    nextPage: () => void;
    prevPage: () => void;
    setPage: (page: number) => void;
    reset: () => void;
}

/**
 * Hook para gerenciar paginação em queries do Supabase.
 * 
 * @param config Configuração inicial
 * @returns Utilitários de paginação
 */
export const usePagination = ({ initialPage = 0, pageSize = 10 }: PaginationConfig = {}): PaginationResult => {
    const [page, setPage] = useState(initialPage);

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const nextPage = () => setPage((p) => p + 1);
    const prevPage = () => setPage((p) => Math.max(0, p - 1));
    const reset = () => setPage(initialPage);

    return {
        page,
        pageSize,
        from,
        to,
        nextPage,
        prevPage,
        setPage,
        reset,
    };
};
