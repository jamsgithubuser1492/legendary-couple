import { useState } from 'react';
import type { LifeArea, PlayerId, Quest } from '../types';
import { AREAS, areaOf, SEASON_EVENTS, TEMPLATES, type QuestTemplate } from '../state/areas';
import { THEMES, useTheme } from '../state/season';
import { approveQuest, createQuest, deleteQuest, otherPlayer, pendingFor, requestEdit, submitQuest, useGameState, useMe } from '../state/store';
import { shrinkImage } from './imageUtil';
import { QuadIcon } from './ItemIcon';
import { CATALOG, itemOf } from '../state/catalog';
import { QUADRANTS, quadrantInfo, quadrantOf } from '../state/quadrants';
import type { Quadrant } from '../types';

type Tab = 'active' | 'verify' | 'done';

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-cocoa/30 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92%] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-cream p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-cocoa">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-blush px-3 py-1 font-bold text-cocoa" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const field = 'w-full rounded-xl border-2 border-blush bg-white px-3 py-2 text-cocoa outline-none focus:border-pink-400';
const primary = 'rounded-full bg-pink-400 px-5 py-2 font-display font-bold text-white shadow active:scale-95 disabled:opacity-40';
const soft = 'rounded-full bg-blush px-4 py-2 font-display font-bold text-cocoa active:scale-95';

// ---------- create ----------

function NewQuestModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const me = useMe();
  const [title, setTitle] = useState('');
  const [area, setArea] = useState<LifeArea>('romance');
  const [quadrant, setQuadrant] = useState<Quadrant>('romance');
  const [ifThen, setIfThen] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<PlayerId>(me);
  const [coins, setCoins] = useState(25);
  const [gems, setGems] = useState(0);
  const [recurring, setRecurring] = useState(false);
  const [itemId, setItemId] = useState('');
  const [milestone, setMilestone] = useState(false);
  const [boxes, setBoxes] = useState(0);

  const applyTemplate = (t: QuestTemplate) => {
    setTitle(t.title);
    setArea(t.area);
    setQuadrant(quadrantOf({ area: t.area }));
    setDescription(t.description);
    setCoins(t.reward.coins);
    setGems(t.reward.gems);
    setRecurring(!!t.recurring);
    setMilestone(!!t.milestone);
    setBoxes(t.reward.blindBoxes ?? 0);
    if (t.suggestedFor) setAssignedTo(t.suggestedFor);
  };

  return (
    <Sheet title="New quest" onClose={onClose}>
      <p className="mb-1 text-xs font-bold uppercase text-cocoa/60">Quick templates</p>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {TEMPLATES.map((t) => (
          <button key={t.title} onClick={() => applyTemplate(t)} className="shrink-0 rounded-full bg-peach px-3 py-1 text-sm text-cocoa active:scale-95">
            {areaOf(t.area).icon} {t.title}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <input className={field} placeholder="Quest title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={field} rows={2} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {QUADRANTS.map((q) => (
            <button key={q.id} onClick={() => { setQuadrant(q.id); setArea(q.area); }} className={`rounded-full px-3 py-1 text-sm text-cocoa ${q.color} ${quadrant === q.id ? 'ring-4 ring-pink-300' : 'opacity-70'}`}>
              <QuadIcon id={q.id} size={20} /> {q.label}
            </button>
          ))}
        </div>
        <p className="-mt-1 text-xs text-cocoa/70"><QuadIcon id={quadrant} size={16} /> {quadrantInfo(quadrant).mechanic}: {quadrantInfo(quadrant).hook}</p>
        <input className={field} placeholder="If-Then plan (optional): IF it is 7 AM, THEN I will walk for 20 mins" value={ifThen} onChange={(e) => setIfThen(e.target.value)} />
        <div className="flex items-center gap-2 text-sm text-cocoa">
          <span className="font-bold">Assigned to</span>
          {(['A', 'B'] as PlayerId[]).map((p) => (
            <button key={p} onClick={() => setAssignedTo(p)} className={`rounded-full px-3 py-1 ${assignedTo === p ? 'bg-pink-400 text-white' : 'bg-blush'}`}>
              {s.names[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-cocoa">
          <label className="flex items-center gap-1">🪙<input type="number" min={0} className={`${field} w-20`} value={coins} onChange={(e) => setCoins(Math.max(0, +e.target.value))} /></label>
          <label className="flex items-center gap-1">📦<input type="number" min={0} className={`${field} w-16`} value={boxes} onChange={(e) => setBoxes(Math.max(0, +e.target.value))} /></label>
          <label className="flex items-center gap-1">💎<input type="number" min={0} className={`${field} w-20`} value={gems} onChange={(e) => setGems(Math.max(0, +e.target.value))} /></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Repeats</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={milestone} onChange={(e) => setMilestone(e.target.checked)} /> Milestone</label>
        </div>
        <label className="flex items-center gap-2 text-sm text-cocoa">
          🎁 Bonus item
          <select className={field} value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">None</option>
            {CATALOG.map((i) => <option key={i.id} value={i.id}>{i.icon} {i.name}</option>)}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button className={soft} onClick={onClose}>Cancel</button>
          <button
            className={primary}
            disabled={!title.trim()}
            onClick={() => {
              createQuest({ title: title.trim(), area, quadrant, ifThen: ifThen.trim() || undefined, description: description.trim() || undefined, assignedTo, reward: { coins, gems, itemId: itemId || undefined, blindBoxes: boxes || undefined }, recurring, milestone });
              onClose();
            }}
          >
            Add quest
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// ---------- submit evidence ----------

function SubmitModal({ quest, onClose }: { quest: Quest; onClose: () => void }) {
  const s = useGameState();
  const [note, setNote] = useState(quest.evidenceNote ?? '');
  const [photo, setPhoto] = useState<string | undefined>(quest.evidencePhoto);
  const partner = s.names[otherPlayer(quest.assignedTo)];
  const quad = quadrantOf(quest);
  const needsTakeaway = quad === 'learning';
  return (
    <Sheet title="Mark as done" onClose={onClose}>
      <p className="mb-3 text-cocoa">
        <b>{quest.title}</b> will wait for {partner} to approve it before the reward unlocks.
      </p>
      {quest.reviewNote && <p className="mb-3 rounded-xl bg-peach p-3 text-sm text-cocoa">💬 {partner} asked: {quest.reviewNote}</p>}
      {needsTakeaway && <p className="mb-2 rounded-xl bg-sky/60 p-3 text-sm text-cocoa">📚 Share your Key Takeaway in one sentence. Once approved it becomes a book on your shared Wisdom Bookshelf.</p>}
      {quad === 'health' && <p className="mb-2 rounded-xl bg-green-100 p-3 text-sm text-cocoa">💪 A quick post workout photo or a smartwatch screenshot helps your partner say yes. If you both finish a health goal today, you earn a Synergy Aura (1.5x coins for 24 hours).</p>}
      <textarea className={field} rows={3} placeholder={needsTakeaway ? 'Key Takeaway (required): the one thing you learned' : 'Optional note, e.g. what you did'} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-3 flex items-center gap-3">
        <label className={`${soft} cursor-pointer`}>
          📷 Add photo
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await shrinkImage(f)); }} />
        </label>
        {photo && <img src={photo} alt="evidence" className="h-16 w-16 rounded-xl object-cover" />}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className={soft} onClick={onClose}>Cancel</button>
        <button className={primary} disabled={needsTakeaway && !note.trim()} onClick={() => { submitQuest(quest.id, { note, photo }); onClose(); }}>Send for approval</button>
      </div>
    </Sheet>
  );
}

// ---------- approve ----------

function ApprovalModal({ quest, onClose }: { quest: Quest; onClose: () => void }) {
  const s = useGameState();
  const me = useMe();
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState('');
  return (
    <Sheet title={`Verify: ${quest.title}`} onClose={onClose}>
      <p className="text-sm text-cocoa/70">{s.names[quest.assignedTo]} says this is done.</p>
      {quest.evidenceNote && <p className="mt-3 rounded-xl bg-white p-3 text-cocoa">“{quest.evidenceNote}”</p>}
      {quest.evidencePhoto && <img src={quest.evidencePhoto} alt="evidence" className="mt-3 max-h-64 rounded-2xl" />}
      {!quest.evidenceNote && !quest.evidencePhoto && <p className="mt-3 text-sm italic text-cocoa/60">No evidence attached. Trust is part of the game.</p>}
      <p className="mt-3 text-sm text-cocoa">Reward: 🪙 {quest.reward.coins} {quest.reward.gems > 0 && `💎 ${quest.reward.gems}`}</p>
      {asking ? (
        <div className="mt-3 space-y-2">
          <input className={field} placeholder="What should they add or fix?" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className={soft} onClick={() => setAsking(false)}>Back</button>
            <button className={primary} onClick={() => { requestEdit(quest.id, me, msg); onClose(); }}>Send request</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex justify-end gap-2">
          <button className={soft} onClick={() => setAsking(true)}>Request edit</button>
          <button className={primary} onClick={() => { approveQuest(quest.id, me); onClose(); }}>Approve ✓</button>
        </div>
      )}
    </Sheet>
  );
}

// ---------- card ----------

function QuestCard({ quest, onSubmit, onReview, onCapture }: { quest: Quest; onSubmit: () => void; onReview: () => void; onCapture: () => void }) {
  const s = useGameState();
  const captured = s.memories.some((m) => m.questId === quest.id);
  const me = useMe();
  const qd = quadrantInfo(quadrantOf(quest));
  const mine = quest.assignedTo === me;
  const who = s.names[quest.assignedTo];
  return (
    <div className="rounded-2xl bg-white p-3 shadow">
      <div className="flex items-start gap-2">
        <span className={`rounded-full px-2 py-1 text-lg ${qd.color}`}><QuadIcon id={qd.id} size={26} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-cocoa">{quest.title}{quest.recurring && <span className="ml-1 text-xs font-normal text-cocoa/60">↻ repeats</span>}</div>
          {quest.description && <div className="text-sm text-cocoa/70">{quest.description}</div>}
          {quest.ifThen && <div className="text-xs italic text-cocoa/70">🎯 {quest.ifThen}</div>}
          <div className="mt-1 text-xs text-cocoa/60">{who} · 🪙 {quest.reward.coins}{quest.reward.gems > 0 && ` · 💎 ${quest.reward.gems}`}{quest.reward.itemId && ` · 🎁 ${itemOf(quest.reward.itemId)?.name}`}{quest.reward.blindBoxes ? ` · 📦 ${quest.reward.blindBoxes} blind box` : ''}</div>
          {quest.status === 'REJECTED' && quest.reviewNote && <div className="mt-1 rounded-lg bg-peach px-2 py-1 text-xs text-cocoa">💬 {quest.reviewNote}</div>}
        </div>
        {quest.status === 'IN_PROGRESS' && <button onClick={() => deleteQuest(quest.id)} className="text-cocoa/30" aria-label="Delete quest">🗑</button>}
      </div>
      <div className="mt-2 flex justify-end">
        {(quest.status === 'IN_PROGRESS' || quest.status === 'REJECTED') &&
          (mine ? <button className={primary} onClick={onSubmit}>{quest.status === 'REJECTED' ? 'Resubmit' : 'Mark done'}</button> : <span className="text-xs text-cocoa/60">Waiting on {who}</span>)}
        {quest.status === 'PENDING_VERIFICATION' &&
          (mine ? <span className="text-xs text-cocoa/60">⏳ Waiting for {s.names[otherPlayer(me)]} to approve</span> : <button className={primary} onClick={onReview}>Review ✓</button>)}
        {quest.status === 'APPROVED' && (
          <span className="flex items-center gap-2">
            <span className="text-xs font-bold text-green-600">✓ Approved</span>
            {quest.milestone && !captured && <button className={soft} onClick={onCapture}>📔 Capture memory</button>}
            {quest.milestone && captured && <span className="text-xs text-cocoa/60">📔 In your journal</span>}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------- board ----------

function SeasonalStrip() {
  const theme = useTheme();
  const me = useMe();
  const [open, setOpen] = useState(true);
  const info = THEMES.find((t) => t.id === theme)!;
  return (
    <div className="mb-3 rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3">
      <button className="flex w-full items-center justify-between font-display font-bold text-cocoa" onClick={() => setOpen(!open)}>
        <span>{info.icon} {info.label} events</span>
        <span className="text-xs font-normal text-cocoa/60">{open ? 'hide' : 'show'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {SEASON_EVENTS[theme].map((t) => (
            <div key={t.title} className="flex items-center gap-2 rounded-xl bg-white/80 p-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-cocoa">{t.title}{t.milestone && ' 📔'}</div>
                <div className="text-xs text-cocoa/60">🪙 {t.reward.coins} · 💎 {t.reward.gems}{t.reward.itemId && ` · 🎁 ${itemOf(t.reward.itemId)?.name}`}</div>
              </div>
              <button
                className={soft}
                onClick={() => createQuest({ title: t.title, area: t.area, description: t.description, assignedTo: me, reward: t.reward, milestone: t.milestone })}
              >
                ＋ Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuestBoard({ onClose, onCaptureMemory }: { onClose: () => void; onCaptureMemory: (q: Quest) => void }) {
  const s = useGameState();
  const me = useMe();
  const [tab, setTab] = useState<Tab>('active');
  const [area, setArea] = useState<LifeArea | 'all'>('all');
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const toVerify = pendingFor(s, me).length;
  const byArea = (q: Quest) => area === 'all' || q.area === area;
  const list = s.quests.filter(byArea).filter((q) =>
    tab === 'active' ? q.status === 'IN_PROGRESS' || q.status === 'REJECTED'
    : tab === 'verify' ? q.status === 'PENDING_VERIFICATION'
    : q.status === 'APPROVED',
  );
  const find = (id: string | null) => s.quests.find((q) => q.id === id);
  const subQ = find(submitting);
  const revQ = find(reviewing);

  const tabBtn = (t: Tab, label: string, badge = 0) => (
    <button onClick={() => setTab(t)} className={`relative rounded-full px-4 py-1.5 font-display font-bold ${tab === t ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>
      {label}
      {badge > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">{badge}</span>}
    </button>
  );

  return (
    <div className="absolute inset-0 z-20 flex justify-end bg-cocoa/20" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-cream shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="font-display text-2xl font-bold text-cocoa">Quest Board</h2>
          <button onClick={onClose} className="rounded-full bg-blush px-3 py-1 font-bold text-cocoa" aria-label="Close">✕</button>
        </div>
        <div className="flex gap-2 px-4">
          {tabBtn('active', 'Active')}
          {tabBtn('verify', 'Verify', toVerify)}
          {tabBtn('done', 'Done')}
        </div>
        <div className="flex shrink-0 gap-2 overflow-x-auto px-4 py-3">
          <button onClick={() => setArea('all')} className={`shrink-0 rounded-full px-3 py-1 text-sm text-cocoa ${area === 'all' ? 'bg-cocoa text-cream' : 'bg-white'}`}>All</button>
          {AREAS.map((a) => (
            <button key={a.id} onClick={() => setArea(a.id)} className={`shrink-0 rounded-full px-3 py-1 text-sm text-cocoa ${a.color} ${area === a.id ? 'ring-4 ring-pink-300' : 'opacity-70'}`}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          {tab === 'active' && <SeasonalStrip />}
          {list.length === 0 && (
            <p className="py-10 text-center text-cocoa/60">
              {tab === 'active' ? 'No active quests. Add one and go live your life! 🌸' : tab === 'verify' ? 'Nothing waiting for approval.' : 'Nothing completed yet.'}
            </p>
          )}
          {list.map((q) => (
            <QuestCard key={q.id} quest={q} onSubmit={() => setSubmitting(q.id)} onReview={() => setReviewing(q.id)} onCapture={() => onCaptureMemory(q)} />
          ))}
        </div>
        <div className="p-4 pt-0">
          <button className={`${primary} w-full`} onClick={() => setCreating(true)}>＋ New quest</button>
          <p className="mt-2 text-center text-xs text-cocoa/50">Playing as {s.names[me]}</p>
        </div>
      </div>
      {creating && <NewQuestModal onClose={() => setCreating(false)} />}
      {subQ && <SubmitModal quest={subQ} onClose={() => setSubmitting(null)} />}
      {revQ && <ApprovalModal quest={revQ} onClose={() => setReviewing(null)} />}
    </div>
  );
}
