import { useEffect, useRef, useState } from 'react';
import Sheet, { CloseButton, fieldCls as field, onEnter, primaryBtn as primary, softBtn as soft, useBackdropClose, useDialog } from './Sheet';
import PhotoPicker from './PhotoPicker';
import { useWide } from './useMedia';
import { Amount, CurrencyIcon, Price } from './Currency';
import { DAILY_QUEST_COINS, DAILY_TOKENS, DUO_DAY_COINS, MILESTONE_MAX, REWARD_MAX, SELF_MAX } from '../state/economy';
import type { LifeArea, PlayerId, Quest } from '../types';
import { AREAS, areaOf, SEASON_EVENTS, TEMPLATES, type QuestTemplate } from '../state/areas';
import { THEMES, useTheme } from '../state/season';
import { approveQuest, createQuest, todayStats, deleteQuest, otherPlayer, pendingFor, requestEdit, submitQuest, useGameState, useMe } from '../state/store';
import { QuadIcon, SpriteImg } from './ItemIcon';
import { CATALOG, itemOf } from '../state/catalog';
import { QUADRANTS, quadrantInfo, quadrantOf } from '../state/quadrants';
import type { Quadrant } from '../types';

/** A couple pose for each area of life, from the activity poses sheet. */
export const QUAD_POSE: Record<Quadrant, string> = { health: 'cp_d_adventure', career: 'cp_a_focus', learning: 'cp_a_learn', finance: 'cp_a_finance', romance: 'cp_a_romance', social: 'cp_a_social', environment: 'cp_d_picnic', recreation: 'cp_d_beach' };

type Tab = 'active' | 'verify' | 'done';

/** Shows how much of today's full pay is left, so effort stays meaningful. */
function TodayStrip() {
  useGameState();
  const t = todayStats();
  const pct = Math.min(1, t.questCoins / DAILY_QUEST_COINS);
  return (
    <div className="mx-4 mt-3 rounded-2xl bg-white p-2.5 text-xs text-cocoa shadow">
      <div className="flex items-center justify-between font-bold">
        <span>Today's full pay</span>
        <span className="flex items-center gap-2"><Amount kind="coin" n={`${t.questCoins} / ${DAILY_QUEST_COINS}`} size={13} /><Amount kind="token" n={`${t.tokens} / ${DAILY_TOKENS}`} size={13} /></span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-blush"><div className={`h-full rounded-full ${pct >= 1 ? 'bg-amber-400' : 'bg-pink-400'}`} style={{ width: `${pct * 100}%` }} /></div>
      <p className="mt-1 text-cocoa/70">{pct >= 1 ? 'You have earned plenty today. More goals still grow your town, but pay a quarter.' : `Finish goals together: when you both get one approved today, you each feel it and earn +${DUO_DAY_COINS} bonus coins.`}</p>
    </div>
  );
}

// ---------- create ----------

