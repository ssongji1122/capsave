'use client';

import { useState } from 'react';
import Link from 'next/link';
import { saveCapture as persistCapture, type AnalysisResult } from '@scrave/shared';
import { useCaptures } from '@/contexts/CapturesContext';
import { createClient } from '@/lib/supabase/browser';
import { getRealUserId } from '@/lib/auth-user';
import { MAX_IMPORT_BYTES, parseCaptureImport, saveImportedCapture, type ImportedCapture } from '@/lib/capture-import';
import { SocialLinkImport } from '@/components/import/SocialLinkImport';

export default function ImportPage() {
  const { isAuthenticated, isAuthReady, freeRemaining, refresh } = useCaptures();
  const [cards,setCards] = useState<ImportedCapture[]>([]);
  const [saved,setSaved] = useState(0);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  async function persistSocialLink(analysis: AnalysisResult, path: string) {
    const client=createClient();
    const {data:{user}}=await client.auth.getUser();
    const userId=getRealUserId(user);
    if (!userId) throw Error('로그인한 계정에서만 저장할 수 있습니다.');
    return persistCapture(client,analysis,path,userId);
  }
  async function choose(file?: File) {
    if (!file) return;
    setMessage(''); setCards([]); setSaved(0);
    try {
      if (file.size > MAX_IMPORT_BYTES) throw Error('파일은 50MB 이하로 선택하십시오.');
      setCards(parseCaptureImport(JSON.parse(await file.text())));
    } catch(error) { setMessage(error instanceof Error ? error.message : '파일을 읽지 못했습니다.'); }
  }
  async function save() {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const client=createClient();
      const {data:{user}}=await client.auth.getUser();
      const userId=getRealUserId(user);
      if (!userId) throw Error('로그인한 계정에서만 저장할 수 있습니다.');
      if (cards.length-saved > freeRemaining) throw Error('남은 저장 한도보다 카드가 많습니다.');
      for (let index=saved;index<cards.length;index++) {
        await saveImportedCapture(cards[index],{
          upload:async file=>{
            const form=new FormData();form.append('file',file);
            const response=await fetch('/api/upload',{method:'POST',body:form});
            if (!response.ok) throw Error('원본 이미지 업로드에 실패했습니다.');
            const data=await response.json(); if(typeof data.path!=='string') throw Error('저장 경로를 확인하지 못했습니다.');return data.path;
          },
          save:(result,path)=>persistCapture(client,result,path,userId),
          cleanup:async path=>{await fetch('/api/upload',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({paths:[path]})});},
        });
        setSaved(index+1);
      }
      setMessage('원본 이미지·정리 내용·링크를 계정에 저장했습니다.');
    } catch(error) { setMessage(error instanceof Error ? error.message : '저장하지 못했습니다.'); }
    finally { await refresh();setBusy(false); }
  }
  return <div className="mx-auto max-w-3xl px-4 py-8 pb-24">
    <Link href="/dashboard" className="inline-flex min-h-11 items-center text-primary underline">보관함으로</Link>
    <h1 className="mt-4 text-2xl font-semibold">링크와 정리 파일 가져오기</h1>
    <p className="mb-6 mt-3 text-sm leading-6 text-text-secondary">새 AI 분석 없이 원문과 원본 이미지를 보관함으로 가져옵니다.</p>

    <SocialLinkImport
      isAuthenticated={isAuthenticated}
      isAuthReady={isAuthReady}
      freeRemaining={freeRemaining}
      persist={persistSocialLink}
      refresh={refresh}
    />

    <details className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold">이미 정리한 파일이 있나요?</summary>
      <div className="mt-3 border-t border-border pt-5">
        <h2 className="text-lg font-semibold">JSON 정리 파일 가져오기</h2>
        <p className="my-3 text-sm leading-6 text-text-secondary">이미지와 정리 내용을 미리 묶은 파일을 불러옵니다. 원본 그대로 저장하며, 출처의 확인 여부는 카드 내용에 유지합니다.</p>
        {!isAuthenticated && isAuthReady && <Link href="/login" className="inline-flex min-h-11 items-center underline">로그인하고 저장하기</Link>}
        <label className="block rounded-2xl border border-border bg-surface-elevated p-4">정리 파일
          <input aria-label="정리 파일" className="mt-3 block w-full text-sm" type="file" accept="application/json,.json" disabled={busy} onChange={e=>void choose(e.target.files?.[0])}/>
        </label>
        <p role="status" aria-live="polite" className="my-4 text-sm">{message || (cards.length ? `${cards.length}개 준비 · ${saved}개 저장` : '원본 이미지가 포함된 정리 파일을 선택하십시오.')}</p>
        {cards.length>0 && <>
          <button className="min-h-11 rounded-xl bg-primary px-5 py-3 text-white disabled:opacity-50" disabled={!isAuthReady || !isAuthenticated || busy || saved===cards.length} onClick={()=>void save()}>{busy ? `${saved} / ${cards.length} 저장 중` : saved===cards.length ? '저장 완료' : `${cards.length-saved}개 계정에 저장`}</button>
          <ul className="mt-6 grid grid-cols-2 gap-4">{cards.map((card,index)=><li key={index} className="min-w-0 rounded-2xl border border-border p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.image} alt={`${card.analysis.title} 가져올 원본`} className="h-40 w-full object-contain"/>
            <h3 className="my-2 text-sm font-semibold">{card.analysis.title}</h3>
            <p className="text-xs text-text-secondary">{index<saved?'계정 저장 완료':'저장 전'} · 출처 {card.analysis.links.length}개 · 장소 {card.analysis.places.length}개</p>
          </li>)}</ul>
        </>}
      </div>
    </details>
  </div>;
}
