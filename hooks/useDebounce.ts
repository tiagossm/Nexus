import { useState, useEffect } from 'react';

/**
 * Hook para atrasar a atualização de um valor até que o usuário pare de digitar.
 * Útil para inputs de busca e filtros.
 * 
 * @param value O valor a ser "debounced"
 * @param delay O atraso em milissegundos (padrão: 500ms)
 * @returns O valor atualizado após o atraso
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
