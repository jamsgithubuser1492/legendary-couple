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
