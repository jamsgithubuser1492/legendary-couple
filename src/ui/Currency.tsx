const base = import.meta.env.BASE_URL;
const SRC = { coin: 'coin_one', gem: 'gem_blue', box: 'box_standard' } as const;

/** Your painted coin, gem or blind box, sized to sit inside a line of text. */
export function CurrencyIcon({ kind, size = 18 }: { kind: keyof typeof SRC; size?: number }) {
  return <img src={`${base}assets/sprites/${SRC[kind]}.png`} alt={kind} style={{ height: size, width: size }} className="inline-block object-contain align-[-0.2em]" draggable={false} />;
}

export const boxFor = (rarity: 'common' | 'rare' | 'epic' | 'legendary') =>
  ({ common: 'box_standard', rare: 'box_special', epic: 'box_rare', legendary: 'box_grand' })[rarity];

export function BoxImg({ sprite, size = 120, className = '' }: { sprite: string; size?: number; className?: string }) {
  return <img src={`${base}assets/sprites/${sprite}.png`} alt="blind box" style={{ height: size }} className={`mx-auto object-contain ${className}`} draggable={false} />;
}
