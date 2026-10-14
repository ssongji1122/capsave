'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowUpRight, Bookmark, Check, ChevronRight, Compass, Download, Eye, Fingerprint, ImageIcon, Layers, Search, Sparkles, X } from 'lucide-react';
import { FIGURE_CAPTURE as capture } from '@/lib/figure-capture';
import { EMPTY_INTENT, INTENT_STORAGE_KEY, NOTE_MAX_LENGTH, REASONS, buildReferenceNote, findCapture, getConfirmedInterests, getRevisitDate, parseSavedIntent, saveIntent, type CaptureIntent, type Reason, type Revisit } from '@/lib/capture-intent';
import styles from './CaptureExperience.module.css';

type View = 'detail' | 'archive' | 'discover' | 'taste';
const NAVIGATION = [
  { id: 'archive', label: '보관함', icon: Layers },
  { id: 'discover', label: '다시 발견', icon: Compass },
  { id: 'taste', label: '내 취향', icon: Fingerprint },
] as const;
const SEARCH_HINTS = ['보라색 노란색', '두꺼운 물감', 'jasonandersonart'];
const REVISIT_OPTIONS: { id: Revisit; label: string; description: string }[] = [
  { id: 'none', label: '정하지 않음', description: '필요할 때 검색합니다' },
  { id: 'week', label: '일주일 뒤', description: '다시 발견에 날짜를 남깁니다' },
  { id: 'work', label: '작업을 시작할 때', description: '참고 자료를 찾을 때 꺼냅니다' },
];
const NOTE_FILE_NAME = 'scrave-figure-2-reference.txt';
const DOWNLOAD_URL_LIFETIME_MS = 1000;

