import { useState, useCallback, useRef } from 'react';

interface RateLimitConfig {
    maxCalls: number;
    windowMs: number;
}

interface RateLimitState {
    calls: number[];
    isLimited: boolean;
}

/**
 * Hook para implementar rate limiting em chamadas de API.
 * 
 * @param config - Configuração do rate limit
 * @param config.maxCalls - Número máximo de chamadas permitidas
 * @param config.windowMs - Janela de tempo em milissegundos
 * 
 * @example
 * const { checkLimit, remainingCalls } = useRateLimit({ maxCalls: 10, windowMs: 60000 });
 * 
 * if (checkLimit()) {
 *   await makeApiCall();
 * } else {
 *   alert('Muitas requisições. Aguarde um momento.');
 * }
 */
export const useRateLimit = ({ maxCalls, windowMs }: RateLimitConfig) => {
    const [state, setState] = useState<RateLimitState>({
        calls: [],
        isLimited: false,
    });

    const timeoutRef = useRef<NodeJS.Timeout>();

    const checkLimit = useCallback((): boolean => {
        const now = Date.now();
        const windowStart = now - windowMs;

        // Remove chamadas antigas fora da janela de tempo
        const recentCalls = state.calls.filter(callTime => callTime > windowStart);

        // Verifica se atingiu o limite
        if (recentCalls.length >= maxCalls) {
            setState({
                calls: recentCalls,
                isLimited: true,
            });

            // Auto-reset após a janela de tempo
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setState(prev => ({ ...prev, isLimited: false }));
            }, windowMs);

            return false;
        }

        // Adiciona a nova chamada
        setState({
            calls: [...recentCalls, now],
            isLimited: false,
        });

        return true;
    }, [state.calls, maxCalls, windowMs]);

    const reset = useCallback(() => {
        setState({
            calls: [],
            isLimited: false,
        });
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    const remainingCalls = Math.max(0, maxCalls - state.calls.length);

    return {
        checkLimit,
        reset,
        isLimited: state.isLimited,
        remainingCalls,
        totalCalls: state.calls.length,
    };
};
