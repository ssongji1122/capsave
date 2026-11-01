import { resizeImageFile } from './image-utils';
import { ANALYZE_MAX_WIDTH, ANALYZE_JPEG_QUALITY, MAX_BATCH_FILES } from './constants';

// Keep the complete ASCII JSON payload below the hosting platform's 4.5 MB limit.
export const BATCH_REQUEST_MAX_BYTES = 3_800_000;
const ANALYSIS_COPY_SETTINGS = [
  {width: ANALYZE_MAX_WIDTH, quality: ANALYZE_JPEG_QUALITY},
  {width: ANALYZE_MAX_WIDTH, quality: 0.85},
] as const;
const BATCH_TOO_LARGE = '사진 묶음의 전송 용량이 큽니다. 글자가 흐려지지 않도록 사진을 나누어 추가해 주세요.';
type EncodeCopy = (file:File,width:number,quality:number)=>Promise<string>;
const encodeAnalysisCopy:EncodeCopy = async (file,width,quality) => {
  const blob = await resizeImageFile(file,width,quality);
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload=()=>resolve((reader.result as string).split(',')[1]);
    reader.onerror=()=>reject(new Error('사진을 읽지 못했습니다. 다시 선택해 주세요.'));
    reader.readAsDataURL(blob);
  });
};

export async function prepareBatchAnalysis(files:File[],encode:EncodeCopy=encodeAnalysisCopy):Promise<string> {
  if(files.length===0 || files.length>MAX_BATCH_FILES) throw new Error(`사진은 1~${MAX_BATCH_FILES}장 선택해 주세요.`);
  for(const setting of ANALYSIS_COPY_SETTINGS) {
    const images=await Promise.all(files.map(file=>encode(file,setting.width,setting.quality)));
    const body=JSON.stringify({images});
    // JSON contains only base64 characters and ASCII property names: one byte per character.
    if(body.length<=BATCH_REQUEST_MAX_BYTES) return body;
  }
  throw new Error(BATCH_TOO_LARGE);
}

export async function batchAnalysisError(response:Response):Promise<string> {
  if(response.status===413) return BATCH_TOO_LARGE;
  if(response.status===504 || response.status===408) return '분석 응답 시간이 초과됐습니다. 사진 수를 줄여 다시 시도해 주세요.';
  const data=await response.json().catch(()=>null);
  if(typeof data?.error==='string' && data.error.trim()) return data.error;
  if(response.status===429) return '현재 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.';
  return `분석 서버에서 응답을 받지 못했습니다 (${response.status}). 잠시 후 다시 시도해 주세요.`;
}
