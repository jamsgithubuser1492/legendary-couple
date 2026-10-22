import { useEffect, useRef, useState } from 'react';
import { shrinkImage } from './imageUtil';
import { softBtn } from './Sheet';

/** Choose, drop or paste a photo. Dropping an image file on the zone or pasting one while the dialog is open both work. */
export default function PhotoPicker({ value, onChange, max = 640, label = '📷 Add photo', alt = 'photo' }: { value?: string; onChange: (dataUrl: string | undefined) => void; max?: number; label?: string; alt?: string }) {
  const [over, setOver] = useState(false);
  const [err, setErr] = useState('');
  const change = useRef(onChange);
  change.current = onChange;

  const take = async (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setErr('That file is not a picture.');
    try {
      setErr('');
      change.current(await shrinkImage(f, max));
    } catch {
      setErr('That picture could not be read.');
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'));
      if (f) {
        e.preventDefault();
        void take(f);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max]);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-2 border-dashed p-2 transition ${over ? 'border-pink-400 bg-pink-50' : 'border-blush'}`}
      onDragOver={(e) => { if ([...e.dataTransfer.items].some((i) => i.kind === 'file')) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files?.[0]); }}
    >
      <label className={`${softBtn} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-pink-400`}>
        {label}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => void take(e.target.files?.[0])} />
      </label>
      {value ? <img src={value} alt={alt} className="h-16 w-16 rounded-xl object-cover" /> : <span className="hidden text-xs text-cocoa/60 sm:inline">or drop or paste a picture here</span>}
      {value && <button type="button" className="text-xs text-cocoa/60 underline hover:text-cocoa" onClick={() => onChange(undefined)}>Remove</button>}
      {err && <span className="text-xs text-red-500" role="alert">{err}</span>}
    </div>
  );
}
