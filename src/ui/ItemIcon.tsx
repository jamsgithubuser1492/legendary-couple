import { itemOf } from '../state/catalog';

/** Shows the real art sprite for an item, or its emoji when there is no art yet. */
export default function ItemIcon({ id, size = 40 }: { id: string; size?: number }) {
  const item = itemOf(id);
  if (!item) return null;
  if (item.sprite) {
    return (
      <img
        src={`${import.meta.env.BASE_URL}assets/sprites/${item.sprite}.png`}
        alt={item.name}
        style={{ height: size, maxWidth: size * 1.6 }}
        className="mx-auto object-contain"
        draggable={false}
      />
    );
  }
  return <span style={{ fontSize: size * 0.8 }}>{item.icon}</span>;
}

/** Any sprite texture by key, for outfits and other art that is not a catalog item. */
export function SpriteImg({ sprite, size = 40 }: { sprite: string; size?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}assets/sprites/${sprite}.png`}
      alt=""
      style={{ height: size, maxWidth: size * 1.6 }}
      className="mx-auto object-contain"
      draggable={false}
    />
  );
}

/** A painted interface icon from the sprite sheets (quadrant icons, bids, streak flames and so on). */
export function ArtImg({ name, size = 32, className = '' }: { name: string; size?: number; className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}assets/sprites/${name}.png`} alt="" style={{ height: size, width: size }} className={`inline-block object-contain align-[-0.25em] ${className}`} draggable={false} />;
}

export const QuadIcon = ({ id, size = 22 }: { id: string; size?: number }) => <ArtImg name={`ui_quad_${id}`} size={size} />;
