import './styles.css';
import { SECTIONS, makeCapture, filterCaptures } from './archive.js';
import { listCaptures, saveCapture } from './store.js';
import { ARCHIVE_APPEARANCE } from '../../../packages/shared/src/utils/archive-appearance.ts';

const app = document.querySelector('#app');
const photoInput = document.querySelector('#photo-input');
const notice = document.querySelector('#notice');
const NOTICE_DURATION_MS = 5000;
const TITLE_MAX_LENGTH = 120;
const NOTE_MAX_LENGTH = 4000;
let noticeTimer;
let captures = [];
let selectedSection = 'all';
let searchTerm = '';
let pending;
let objectUrls = [];
let busy = false;
let storageReady = false;
let nativePicker;

export function useNativePicker(picker) { nativePicker = picker; }
export function isSavingCapture() { return busy; }
export function showNavigationError() { announce('탐색 버튼을 연결하지 못했습니다. 화면의 보관함 버튼으로 돌아갈 수 있습니다.'); }

function el(tag, properties = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(properties)) {
    if (name.startsWith('on')) node.addEventListener(name.slice(2).toLowerCase(), value);
    else if (name === 'className') node.className = value;
    else if (name in node && !name.startsWith('aria')) node[name] = value;
    else node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

function announce(message) {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.hidden = false;
  noticeTimer = setTimeout(() => { notice.hidden = true; }, NOTICE_DURATION_MS);
}

function imageUrl(capture) {
  const url = URL.createObjectURL(new Blob([capture.image], { type: capture.mime }));
  objectUrls.push(url);
  return url;
}

function mark(id) {
  const node = el('span', { className: 'section-mark', 'aria-hidden': 'true' });
  if (ARCHIVE_APPEARANCE[id]) node.style.setProperty('--mark-color', ARCHIVE_APPEARANCE[id].color);
  return node;
}

function sectionLabel(id) { return SECTIONS.find(section => section.id === id)?.label || '아직 분류 전'; }
function title(capture) { return capture.title.trim() || capture.filename; }
function date(capture) { return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(capture.createdAt)); }

function navigate(hash) {
  location.hash = hash;
}

async function acceptImage(file) {
  if (!file || busy) return;
  busy = true;
  try {
    const capture = await makeCapture(file);
    // Header validation gives a clear error; decoding also rejects corrupt images.
    const decoded = await createImageBitmap(file);
    decoded.close();
    const existing = captures.find(item => item.id === capture.id);
    if (existing) {
      navigate(`capture/${existing.id}`);
      announce('이미 보관한 캡처입니다. 기존 기록을 열었습니다.');
    } else {
      pending = capture;
      navigate('new');
    }
  } catch (error) {
    announce(error instanceof DOMException ? '사진을 열지 못했습니다. 다른 사진을 선택해 주세요.' : error.message);
  } finally { busy = false; photoInput.value = ''; }
}

async function selectPhoto() {
  if (busy || !storageReady) return;
  if (!nativePicker) { photoInput.click(); return; }
  const button = document.querySelector('#add-capture');
  button.disabled = true;
  try {
    const file = await nativePicker();
    if (file) await acceptImage(file);
  } catch (error) {
    const message = error?.code === 'NOT_ALLOWED'
      ? '사진 접근을 허용한 뒤 다시 선택해 주세요. 보관함은 계속 사용할 수 있습니다.'
      : error?.code === 'UNSUPPORTED_APP_VERSION'
        ? '토스 앱을 업데이트한 뒤 다시 선택해 주세요.'
        : '사진을 가져오지 못했습니다. 다시 선택해 주세요.';
    announce(message);
  } finally { if (button.isConnected) button.disabled = false; }
}

function archiveGrid(container, count) {
  objectUrls.forEach(URL.revokeObjectURL);
  objectUrls = [];
  container.replaceChildren();
  const visible = filterCaptures(captures, searchTerm, selectedSection);
  count.textContent = `${visible.length}개`;
  if (!visible.length) {
    const isEmpty = captures.length === 0;
    container.className = 'empty';
    container.append(
      el('h2', {}, isEmpty ? '다시 보고 싶은 순간을\n모아 둡니다.' : '찾는 캡처가 없습니다.'),
      el('p', {}, isEmpty ? '사진첩에 있는 캡처 한 장을 골라 보세요. 분류와 메모는 나중에 붙여도 됩니다.' : '다른 검색어나 분류로 찾아 주세요.')
    );
    return;
  }
  container.className = 'grid';
  for (const capture of visible) {
    const card = el('button', { className: 'capture-card', onClick: () => navigate(`capture/${capture.id}`) },
      el('img', { src: imageUrl(capture), alt: '', loading: 'lazy' }),
      el('h3', {}, title(capture)),
      el('span', { className: 'meta' }, mark(capture.section), `${sectionLabel(capture.section)} · ${date(capture)}`)
    );
    container.append(card);
  }
}

