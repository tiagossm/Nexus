import React, { useEffect } from 'react';

export const OAuthSuccessPage: React.FC = () => {
    useEffect(() => {
        // Notify parent window if opened as popup
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');

        if (window.opener) {
            window.opener.postMessage({ type: 'GMAIL_CONNECTED', email }, '*');
        }

        // Auto-close after 2 seconds
        setTimeout(() => {
            window.close();
        }, 2000);
    }, []);

    const email = new URLSearchParams(window.location.search).get('email');

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            margin: 0,
            background: 'linear-gradient(135deg, #f0f9f0 0%, #e8f5e8 100%)',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{
                textAlign: 'center',
                padding: '50px',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '28px',
                    color: 'white'
                }}>
                    ✓
                </div>
                <h1 style={{ color: '#22c55e', margin: '0 0 10px', fontSize: '24px' }}>
                    Gmail Conectado!
                </h1>
                {email && (
                    <p style={{ color: '#666', margin: '0 0 20px', fontSize: '14px' }}>
                        {email}
                    </p>
                )}
                <p style={{ color: '#999', margin: 0, fontSize: '12px' }}>
                    Esta janela fechará automaticamente...
                </p>
            </div>
        </div>
    );
};
