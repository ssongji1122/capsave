import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CaptureGallery } from '@/components/captures/CaptureGallery';
afterEach(cleanup);
it('shows one original at a time, moves by buttons and keeps full-image display',()=>{
 const onOpen=vi.fn();render(<CaptureGallery images={[{imageUrl:'data:image/png;base64,A',label:'캡처',captureId:1},{imageUrl:'data:image/png;base64,B',label:'원본',captureId:1}]} title="서울" onOpen={onOpen}/>);
 expect(screen.getByRole('button',{name:'이전 이미지'})).toHaveProperty('disabled',true);
 fireEvent.click(screen.getByRole('button',{name:'다음 이미지'}));
 expect(screen.getByRole('img').getAttribute('src')).toContain('base64,B');
 expect(screen.getByRole('button',{name:'다음 이미지'})).toHaveProperty('disabled',true);
 fireEvent.click(screen.getByRole('img'));expect(onOpen).toHaveBeenCalledWith(1);
 expect(screen.getByRole('img').className).toContain('object-contain');
});
it('isolates inner gallery keyboard navigation from card-to-card navigation',()=>{
 render(<CaptureGallery images={[{imageUrl:'one',label:'캡처',captureId:1},{imageUrl:'two',label:'원본',captureId:1}]} title="서울" onOpen={()=>{}}/>);
 fireEvent.keyDown(screen.getByRole('group'),{key:'ArrowRight'});expect(screen.getByRole('status').textContent).toContain('2 / 2');
});