function renderArchive() {
  const list = el('div', { id: 'capture-list' });
  const count = el('span', { className: 'meta' });
  const filters = el('nav', { className: 'filters', 'aria-label': '캡처 분류' });
  for (const section of [{ id: 'all', label: '전체' }, ...SECTIONS]) {
    filters.append(el('button', {
      className: 'filter', 'aria-pressed': String(selectedSection === section.id),
      onClick: event => {
        selectedSection = section.id;
        filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
        event.currentTarget.setAttribute('aria-pressed', 'true');
        archiveGrid(list, count);
      },
    }, ...(section.id === 'all' ? [] : [mark(section.id)]), section.label));
  }
  const search = el('input', {
    className: 'search', type: 'search', value: searchTerm,
    placeholder: '제목이나 메모로 찾기', 'aria-label': '제목이나 메모로 캡처 검색',
    onInput: event => { searchTerm = event.target.value; archiveGrid(list, count); },
  });
  app.append(
    el('header', { className: 'topline' }, el('span', { className: 'wordmark' }, 'my craves'), el('span', { className: 'badge' }, '캡처 보관함')),
    el('section', { className: 'intro' }, el('h1', {}, '모아 두고,\n다시 꺼냅니다.'),
      el('p', {}, '사진첩에 묻힌 캡처를 한곳에서 확인합니다.'),
      el('button', { id: 'add-capture', className: 'primary capture-add', disabled: !storageReady, onClick: selectPhoto }, '+ 캡처 추가'),
      el('p', { className: 'hint' }, '이 기기에만 저장합니다. 앱 데이터를 지우거나 기기를 바꾸면 기록이 사라질 수 있습니다.')
    ),
    search, filters,
    el('div', { className: 'archive-heading' }, el('h2', {}, '내가 보관한 캡처'), count), list
  );
  archiveGrid(list, count);
}

function renderEditor(capture, isNew) {
  const titleInput = el('input', { name: 'title', value: capture.title, maxLength: TITLE_MAX_LENGTH, placeholder: capture.filename });
  const sectionInput = el('select', { name: 'section' }, ...SECTIONS.map(section => el('option', { value: section.id }, section.label)));
  sectionInput.value = capture.section;
  const noteInput = el('textarea', { name: 'note', value: capture.note, maxLength: NOTE_MAX_LENGTH, placeholder: '다시 볼 때 기억하고 싶은 내용을 적습니다.' });
  const errorLine = el('p', { className: 'error', role: 'alert', hidden: true });
  const saveButton = el('button', { type: 'submit', className: 'primary' }, isNew ? '보관하기' : '변경 저장');
  const back = el('button', { type: 'button', className: 'text-button', onClick: () => navigate('') }, '‹ 보관함');
  const form = el('form', { className: 'editor', onSubmit: async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    saveButton.disabled = true;
    back.disabled = true;
    errorLine.hidden = true;
    try {
      const record = { ...capture, title: titleInput.value.trim(), section: sectionInput.value, note: noteInput.value.trim() };
      await saveCapture(record, { create: isNew });
      captures = await listCaptures();
      pending = undefined;
      selectedSection = 'all';
      searchTerm = '';
      navigate('');
      announce(isNew ? '캡처를 이 기기에 보관했습니다.' : '분류와 메모를 저장했습니다.');
    } catch (error) {
      errorLine.textContent = error?.name === 'ConstraintError'
        ? '다른 창에서 이미 보관한 캡처입니다. 새로고침하면 기존 기록을 확인할 수 있습니다.'
        : '저장하지 못했습니다. 기기의 남은 용량과 브라우저 저장 권한을 확인한 뒤 다시 시도해 주세요. 선택한 사진은 이 화면에 남아 있습니다.';
      errorLine.hidden = false;
    } finally { busy = false; saveButton.disabled = false; back.disabled = false; }
  } },
    el('div', { className: 'toolbar' }, back, saveButton),
    el('figure', { className: 'original' }, el('img', { src: imageUrl(capture), alt: `캡처 원본: ${capture.filename}` }),
      el('figcaption', {}, `${capture.filename} · 직접 선택한 이미지`)),
    el('label', { className: 'field' }, '제목 · 선택 사항', titleInput),
    el('label', { className: 'field' }, '분류 · 선택 사항', sectionInput),
    el('label', { className: 'field' }, '메모 · 선택 사항', noteInput), errorLine,
    el('p', { className: 'hint editor-note' }, '분류와 메모는 직접 정합니다. 원본과 기록은 이 기기에 보관하며 서버로 전송하지 않습니다.')
  );
  app.append(el('h1', { className: 'sr-heading', style: 'font-size:var(--fs-title);margin-block:var(--space-3)' }, isNew ? '캡처 보관하기' : '캡처 다시 보기'), form);
}

function render() {
  objectUrls.forEach(URL.revokeObjectURL);
  objectUrls = [];
  app.replaceChildren();
  const hash = location.hash.slice(1);
  const existing = hash.startsWith('capture/') && captures.find(capture => capture.id === hash.slice('capture/'.length));
  if (hash === 'new' && pending) renderEditor(pending, true);
  else if (existing) renderEditor(existing, false);
  else renderArchive();
  window.scrollTo(0, 0);
}

photoInput.addEventListener('change', () => acceptImage(photoInput.files[0]));
window.addEventListener('hashchange', () => {
  render();
  const heading = app.querySelector('h1');
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
});

try {
  captures = await listCaptures();
  storageReady = true;
} catch {
  announce('이 환경에서는 사진을 저장할 수 없습니다. 저장 권한을 확인한 뒤 다시 열어 주세요.');
}
render();
