import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { GOOGLE_CLIENT_ID } from '../lib/api';

type GISWindow = Window & {
  google?: {
    accounts: {
      id: {
        initialize: (opts: Record<string, unknown>) => void;
        renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
      };
    };
  };
};

interface GoogleSignInButtonProps {
  theme?: 'outline' | 'filled_black' | 'filled_blue';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  width?: number;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export function GoogleSignInButton({
  theme = 'filled_black',
  size = 'large',
  text = 'signin_with',
  width = 280,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { gisReady, handleGoogleCredential } = useAuth();

  useEffect(() => {
    if (!gisReady || !containerRef.current) return;
    const w = window as GISWindow;
    if (!w.google?.accounts?.id) return;

    w.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
        try {
          await handleGoogleCredential(response.credential);
          onSuccess?.();
        } catch (e) {
          onError?.(e as Error);
        }
      },
    });

    w.google.accounts.id.renderButton(containerRef.current, {
      theme,
      size,
      text,
      width,
      shape: 'pill',
    });
  }, [gisReady, handleGoogleCredential, theme, size, text, width, onSuccess, onError]);

  if (!gisReady) {
    return (
      <div
        style={{
          width,
          height: 44,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '0.75rem',
          fontFamily: 'Outfit, sans-serif',
          letterSpacing: '0.1em',
        }}
      >
        Loading…
      </div>
    );
  }

  return <div ref={containerRef} />;
}
