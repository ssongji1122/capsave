'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { STICKER_CATALOG, MAX_STICKERS, normalizeSticker, parseDecorations, stickerStorageKey, type StickerPlacement } from '@scrave/shared';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/browser';
import styles from './StickerDecoration.module.css';
export function StickerDecoration({ target, label, preview }: {
    target: string;
    label: string;
    preview?: string;
}) {
    const [owner, setOwner] = useState<string | null>(null);
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const [saved, setSaved] = useState<StickerPlacement[]>([]);
    const [draft, setDraft] = useState<StickerPlacement[] | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [history, setHistory] = useState<StickerPlacement[][]>([]);
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');
    const canvas = useRef<HTMLDivElement>(null);
    const close = useRef<HTMLButtonElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const drag = useRef<{
        id: string;
        x: number;
        y: number;
        start: StickerPlacement;
        before: StickerPlacement[];
    } | null>(null);
    useEffect(() => {
        const client = createClient();
        let alive = true;
        client.auth.getUser().then(({ data }: {
            data: {
                user: User | null;
            };
        }) => { if (alive)
            setOwner(data.user?.id ?? 'guest'); }).catch(() => { if (alive)
            setOwner('guest'); });
        const { data } = client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => { if (alive) {
            setOwner(session?.user.id ?? 'guest');
        } });
        return () => { alive = false; data.subscription.unsubscribe(); };
    }, []);
    const key = owner === null ? null : stickerStorageKey(owner, target);
    useEffect(() => {
        setSaved([]);
        setDraft(null);
        setLoadedKey(null);
        if (!key)
            return;
        try {
            setSaved(parseDecorations(localStorage.getItem(key)));
            setError('');
            setLoadedKey(key);
        }
        catch {
            setError('이 브라우저에서 저장소를 사용할 수 없습니다.');
        }
        function sync(e: StorageEvent) { if (e.key === key)
            setSaved(parseDecorations(e.newValue)); }
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, [key]);
    const opened = draft !== null;
    useEffect(() => {
        if (!opened)
            return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        close.current?.focus();
        return () => { document.body.style.overflow = previous; trigger.current?.focus(); };
    }, [opened]);
    function change(next: StickerPlacement[]) { if (draft) {
        setHistory(h => [...h.slice(-29), draft]);
        setDraft(next);
    } }
    function edit(patch: Partial<StickerPlacement>) { change(draft!.map(p => p.id === selected ? normalizeSticker({ ...p, ...patch }) : p)); }
    function finishDrag() { const previous = drag.current?.before; drag.current = null; if (previous)
        setHistory(h => [...h.slice(-29), previous]); }
    const active = draft?.find(p => p.id === selected);
    function images(items: StickerPlacement[], interactive = false) {
        return items.map(p => {
            const sticker = STICKER_CATALOG.find(s => s.id === p.stickerId)!;
            return <img key={p.id} src={'/stickers/' + sticker.file} alt={interactive ? sticker.label : ''} draggable={false} role={interactive ? 'button' : undefined} tabIndex={interactive ? 0 : undefined} aria-pressed={interactive ? selected === p.id : undefined} className={selected === p.id && interactive ? styles.selected : undefined} style={{ position: 'absolute', left: p.x * 100 + '%', top: p.y * 100 + '%', width: p.size * 100 + '%', height: p.size * 100 + '%', objectFit: 'contain', transform: 'translate(-50%,-50%) rotate(' + p.rotation + 'deg)', touchAction: interactive ? 'none' : undefined }} onClick={interactive ? () => setSelected(p.id) : undefined} onKeyDown={interactive ? e => { if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelected(p.id);
            } if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                setSelected(p.id);
                change(draft!.map(v => v.id === p.id ? normalizeSticker({ ...v, x: v.x + (e.key === 'ArrowRight' ? 0.02 : e.key === 'ArrowLeft' ? -0.02 : 0), y: v.y + (e.key === 'ArrowDown' ? 0.02 : e.key === 'ArrowUp' ? -0.02 : 0) }) : v));
            } } : undefined} onPointerDown={interactive ? e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setSelected(p.id); drag.current = { id: p.id, x: e.clientX, y: e.clientY, start: p, before: draft! }; } : undefined} onPointerMove={interactive ? e => { const d = drag.current, rect = canvas.current?.getBoundingClientRect(); if (d?.id === p.id && rect)
                setDraft(items => items!.map(v => v.id === p.id ? normalizeSticker({ ...v, x: d.start.x + (e.clientX - d.x) / rect.width, y: d.start.y + (e.clientY - d.y) / rect.height }) : v)); } : undefined} onPointerUp={interactive ? finishDrag : undefined} onPointerCancel={interactive ? finishDrag : undefined}/>;
        });
    }
    return <>
  <div data-sticker-overlay aria-hidden="true" className={styles.overlay}><div className={styles.surface}>{images(saved)}</div></div>
  <button data-sticker-trigger ref={trigger} type="button" disabled={!key || loadedKey !== key} className={styles.trigger} onClick={e => { e.stopPropagation(); setDraft([...saved]); setSelected(null); setHistory([]); setQuery(''); setError(''); }} aria-label={label + ' 스티커 꾸미기'}>꾸미기</button>
  {!opened && error && <span role="alert" className={styles.error}>{error}</span>}
      {opened && createPortal(<div className={styles.backdrop} onClick={e => e.stopPropagation()}>
   <div role="dialog" aria-modal="true" aria-label={label + ' 스티커 꾸미기'} className={styles.dialog} onKeyDown={e => {
                if (e.key === 'Escape')
                    setDraft(null);
                if (e.key === 'Tab') {
                    const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input,[tabindex="0"]'));
                    const first = nodes[0], last = nodes[nodes.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last?.focus();
                    }
                    else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first?.focus();
                    }
                }
            }}>
    <header><h2>{label} 꾸미기</h2><button ref={close} type="button" onClick={() => setDraft(null)}>취소</button><button type="button" onClick={() => { try {
            localStorage.setItem(key!, JSON.stringify(draft));
            setSaved(draft!);
            setDraft(null);
        }
        catch {
            setError('저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도하십시오.');
        } }}>저장</button></header>
    <p>스티커를 고른 뒤 끌어서 옮깁니다. 이 기기·브라우저에만 저장합니다.</p>
    {error && <p role="alert">{error}</p>}
    <div className={styles.workspace}>
     <div ref={canvas} className={styles.canvas} aria-label="스티커 배치 영역">
      {preview ? <img className={styles.original} src={preview} alt={label + ' 꾸미기 미리보기'}/> : <div className={styles.archive}><span>scrave</span><strong>my craves</strong><span>캡처로 모아 둔 일상과 취향</span></div>}
      {images(draft!, true)}
     </div>
     <section className={styles.picker} aria-label="스티커 선택">
      <input type="search" aria-label="스티커 검색" placeholder="커피, 단풍, 공부…" value={query} onChange={e => setQuery(e.target.value)}/>
      <div className={styles.grid}>{STICKER_CATALOG.filter(s => (s.label + ' ' + s.subject).toLowerCase().includes(query.toLowerCase())).map(s => <button type="button" key={s.id} disabled={draft!.length >= MAX_STICKERS} aria-label={s.label + ' 붙이기'} onClick={() => { const id = crypto.randomUUID(); change([...draft!, { id, stickerId: s.id, x: 0.5, y: 0.5, size: 0.25, rotation: 0 }]); setSelected(id); }}><img src={'/stickers/' + s.file} alt="" loading="lazy"/><span>{s.label}</span></button>)}</div>
     </section>
    </div>
    <div className={styles.controls}>
     <button type="button" disabled={!history.length} onClick={() => { setDraft(history[history.length - 1]); setHistory(h => h.slice(0, -1)); setSelected(null); }}>되돌리기</button>
     <button type="button" disabled={!active} onClick={() => { change(draft!.filter(p => p.id !== selected)); setSelected(null); }}>선택 삭제</button>
     <label>크기<input type="range" min="0.12" max="0.4" step="0.01" disabled={!active} value={active?.size ?? 0.25} onChange={e => edit({ size: Number(e.target.value) })}/></label>
     <label>회전<input type="range" min="-30" max="30" step="5" disabled={!active} value={active?.rotation ?? 0} onChange={e => edit({ rotation: Number(e.target.value) })}/></label>
     <span>{draft!.length}/{MAX_STICKERS}</span>
    </div>
   </div>
  </div>, document.body)}
 </>;
}
