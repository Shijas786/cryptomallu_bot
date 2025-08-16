"use client";
import { useMemo, useState } from 'react';

type Species = {
  id: number;
  name: string;
  family: string;
  status: 'Critically Endangered' | 'Endangered' | 'Vulnerable' | 'Near Threatened';
  hue: number; // base hue for shard gradient
};

const SPECIES: Species[] = [
  { id: 1, name: 'Helmeted Hornbill', family: 'Hornbill', status: 'Critically Endangered', hue: 10 },
  { id: 2, name: 'Vaquita', family: 'Porpoise', status: 'Critically Endangered', hue: 200 },
  { id: 3, name: 'Golden Lion Tamarin', family: 'Monkey', status: 'Endangered', hue: 38 },
  { id: 4, name: 'Forest Owlet', family: 'Bird', status: 'Critically Endangered', hue: 260 },
  { id: 5, name: 'Kemp’s Ridley Sea Turtle', family: 'Turtle', status: 'Critically Endangered', hue: 150 },
  { id: 6, name: 'Red Panda', family: 'Panda', status: 'Vulnerable', hue: 350 },
  { id: 7, name: 'Okapi', family: 'Giraffid', status: 'Endangered', hue: 310 },
  { id: 8, name: 'Sumatran Rhino', family: 'Rhinoceros', status: 'Critically Endangered', hue: 5 },
];

export default function InPiecesPage() {
  const [current, setCurrent] = useState(0);
  const s = SPECIES[current];
  const statusColor = useMemo(() => {
    switch (s.status) {
      case 'Critically Endangered': return '#ef4444';
      case 'Endangered': return '#f59e0b';
      case 'Vulnerable': return '#eab308';
      default: return '#22c55e';
    }
  }, [s.status]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col lg:flex-row items-start gap-10">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">In Pieces — Tribute</h1>
          <p className="text-white/70 mt-2 max-w-2xl">
            30 species. 30 pieces. 1 fragmented survival. This page is a lightweight, CSS‑based tribute to
            the original interactive exhibition. Select a species to morph the shard composition.
          </p>
          <div className="mt-2 text-xs text-white/40">
            Inspired by the interactive exhibition at <a className="underline" href={`http://species-in-pieces.com/#`} target="_blank" rel="noreferrer">species‑in‑pieces.com</a>.
          </div>

          <div className="mt-6 overflow-x-auto whitespace-nowrap no-scrollbar">
            {SPECIES.map((sp, i) => (
              <button
                key={sp.id}
                onClick={() => setCurrent(i)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 mr-2 border transition-colors ${i === current ? 'bg-white/10 border-white/30' : 'border-white/10 hover:border-white/30'}`}
                style={{
                  color: i === current ? 'white' : 'rgba(255,255,255,0.85)',
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: `hsl(${sp.hue} 80% 55%)` }}
                />
                <span className="text-sm">{sp.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-8">
            <div className="relative mx-auto h-[360px] w-[360px] sm:h-[420px] sm:w-[420px]">
              <ShardComposition hue={s.hue} key={s.id} />
            </div>
            <div className="mt-4">
              <div className="text-lg font-semibold">{s.name}</div>
              <div className="text-white/60 text-sm">{s.family} · <span style={{ color: statusColor }}>{s.status}</span></div>
            </div>
          </div>
        </div>

        <aside className="w-full lg:w-[360px]">
          <div className="card p-5">
            <div className="font-semibold">How it’s made (Tribute)</div>
            <p className="text-white/70 text-sm mt-2">
              This simplified composition uses only CSS clip‑path polygons and transforms. Each “piece” is an
              animated triangle that rotates and shifts subtly when you change species, producing a shard‑like
              morph.
            </p>
            <div className="text-white/50 text-xs mt-2">
              No external assets. Works in modern browsers with CSS clip‑path support.
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .card { border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.03); }
        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

function ShardComposition({ hue }: { hue: number }) {
  // 12 shards around a circle; animate position/rotation with CSS variables
  const shards = new Array(12).fill(0).map((_, i) => i);
  const base = useMemo(() => ({
    hueA: hue,
    hueB: (hue + 30) % 360,
    rotJitter: (hue % 7) - 3, // -3..+3
  }), [hue]);

  return (
    <div
      className="absolute inset-0"
      style={{
        '--hueA': String(base.hueA),
        '--hueB': String(base.hueB),
      } as React.CSSProperties}
    >
      <div className="absolute inset-0 rounded-xl" style={{
        background: 'radial-gradient(80% 80% at 50% 50%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0) 100%)',
        border: '1px solid rgba(255,255,255,0.06)'
      }} />
      {shards.map((i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 shard"
          style={{
            transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
            animationDelay: `${(i % 6) * 70}ms`,
          }}
        />
      ))}
      <style jsx>{`
        .shard {
          width: 72%;
          height: 72%;
          --grad: linear-gradient(135deg, hsl(var(--hueA) 85% 58% / 0.9), hsl(var(--hueB) 85% 58% / 0.9));
          background: var(--grad);
          clip-path: polygon(50% 8%, 58% 50%, 50% 92%);
          mix-blend-mode: screen;
          filter: drop-shadow(0 6px 22px rgba(0,0,0,0.35));
          opacity: 0.92;
          transition: background 400ms ease, transform 600ms ease;
          animation: float 2600ms ease-in-out infinite alternate;
        }
        @keyframes float {
          0%   { transform: translate(-50%, -50%) rotate(0deg)   translateY(-3%); }
          100% { transform: translate(-50%, -50%) rotate(6deg)   translateY(3%); }
        }
      `}</style>
    </div>
  );
}