function Artwork({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.artwork} ${compact ? styles.compactArt : ''}`}>
    {/* 원본 파일은 그대로 두고 게시물의 작품 영역만 화면에서 확대합니다. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={capture.imageUrl} alt="FIGURE (2), 보라색 바탕에 노란 물감과 청록색 면이 있는 유화" />
  </div>;
}

export function CaptureExperience() {
  const [view, setView] = useState<View>('detail');
  const [draft, setDraft] = useState<CaptureIntent>(EMPTY_INTENT);
  const [saved, setSaved] = useState<CaptureIntent>(EMPTY_INTENT);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const originButtonRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const navigationFrame = useRef<number | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const confirmed = getConfirmedInterests(saved);

  useEffect(() => {
    try {
      const restored = parseSavedIntent(window.localStorage.getItem(INTENT_STORAGE_KEY));
      setDraft(restored); setSaved(restored);
    } catch { setError('이 브라우저의 보관 공간을 읽지 못했습니다. 참고 메모는 내려받을 수 있습니다.'); }
    setReady(true);
    return () => { if (navigationFrame.current !== null) cancelAnimationFrame(navigationFrame.current); };
  }, []);

  function navigate(next: View) {
    setView(next); setMessage('');
    if (navigationFrame.current !== null) cancelAnimationFrame(navigationFrame.current);
    navigationFrame.current = requestAnimationFrame(() => { titleRef.current?.focus(); window.scrollTo({ top: 0 }); });
  }

  function toggleReason(reason: Reason) {
    setDraft(previous => ({ ...previous, reasons: previous.reasons.includes(reason)
      ? previous.reasons.filter(item => item !== reason) : [...previous.reasons, reason] }));
    setMessage('');
  }

  function persist(intent: CaptureIntent, success: string) {
    try {
      if (!saveIntent(window.localStorage, intent)) throw new Error('storage');
      setDraft(intent); setSaved(intent); setError(''); setMessage(success);
    } catch { setMessage(''); setError('이 브라우저에 보관하지 못했습니다. 메모를 내려받거나 브라우저 저장 공간을 확인해 주십시오.'); }
  }

  function save() {
    persist({ ...draft, savedAt: saved.savedAt ?? new Date().toISOString() }, '저장 이유와 캡처를 이 브라우저에 보관했습니다.');
  }

  function downloadNote() {
    const url = URL.createObjectURL(new Blob([buildReferenceNote(capture, draft)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = NOTE_FILE_NAME;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
    setMessage('출처와 내 메모를 담은 참고 메모 다운로드를 시작했습니다.');
  }

  const savedCard = <button className={styles.savedCard} onClick={() => navigate('detail')} aria-label="FIGURE (2) 상세 보기">
    <Artwork compact />
    <div><span className={styles.muted}>시각 참고 · Instagram</span><h3>{capture.displayTitle}</h3>
      <p>@{capture.sourceAccountId}</p><div className={styles.inlineTags}>{capture.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div>
      {saved.note && <p className={styles.personalNote}>{saved.note}</p>}
      <span className={styles.cardLink}>캡처와 내 기록 보기 <ArrowUpRight size={16} /></span>
    </div>
  </button>;

  return <div className={styles.root}>
    <a className={styles.skip} href="#capture-content">본문으로 이동</a>
    <header className={styles.header}>
      <button className={styles.brand} onClick={() => navigate('archive')} aria-label="Scrave 보관함"><span className={styles.brandMark}><Bookmark size={21} /></span>scrave<span className={styles.brandDot}>.</span></button>
      <nav aria-label="내 기록 탐색" className={styles.nav}>
        {NAVIGATION.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} aria-current={(view === id || (view === 'detail' && id === 'archive')) ? 'page' : undefined}><Icon size={17} /><span>{label}</span></button>)}
      </nav>
      <span className={styles.storageLabel}><span />이 브라우저에 보관</span>
    </header>

    <main id="capture-content" className={styles.main}>
      {view === 'detail' ? <>
        <div className={styles.breadcrumb}><button onClick={() => navigate('archive')}><ArrowLeft size={16} /> 보관함</button><ChevronRight size={14} /><span>시각 참고</span><span className={styles.detailStatus}>{saved.savedAt ? '보관한 캡처' : '분석한 캡처'}</span></div>
        <div className={styles.detailGrid}>
          <div className={styles.visualColumn}>
            <button ref={originButtonRef} className={styles.artButton} onClick={() => dialogRef.current?.showModal()} aria-label="캡처 원본 보기"><Artwork /><span className={styles.imageAction}><ImageIcon size={15} />원본 보기</span></button>
            <div className={styles.artCaption}><span>작품 영역을 확대했습니다.</span><span>1 / 6 중 첫 이미지</span></div>
            <section className={styles.paletteSection} aria-label="작품에서 관찰한 색">
              <div className={styles.sectionRow}><h2>화면에서 읽은 색</h2><span>대표색 · 시각 참고</span></div>
              <div className={styles.palette}>{capture.palette.map(color => <div key={color.name}><span style={{ '--swatch': color.color } as CSSProperties} /><p>{color.name}</p></div>)}</div>
            </section>
            <div className={styles.visualNote}><Eye size={17} /><p>보라색 바탕을 따라 노란 물감이 세로로 이어지고, 청록색 면이 옆에서 대비를 만듭니다.</p></div>
          </div>

          <div className={styles.storyColumn}>
            <div className={styles.overline}><span className={styles.category}><Layers size={14} />시각 참고</span><span>Instagram에서 발견</span></div>
            <h1 ref={titleRef} tabIndex={-1} className={styles.title}>{capture.displayTitle}</h1>
            <a className={styles.artist} href={capture.profileUrl} target="_blank" rel="noreferrer">@{capture.sourceAccountId}<ArrowUpRight size={16} /></a>
            <dl className={styles.facts}><div><dt>재료</dt><dd>{capture.materialLabel}</dd></div><div><dt>크기</dt><dd>30 × 30 cm</dd></div><div><dt>정보 출처</dt><dd>캡처 속 문구</dd></div></dl>
            <section className={styles.reading}>
              <h2><Sparkles size={17} />작품에서 발견한 단서</h2>
              <p>두껍게 올린 물감과 넓게 펴 바른 자국이 함께 보입니다. 색 조합과 표면의 질감을 나중에 다시 찾을 수 있습니다.</p>
              <div className={styles.inlineTags}>{['색의 대비', '두꺼운 물감', '도구 자국'].map(tag => <span key={tag}>{tag}</span>)}</div>
            </section>

            <section className={styles.intentSection} aria-labelledby="intent-title">
              <div className={styles.sectionRow}><h2 id="intent-title">어떤 점을 남기고 싶습니까?</h2><span>선택 사항</span></div>
              <p className={styles.support}>직접 고른 이유가 다음에 이 캡처를 꺼낼 단서가 됩니다.</p>
              <div className={styles.reasonButtons}>{REASONS.map(reason => <button key={reason.id} aria-pressed={draft.reasons.includes(reason.id)} title={reason.description} onClick={() => toggleReason(reason.id)}>{draft.reasons.includes(reason.id) && <Check size={14} />}{reason.label}</button>)}</div>
              <label className={styles.noteLabel} htmlFor="capture-note">내 메모</label>
              <textarea id="capture-note" value={draft.note} maxLength={NOTE_MAX_LENGTH} rows={2} placeholder="다음 작업에 참고하고 싶은 부분을 남깁니다." onChange={event => { setDraft({ ...draft, note: event.target.value }); setMessage(''); }} />
              <button className={styles.primary} onClick={save} disabled={!ready || (!!saved.savedAt && !dirty)}><Bookmark size={18} />{saved.savedAt ? (dirty ? '변경 내용 보관' : '내 보관함에 담았습니다') : '내 보관함에 담기'}{saved.savedAt && !dirty && <Check size={16} />}</button>
              <p className={styles.storageHint}>이 기기의 브라우저에 저장하며, 다른 기기와 동기화하지 않습니다.</p>
            </section>
          </div>
        </div>

        <div className={styles.nextGrid}>
          <section className={styles.nextSection}>
            <div className={styles.sectionIcon}><Compass size={20} /></div><h2>언제 다시 꺼내 볼까요?</h2>
            <p className={styles.support}>날짜나 작업 맥락을 남기면 ‘다시 발견’에서 확인합니다.</p>
            <div className={styles.revisitOptions}>{REVISIT_OPTIONS.map(option => <button key={option.id} aria-pressed={draft.revisit === option.id} onClick={() => { setDraft({ ...draft, revisit: option.id, revisitOn: getRevisitDate(option.id, new Date()) }); setMessage(''); }}><span>{option.label}</span><span>{option.description}</span><span className={styles.radio}>{draft.revisit === option.id && <span />}</span></button>)}</div>
            {dirty && <button className={styles.textButton} onClick={save}>다시 볼 시점도 함께 보관 <ChevronRight size={15} /></button>}
            <p className={styles.storageHint}>앱 안에 날짜를 기록합니다. 휴대폰 알림은 보내지 않습니다.</p>
          </section>
          <section className={styles.nextSection}>
            <div className={styles.sectionIcon}><Download size={20} /></div><h2>내 작업에 참고하기</h2>
            <p className={styles.support}>작품 정보, 관찰한 특징, 저장 이유를 출처와 함께 꺼냅니다.</p>
            <div className={styles.notePreview}><span>참고 메모</span><strong>FIGURE (2)</strong><p>{draft.note || '저장한 이유와 작품의 특징을 한곳에 정리합니다.'}</p><small>@jasonandersonart · 캡처 표기 포함</small></div>
            <div className={styles.actionRow}><button className={styles.secondary} onClick={downloadNote}><Download size={16} />메모 내려받기</button><button className={styles.textButton} disabled={!!saved.usedAt} onClick={() => persist({ ...draft, savedAt: saved.savedAt ?? new Date().toISOString(), usedAt: new Date().toISOString() }, '이 캡처를 작업에 참고했다고 기록했습니다.')}><Check size={16} />{saved.usedAt ? '참고한 기록이 있습니다' : '작업에 참고했음'}</button></div>
          </section>
        </div>
        <details className={styles.provenance}><summary>원본과 분석 범위 확인 <ChevronRight size={16} /></summary><div><h3>캡처에서 읽은 문구</h3><pre>{capture.extractedText}</pre><p>아래에 걸친 timeforart.ch 게시물은 별도 내용으로 구분했습니다. 작품의 태그와 메모에는 섞지 않았습니다.</p><p>원문 게시물 주소는 확인하지 않았습니다. 계정 링크만 제공합니다.</p><p>2026년 10월 8일 Codex로 분석한 결과입니다. 대표색은 화면을 설명하는 참고값이며 정확한 색 측정값은 아닙니다.</p>{capture.uncertainties.map(text => <p key={text}>{text}</p>)}</div></details>
      </> : <>
        <div className={styles.viewIntro}><span className={styles.category}>{view === 'archive' ? '나의 기록' : view === 'discover' ? '필요한 순간에 다시' : '내가 직접 남긴 근거'}</span><h1 ref={titleRef} tabIndex={-1}>{view === 'archive' ? '다시 꺼내고 싶은 것들' : view === 'discover' ? '지금, 다시 펼쳐 봅니다' : '취향의 시작은 내가 고른 이유'}</h1><p>{view === 'archive' ? '기억나는 색이나 문장, 저장할 때 남긴 메모로 찾습니다.' : view === 'discover' ? '보관한 캡처를 날짜와 작업 맥락에 맞춰 다시 살펴봅니다.' : '직접 선택한 이유와 화면에서 관찰한 특징을 구분해 모읍니다.'}</p></div>
        {view === 'archive' && <><div className={styles.search}><Search size={20} /><input type="search" aria-label="보관한 캡처 검색" value={query} onChange={event => setQuery(event.target.value)} placeholder="색감, 작가, 내 메모로 찾기" />{query && <button onClick={() => setQuery('')} aria-label="검색어 지우기"><X size={17} /></button>}</div><div className={styles.searchHints}><span>이 캡처를 찾는 단서</span>{SEARCH_HINTS.map(hint => <button key={hint} onClick={() => setQuery(hint)}>{hint}</button>)}</div></>}
        {!saved.savedAt ? <div className={styles.empty}><Bookmark size={32} /><h2>{view === 'taste' ? '아직 직접 고른 이유가 없습니다.' : '아직 보관한 캡처가 없습니다.'}</h2><p>분석한 작품을 열고 남기고 싶은 이유와 함께 보관합니다.</p><button className={styles.secondary} onClick={() => navigate('detail')}>분석한 작품 열기 <ArrowUpRight size={16} /></button></div> : <>
          {view === 'archive' && <><div className={styles.sectionRow}><h2>보관한 캡처</h2><span>{findCapture(capture, saved, query) ? '1' : '0'}개 표시 · 전체 1개</span></div>{findCapture(capture, saved, query) ? savedCard : <div className={styles.empty}><Search size={30} /><h2>일치하는 캡처가 없습니다.</h2><p>‘보라색’이나 ‘jasonandersonart’처럼 캡처에 있는 단서로 찾아봅니다.</p></div>}</>}
          {view === 'discover' && <><div className={styles.discoverContext}><Compass size={26} /><div><h2>{saved.revisit === 'week' ? `${saved.revisitOn}에 다시 보기` : saved.revisit === 'work' ? '작업을 시작할 때 참고할 캡처' : '다시 살펴볼 캡처'}</h2><p>{saved.revisit === 'none' ? '아직 다시 볼 시점을 정하지 않았습니다. 아래 캡처에서 정할 수 있습니다.' : '직접 지정한 맥락으로 표시합니다. 새 추천을 생성한 결과는 아닙니다.'}</p></div></div><div className={styles.sectionRow}><h2>색과 질감이 필요한 순간</h2><span>보관한 자료에서 찾습니다</span></div>{savedCard}<div className={styles.reflection}><Sparkles size={20} /><p>이번에는 두꺼운 물감의 가장자리와 넓게 펴 바른 자국을 함께 살펴봅니다.</p><span>이 작품의 관찰에서 꺼낸 단서</span></div></>}
          {view === 'taste' && <><section className={styles.tasteSection}><h2>직접 고른 이유</h2>{confirmed.length ? <><div className={styles.tasteReasons}>{confirmed.map(reason => <div key={reason}><Check size={17} /><strong>{reason}</strong><span>이유를 남긴 캡처 1장</span></div>)}</div><p className={styles.support}>한 장에서 남긴 이유입니다. 반복되는 취향인지 판단하려면 기록이 더 필요합니다.</p></> : <p>아직 직접 고른 이유가 없습니다.</p>}</section><div className={styles.sectionRow}><h2>이유가 시작된 캡처</h2><span>원본에서 다시 확인합니다</span></div>{savedCard}<section className={styles.observation}><h2>화면에서 관찰한 특징</h2><p>아래 특징은 사진 분석 결과입니다. 내가 좋아한다고 선택한 취향과는 구분합니다.</p><div className={styles.inlineTags}>{capture.tags.map(tag => <span key={tag}>{tag}</span>)}</div></section></>}
        </>}
      </>}
      <div className={styles.feedback}>{error && <p role="alert">{error}</p>}<p role="status" aria-live="polite">{message}</p></div>
    </main>
    <footer className={styles.footer}><span>scrave.</span><p>한 장의 캡처와 직접 남긴 이유를 보관합니다.</p><span>로컬 미리보기</span></footer>
    <dialog ref={dialogRef} className={styles.dialog} onClose={() => originButtonRef.current?.focus()} aria-labelledby="original-title" onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
      <div className={styles.dialogHeader}><h2 id="original-title">첨부한 캡처 원본</h2><button aria-label="원본 닫기" onClick={() => dialogRef.current?.close()}><X size={22} /></button></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src={capture.imageUrl} alt="작품 게시물과 아래 시계 게시물이 함께 있는 원본 캡처 전체" />
    </dialog>
  </div>;
}
