"use client";
import { useEffect } from 'react';

declare global {
  interface Window {
    TelegramLoginWidget?: any;
  }
}

type Props = {
  botUsername: string; // e.g. cryptomallubot
  onAuth: (user: any) => void;
};

export default function TelegramLogin({ botUsername, onAuth }: Props) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');

    (window as any).onTelegramAuth = async (user: any) => {
      try {
        const res = await fetch('/api/telegram-auth', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ authData: user }),
        });
        const data = await res.json();
        if (data?.ok) {
          onAuth(data.user);
        }
      } catch (_) {}
    };

    document.body.appendChild(script);
    return () => {
      try { document.body.removeChild(script); } catch (_) {}
      delete (window as any).onTelegramAuth;
    };
  }, [botUsername, onAuth]);

  return (
    <div className="inline-block" id="telegram-login-widget" />
  );
}

