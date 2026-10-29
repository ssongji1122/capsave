import Link from 'next/link';
import stickers from '../../../public/stickers/manifest.json';
import styles from './stickers.module.css';
const themes = ['기록을 남길 때', '책상 위 문구', '커피와 레모네이드', '케이크와 디저트', '단풍이 드는 계절', '낚시와 등산', 'AI 공부하는 날', '여행을 떠날 때', '집과 취미', '날씨와 자연'];
export const metadata = { title: 'Scrave — 스티커북' };
export default function StickersPage() {
 return <main className={styles.page}>
  <header className={styles.header}><Link href="/dashboard" className={styles.brand}>scrave</Link><Link href="/dashboard">my craves로 돌아가기</Link></header>
  <div className={styles.intro}><p>STICKER BOOK</p><h1>일상을 붙여 둡니다.</h1><p>가늘고 선명한 선, 슬레이트 블루로 그린 다이어리 스티커 100종입니다.</p><a href="/stickers/scrave-stickers-100.zip" download>100종 한 번에 받기</a></div>
  {themes.map((theme,index)=><section key={theme} className={styles.section} aria-labelledby={`theme-${index}`}><h2 id={`theme-${index}`}>{String(index+1).padStart(2,'0')} · {theme}</h2><div className={styles.grid}>{stickers.slice(index*10,index*10+10).map(sticker=><a key={sticker.id} href={`/stickers/${sticker.file}`} download aria-label={`${sticker.label} PNG 저장`}><img src={`/stickers/${sticker.file}`} alt={sticker.label} loading="lazy" width={220} height={220}/><span>{sticker.label}</span></a>)}</div></section>)}
  <footer>투명 배경 PNG 파일입니다. 그림을 누르면 개별 파일을 받을 수 있습니다.</footer>
 </main>;
}
