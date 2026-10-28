import type { ArchiveCapture } from './capture-archive';
import { classifyArchiveCapture } from './capture-archive';
export interface CaptureReviewTopic { query: string; label: string; reason: string }
const FLIGHT_CONTEXT = /항공권|항공편|boarding|flight|\b[A-Z0-9]{2}\d{3,4}\b/i;
const AIRPORT = /공항|airport/i;
const CEBU = /세부|막탄|cebu|mactan/i;
const INCHEON = /인천|incheon/i;
const NIGHT_HOUR = 6;
const FIRST_SEGMENT_SIZE = 2;
export function buildCaptureReviewTopic(capture: ArchiveCapture, placeIndex: number): CaptureReviewTopic {
  const place = capture.places[placeIndex];
  const name = place?.name || capture.title;
  const flightContext = classifyArchiveCapture(capture) === 'travel' && AIRPORT.test(name) && capture.places.length >= FIRST_SEGMENT_SIZE && FLIGHT_CONTEXT.test([capture.title, capture.summary, capture.extractedText].join(' '));
  if (!flightContext) return { query: name, label: '이 장소의 후기·영상', reason: '캡처에 나온 장소 이름으로 관련 후기를 찾습니다.' };
  const arrival = placeIndex % FIRST_SEGMENT_SIZE === 1;
  const dateText = place?.date || place?.address || '';
  const hourMatch = /(?:T|\s)(\d{1,2}):\d{2}/.exec(dateText);
  const lateArrival = arrival && hourMatch !== null && Number(hourMatch[1]) < NIGHT_HOUR;
  const terminal = INCHEON.test(name) && /1\s*터미널|터미널\s*1/.test(capture.extractedText) ? '1터미널' : '';
  const need = arrival ? (lateArrival ? '심야 도착 공항 이동' : '입국 공항 이동') : '출국 체크인';
  const region = CEBU.test(name) ? '세부 막탄 공항' : name;
  return { query: [region, terminal, need].filter(Boolean).join(' '), label: arrival ? '도착 후 이동에 필요한 후기·영상' : '출국 준비에 필요한 후기·영상', reason: `${name} ${arrival ? '도착' : '출발'} 일정에 맞춰 ${need} 정보를 찾습니다.` };
}