function NewQuestForm({ onClose }: { onClose: () => void }) {
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

  const add = () => {
    if (!title.trim()) return;
    createQuest({ title: title.trim(), area, quadrant, ifThen: ifThen.trim() || undefined, description: description.trim() || undefined, assignedTo, reward: { coins, gems, itemId: itemId || undefined, blindBoxes: boxes || undefined }, recurring, milestone });
    onClose();
  };

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
    <>
      <p className="mb-1 text-xs font-bold uppercase text-cocoa/60">Quick templates</p>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {TEMPLATES.map((t) => (
          <button key={t.title} onClick={() => applyTemplate(t)} className="shrink-0 cursor-pointer rounded-full bg-peach px-3 py-1 text-sm text-cocoa transition hover:brightness-95 active:scale-95">
            {areaOf(t.area).icon} {t.title}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <input className={field} placeholder="Quest title" aria-label="Quest title" data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onEnter(add, !!title.trim())} />
        <textarea className={field} rows={2} placeholder="Description (optional)" aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} onKeyDown={onEnter(add, !!title.trim())} />
        <div className="flex flex-wrap gap-2">
          {QUADRANTS.map((q) => (
            <button key={q.id} onClick={() => { setQuadrant(q.id); setArea(q.area); }} className={`rounded-full px-3 py-1 text-sm text-cocoa ${q.color} ${quadrant === q.id ? 'ring-4 ring-pink-300' : 'opacity-70'}`}>
              <QuadIcon id={q.id} size={20} /> {q.label}
            </button>
          ))}
        </div>
        <div className="-mt-1 flex items-center gap-2 text-xs text-cocoa/70"><SpriteImg sprite={QUAD_POSE[quadrant]} size={48} /><p><QuadIcon id={quadrant} size={16} /> {quadrantInfo(quadrant).mechanic}: {quadrantInfo(quadrant).hook}</p></div>
        <input className={field} placeholder="If-Then plan (optional): IF it is 7 AM, THEN I will walk for 20 mins" value={ifThen} aria-label="If Then plan" onChange={(e) => setIfThen(e.target.value)} onKeyDown={onEnter(add, !!title.trim())} />
        <div className="flex items-center gap-2 text-sm text-cocoa">
          <span className="font-bold">Assigned to</span>
          {(['A', 'B'] as PlayerId[]).map((p) => (
            <button key={p} onClick={() => setAssignedTo(p)} className={`rounded-full px-3 py-1 ${assignedTo === p ? 'bg-pink-400 text-white' : 'bg-blush'}`}>
              {s.names[p]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-cocoa">
          <label className="flex items-center gap-1"><CurrencyIcon kind="coin" size={20} /><input type="number" min={0} className={`${field} w-20`} value={coins} onChange={(e) => setCoins(Math.max(0, +e.target.value))} /></label>
          <label className="flex items-center gap-1"><CurrencyIcon kind="box" size={20} /><input type="number" min={0} className={`${field} w-16`} value={boxes} onChange={(e) => setBoxes(Math.max(0, +e.target.value))} /></label>
          <label className="flex items-center gap-1"><CurrencyIcon kind="gem" size={20} /><input type="number" min={0} className={`${field} w-20`} value={gems} onChange={(e) => setGems(Math.max(0, +e.target.value))} /></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Repeats</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={milestone} onChange={(e) => setMilestone(e.target.checked)} /> Milestone</label>
        </div>
        <p className="rounded-xl bg-white p-2 text-xs text-cocoa/70">
          Rewards up to {REWARD_MAX} coins ({MILESTONE_MAX} for a milestone). A goal you set for yourself pays at most {SELF_MAX.coins} coins and {SELF_MAX.gems} gems, so the best rewards are the ones you set for each other.
        </p>
        <label className="flex items-center gap-2 text-sm text-cocoa">
          🎁 Bonus item
          <select className={field} value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">None</option>
            {CATALOG.map((i) => <option key={i.id} value={i.id}>{i.icon} {i.name}</option>)}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button className={soft} onClick={onClose}>Cancel</button>
          <button className={primary} disabled={!title.trim()} onClick={add}>
            Add quest
          </button>
        </div>
      </div>
    </>
  );
}

const NewQuestModal = ({ onClose }: { onClose: () => void }) => <Sheet title="New quest" onClose={onClose}><NewQuestForm onClose={onClose} /></Sheet>;

// ---------- submit evidence ----------

function SubmitForm({ quest, onClose }: { quest: Quest; onClose: () => void }) {
  const s = useGameState();
  const [note, setNote] = useState(quest.evidenceNote ?? '');
  const [photo, setPhoto] = useState<string | undefined>(quest.evidencePhoto);
  const partner = s.names[otherPlayer(quest.assignedTo)];
  const quad = quadrantOf(quest);
  const needsTakeaway = quad === 'learning';
  const send = () => {
    submitQuest(quest.id, { note, photo });
    onClose();
  };
  return (
    <>
      <p className="mb-3 text-cocoa">
        <b>{quest.title}</b> will wait for {partner} to approve it before the reward unlocks.
      </p>
      {quest.reviewNote && <p className="mb-3 rounded-xl bg-peach p-3 text-sm text-cocoa">💬 {partner} asked: {quest.reviewNote}</p>}
      {needsTakeaway && <p className="mb-2 rounded-xl bg-sky/60 p-3 text-sm text-cocoa">📚 Share your Key Takeaway in one sentence. Once approved it becomes a book on your shared Wisdom Bookshelf.</p>}
      {quad === 'health' && <p className="mb-2 rounded-xl bg-green-100 p-3 text-sm text-cocoa">💪 A quick post workout photo or a smartwatch screenshot helps your partner say yes. If you both finish a health goal today, you earn a Synergy Aura (1.5x coins for 24 hours).</p>}
      <textarea className={field} rows={3} aria-label="Note" data-autofocus placeholder={needsTakeaway ? 'Key Takeaway (required): the one thing you learned' : 'Optional note, e.g. what you did'} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={onEnter(send, !(needsTakeaway && !note.trim()))} />
      <div className="mt-3">
        <PhotoPicker value={photo} onChange={setPhoto} alt="evidence" />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className={soft} onClick={onClose}>Cancel</button>
        <button className={primary} disabled={needsTakeaway && !note.trim()} onClick={send}>Send for approval</button>
      </div>
    </>
  );
}

const SubmitModal = ({ quest, onClose }: { quest: Quest; onClose: () => void }) => <Sheet title="Mark as done" onClose={onClose}><SubmitForm quest={quest} onClose={onClose} /></Sheet>;

// ---------- approve ----------

function ApprovalForm({ quest, onClose }: { quest: Quest; onClose: () => void }) {
  const s = useGameState();
  const me = useMe();
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState('');
  const sendRequest = () => {
    requestEdit(quest.id, me, msg);
    onClose();
  };
  return (
    <>
      <p className="text-sm text-cocoa/70">{s.names[quest.assignedTo]} says this is done.</p>
      {quest.evidenceNote && <p className="mt-3 rounded-xl bg-white p-3 text-cocoa">“{quest.evidenceNote}”</p>}
      {quest.evidencePhoto && <img src={quest.evidencePhoto} alt="evidence" className="mt-3 max-h-64 rounded-2xl" />}
      {!quest.evidenceNote && !quest.evidencePhoto && <p className="mt-3 text-sm italic text-cocoa/60">No evidence attached. Trust is part of the game.</p>}
      <p className="mt-3 text-sm text-cocoa">Reward: <Price coins={quest.reward.coins} gems={quest.reward.gems} size={16} /></p>
      {asking ? (
        <div className="mt-3 space-y-2">
          <input className={field} placeholder="What should they add or fix?" aria-label="What should they add or fix" data-autofocus value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={onEnter(sendRequest)} />
          <div className="flex justify-end gap-2">
            <button className={soft} onClick={() => setAsking(false)}>Back</button>
            <button className={primary} onClick={sendRequest}>Send request</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex justify-end gap-2">
          <button className={soft} onClick={() => setAsking(true)}>Request edit</button>
          <button className={primary} onClick={() => { approveQuest(quest.id, me); onClose(); }}>Approve ✓</button>
        </div>
      )}
    </>
  );
}

const ApprovalModal = ({ quest, onClose }: { quest: Quest; onClose: () => void }) => <Sheet title={`Verify: ${quest.title}`} onClose={onClose}><ApprovalForm quest={quest} onClose={onClose} /></Sheet>;

// ---------- card ----------

function QuestCard({ quest, selected, onSubmit, onReview, onCapture }: { quest: Quest; selected?: boolean; onSubmit: () => void; onReview: () => void; onCapture: () => void }) {
  const s = useGameState();
  const captured = s.memories.some((m) => m.questId === quest.id);
  const me = useMe();
  const qd = quadrantInfo(quadrantOf(quest));
  const mine = quest.assignedTo === me;
  const who = s.names[quest.assignedTo];
  return (
    <div className={`rounded-2xl bg-white p-3 shadow transition hover:shadow-md ${selected ? 'ring-4 ring-pink-300' : ''}`}>
      <div className="flex items-start gap-2">
        <span className={`rounded-full px-2 py-1 text-lg ${qd.color}`}><QuadIcon id={qd.id} size={26} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-cocoa">{quest.title}{quest.recurring && <span className="ml-1 text-xs font-normal text-cocoa/60">↻ repeats</span>}</div>
          {quest.description && <div className="text-sm text-cocoa/70">{quest.description}</div>}
          {quest.ifThen && <div className="text-xs italic text-cocoa/70">🎯 {quest.ifThen}</div>}
          <div className="mt-1 text-xs text-cocoa/60">{who} · <Price coins={quest.reward.coins} gems={quest.reward.gems} size={13} />{quest.reward.itemId && ` · 🎁 ${itemOf(quest.reward.itemId)?.name}`}{quest.reward.blindBoxes ? <> · <Amount kind="box" n={quest.reward.blindBoxes} size={13} /> blind box</> : ''}</div>
          {quest.status === 'REJECTED' && quest.reviewNote && <div className="mt-1 rounded-lg bg-peach px-2 py-1 text-xs text-cocoa">💬 {quest.reviewNote}</div>}
        </div>
        {quest.status === 'IN_PROGRESS' && <button onClick={() => deleteQuest(quest.id)} className="cursor-pointer text-cocoa/30 transition hover:text-red-500" aria-label="Delete quest" title="Delete quest">🗑</button>}
      </div>
      <div className="mt-2 flex justify-end">
        {(quest.status === 'IN_PROGRESS' || quest.status === 'REJECTED') &&
          (mine ? ((quest.notBefore ?? 0) > Date.now() ? <span className="text-xs text-cocoa/60">🌙 Back tomorrow. Habits count once a day</span> : <button className={primary} onClick={onSubmit}>{quest.status === 'REJECTED' ? 'Resubmit' : 'Mark done'}</button>) : <span className="text-xs text-cocoa/60">Waiting on {who}</span>)}
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
                <div className="text-xs text-cocoa/60"><Price coins={t.reward.coins} gems={t.reward.gems} size={13} />{t.reward.itemId && ` · 🎁 ${itemOf(t.reward.itemId)?.name}`}</div>
              </div>
              <button
                className={soft}
                onClick={() => createQuest({ title: t.title, area: t.area, description: t.description, assignedTo: me, reward: t.reward, milestone: t.milestone }, { trusted: true })}
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
  const wide = useWide();
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
  // on a wide window the forms open beside the list instead of on top of it
  const pane: 'new' | 'submit' | 'review' | 'none' = creating ? 'new' : subQ ? 'submit' : revQ ? 'review' : 'none';
  const closePane = () => { setCreating(false); setSubmitting(null); setReviewing(null); };
  const { panel, titleId } = useDialog(() => (wide && pane !== 'none' ? closePane() : onClose()));
  const backdrop = useBackdropClose(onClose);
  const aside = useRef<HTMLElement>(null);
  // when a form opens beside the list, put the cursor in its first field
  const paneKey = pane + (subQ?.id ?? '') + (revQ?.id ?? '');
  useEffect(() => {
    if (!wide || pane === 'none') return;
    const t = setTimeout(() => aside.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true }), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wide, paneKey]);

  const tabBtn = (t: Tab, label: string, badge = 0) => (
    <button onClick={() => setTab(t)} aria-pressed={tab === t} className={`relative cursor-pointer rounded-full px-4 py-1.5 font-display font-bold transition hover:brightness-95 ${tab === t ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>
      {label}
      {badge > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">{badge}</span>}
    </button>
  );

  return (
    <div className="olw-backdrop absolute inset-0 z-20 flex justify-end bg-cocoa/20 lg:items-center lg:justify-center lg:bg-cocoa/30 lg:p-6 lg:backdrop-blur-sm" {...backdrop}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="olw-dialog flex h-full w-full max-w-md flex-col bg-cream shadow-2xl outline-none lg:h-[min(86vh,840px)] lg:max-w-[1180px] lg:flex-row lg:overflow-hidden lg:rounded-3xl"
      >
        <div className="flex min-h-0 flex-1 flex-col lg:max-w-[470px] lg:flex-none lg:basis-[470px] lg:border-r lg:border-blush">
          <div className="flex items-center justify-between p-4 pb-2">
            <h2 id={titleId} className="font-display text-2xl font-bold text-cocoa">Quest Board</h2>
            <CloseButton onClose={onClose} />
          </div>
          <div className="flex gap-2 px-4">
            {tabBtn('active', 'Active')}
            {tabBtn('verify', 'Verify', toVerify)}
            {tabBtn('done', 'Done')}
          </div>
          {!wide && <TodayStrip />}
          <div className="flex shrink-0 gap-2 overflow-x-auto px-4 py-3 lg:flex-wrap lg:overflow-visible">
            <button onClick={() => setArea('all')} aria-pressed={area === 'all'} className={`shrink-0 cursor-pointer rounded-full px-3 py-1 text-sm text-cocoa transition hover:brightness-95 ${area === 'all' ? 'bg-cocoa text-cream' : 'bg-white'}`}>All</button>
            {AREAS.map((a) => (
              <button key={a.id} onClick={() => setArea(a.id)} aria-pressed={area === a.id} className={`shrink-0 cursor-pointer rounded-full px-3 py-1 text-sm text-cocoa transition hover:brightness-95 ${a.color} ${area === a.id ? 'ring-4 ring-pink-300' : 'opacity-70 hover:opacity-100'}`}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>
          <div className="olw-body min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-4">
            {tab === 'active' && !wide && <SeasonalStrip />}
            {list.length === 0 && (
              <p className="py-10 text-center text-cocoa/60">
                {tab === 'active' ? 'No active quests. Add one and go live your life! 🌸' : tab === 'verify' ? 'Nothing waiting for approval.' : 'Nothing completed yet.'}
              </p>
            )}
            {list.map((q) => (
              <QuestCard key={q.id} quest={q} selected={wide && (submitting === q.id || reviewing === q.id)} onSubmit={() => { setCreating(false); setReviewing(null); setSubmitting(q.id); }} onReview={() => { setCreating(false); setSubmitting(null); setReviewing(q.id); }} onCapture={() => onCaptureMemory(q)} />
            ))}
          </div>
          <div className="p-4 pt-2">
            <button className={`${primary} w-full`} onClick={() => { setSubmitting(null); setReviewing(null); setCreating(true); }}>＋ New quest</button>
            <p className="mt-2 text-center text-xs text-cocoa/60">Playing as {s.names[me]}</p>
          </div>
        </div>
        {wide && (
          <aside ref={aside} className="olw-body min-h-0 flex-1 overflow-y-auto overscroll-contain p-6" aria-label="Quest details">
            {pane === 'new' && <><h3 className="mb-3 font-display text-xl font-bold text-cocoa">New quest</h3><NewQuestForm onClose={closePane} /></>}
            {pane === 'submit' && subQ && <><h3 className="mb-3 font-display text-xl font-bold text-cocoa">Mark as done</h3><SubmitForm key={subQ.id} quest={subQ} onClose={closePane} /></>}
            {pane === 'review' && revQ && <><h3 className="mb-3 font-display text-xl font-bold text-cocoa">Verify: {revQ.title}</h3><ApprovalForm key={revQ.id} quest={revQ} onClose={closePane} /></>}
            {pane === 'none' && (
              <div className="mx-auto max-w-md">
                <h3 className="font-display text-xl font-bold text-cocoa">Today</h3>
                <div className="-mx-4 -mt-1 mb-4"><TodayStrip /></div>
                {tab === 'active' && <SeasonalStrip />}
                <p className="mt-2 text-sm text-cocoa/70">Pick a quest on the left to mark it done or to review it, or start a new one. Goals you set for each other pay the most.</p>
              </div>
            )}
          </aside>
        )}
      </div>
      {!wide && creating && <NewQuestModal onClose={() => setCreating(false)} />}
      {!wide && subQ && <SubmitModal quest={subQ} onClose={() => setSubmitting(null)} />}
      {!wide && revQ && <ApprovalModal quest={revQ} onClose={() => setReviewing(null)} />}
    </div>
  );
}
