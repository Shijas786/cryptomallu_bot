"use client";
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    TelegramLoginWidget?: any;
    Telegram?: any;
  }
}

type Props = { botUsername: string; onAuth: (user: any) => void };

export default function TelegramLogin({ botUsername, onAuth }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handledRef = useRef(false);
  useEffect(() => {
    const cleanUsername = (botUsername || '').replace(/^@/, '');
    // 1) If opened inside Telegram WebApp, use built-in user data (no popup)
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user) {
        const initData = tg.initData as string | undefined;
        const params = new URLSearchParams(initData || '');
        const user = tg.initDataUnsafe.user;
        const authPayload: any = {
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          photo_url: user.photo_url,
          auth_date: params.get('auth_date') || undefined,
          hash: params.get('hash') || undefined,
        };
        fetch('/api/telegram-auth', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ authData: authPayload }),
        }).then(r => r.json()).then((d) => { if (d?.ok) onAuth(d.user); });
      }
    } catch (_) {}

    // 2) Otherwise, load the Login Widget (popup)
    const callbackUrl = `${location.origin}/api/telegram-auth/callback`;
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', cleanUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-userpic', 'false');
    // Use popup + server callback flow (and keep onAuth fallback)
    script.setAttribute('data-auth-url', callbackUrl);
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    // Force popup mode to avoid inline inside some CSPs
    script.setAttribute('data-radius', '4');
    script.setAttribute('data-request-access', 'write');

    (window as any).onTelegramAuth = async (user: any) => {
      try {
        if (handledRef.current) return; // avoid duplicate calls
        handledRef.current = true;
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

    const onMsg = (ev: MessageEvent) => {
      const d = (ev?.data as any) || {};
      if (d?.type === 'tg-auth' && d?.data?.ok) {
        onAuth(d.data.user);
      }
    };
    window.addEventListener('message', onMsg);
    if (containerRef.current) {
      try { containerRef.current.innerHTML = ''; } catch {}
      containerRef.current.appendChild(script);
    } else {
      document.body.appendChild(script);
    }
    return () => {
      try {
        if (containerRef.current && script.parentElement === containerRef.current) {
          containerRef.current.removeChild(script);
        } else if (script.parentElement) {
          script.parentElement.removeChild(script);
        }
      } catch (_) {}
      window.removeEventListener('message', onMsg);
      delete (window as any).onTelegramAuth;
      handledRef.current = false;
    };
  }, [botUsername, onAuth]);

  return <div className="inline-block text-white/70" ref={containerRef} id="telegram-login-widget">Waiting for Telegram…</div>;
}

