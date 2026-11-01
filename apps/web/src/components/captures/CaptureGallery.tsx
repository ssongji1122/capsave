'use client';
import { useRef, useState } from 'react';
import { extractStoragePath, type CaptureItem } from '@scrave/shared';
export function CaptureGallery({images,title,onOpen,onChange}: {images: NonNullable<CaptureItem['gallery']>;title:string;onOpen:(index:number)=>void;onChange?:(index:number)=>void}) {
  const [position,setPosition] = useState(0);
  const start = useRef<{x:number;y:number}|null>(null);
  const swiped = useRef(false);
  const index = Math.min(position,Math.max(0,images.length-1));
  const image = images[index];
  const move = (step:number) => {const next=Math.max(0,Math.min(images.length-1,index+step));setPosition(next);onChange?.(next);};
  if (!image) return null;
  const src = image.imageUrl.startsWith('data:') ? image.imageUrl : `/api/image?path=${encodeURIComponent(extractStoragePath(image.imageUrl))}`;
  return <div data-capture-gallery role="group" tabIndex={0} aria-label={`${title} 게시물 이미지`} className="relative h-full w-full" style={{touchAction:'pan-y'}}
    onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();move(event.key==='ArrowRight'?1:-1);}}}
    onPointerDown={event=>{event.stopPropagation();if(event.button!==0||(event.target as HTMLElement).closest('button'))return;start.current={x:event.clientX,y:event.clientY};swiped.current=false;}}
    onPointerUp={event=>{event.stopPropagation();if(!start.current)return;const dx=event.clientX-start.current.x;const dy=event.clientY-start.current.y;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.5){move(dx<0?1:-1);swiped.current=true;}start.current=null;}}
    onPointerCancel={()=>{start.current=null;}}
    onClickCapture={event=>{if(swiped.current){event.preventDefault();event.stopPropagation();swiped.current=false;}}}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={`${title} · ${image.label} ${index+1}/${images.length}`} className="h-full w-full object-contain cursor-pointer" loading="lazy" draggable={false} onClick={()=>onOpen(index)}/>
    {images.length>1&&<nav aria-label="게시물 이미지 넘기기" className="absolute bottom-2 inset-x-2 flex items-center justify-between rounded-full bg-surface/95 text-primary">
      <button type="button" aria-label="이전 이미지" disabled={index===0} className="h-11 w-11 disabled:opacity-30" onClick={event=>{event.stopPropagation();move(-1);}}>←</button>
      <span role="status" aria-live="polite" className="text-xs">{index+1} / {images.length}</span>
      <button type="button" aria-label="다음 이미지" disabled={index===images.length-1} className="h-11 w-11 disabled:opacity-30" onClick={event=>{event.stopPropagation();move(1);}}>→</button>
    </nav>}
  </div>;
}
