'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  BookOpenCheck,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  Landmark,
  Map as MapIcon,
  MapPin,
  Navigation,
  PlayCircle,
  Utensils,
  Waves,
} from 'lucide-react';
import type {
  GuidePlace,
  GuidePlaceCategory,
  GuideReferenceKind,
  PublicGuide,
} from '@/lib/public-guides';
import {
  getGuideMapLinks,
  getGuideReferencePreviewImagePath,
} from '@/lib/public-guides';
import { ShareGuideButton } from './ShareGuideButton';
import styles from './PublicGuideExperience.module.css';

interface PublicGuideExperienceProps {
  guide: PublicGuide;
  canonicalUrl: string;
}

type AtlasMode = 'globe' | 'local';

const CATEGORY_LABELS: Record<GuidePlaceCategory, string> = {
  beach: 'BEACH',
  culture: 'CULTURE',
  food: 'FOOD & DRINK',
};

const REFERENCE_LABELS: Record<GuideReferenceKind, string> = {
  government: '관광청',
  official: '공식',
  editorial: '지역 가이드',
  video: '영상',
};

const MAP_PADDING_PERCENT = 12;
const MAP_DRAWING_PERCENT = 76;

function getCategoryIcon(category: GuidePlaceCategory) {
  if (category === 'beach') return Waves;
  if (category === 'culture') return Landmark;
  return Utensils;
}

function getReferenceIcon(kind: GuideReferenceKind) {
  if (kind === 'video') return PlayCircle;
  if (kind === 'official' || kind === 'government') return CheckCircle2;
  return BookOpenCheck;
}

function getCoordinatePositions(places: GuidePlace[]) {
  const latitudes = places.map((place) => place.coordinates.latitude);
  const longitudes = places.map((place) => place.coordinates.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeRange = maxLatitude - minLatitude || 1;
  const longitudeRange = maxLongitude - minLongitude || 1;

  return places.map((place) => ({
    id: place.id,
    x:
      MAP_PADDING_PERCENT +
      ((place.coordinates.longitude - minLongitude) / longitudeRange) *
        MAP_DRAWING_PERCENT,
    y:
      MAP_PADDING_PERCENT +
      ((maxLatitude - place.coordinates.latitude) / latitudeRange) *
        MAP_DRAWING_PERCENT,
  }));
}

function GlobeView() {
  return (
    <div className={styles.globeStage}>
      <div className={styles.orbitLabel}>
        <Navigation size={14} aria-hidden="true" />
        SEOUL → BALI
      </div>
      <svg
        className={styles.globe}
        viewBox="0 0 560 560"
        role="img"
        aria-label="서울에서 발리 울루와뚜로 이어지는 지구본"
      >
        <defs>
          <radialGradient id="ocean" cx="32%" cy="24%" r="76%">
            <stop offset="0%" stopColor="#203C43" />
            <stop offset="58%" stopColor="#0D2025" />
            <stop offset="100%" stopColor="#071014" />
          </radialGradient>
          <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C4B294" />
            <stop offset="100%" stopColor="#746956" />
          </linearGradient>
          <linearGradient id="route" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7DD3FC" />
            <stop offset="100%" stopColor="#F4845F" />
          </linearGradient>
          <clipPath id="globeClip">
            <circle cx="280" cy="280" r="226" />
          </clipPath>
          <filter id="glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="280" cy="280" r="244" fill="rgba(52, 211, 153, 0.04)" />
        <circle cx="280" cy="280" r="226" fill="url(#ocean)" stroke="#36515A" />

        <g clipPath="url(#globeClip)" opacity="0.42" fill="none" stroke="#779198">
          <ellipse cx="280" cy="280" rx="226" ry="72" />
          <ellipse cx="280" cy="280" rx="226" ry="144" />
          <ellipse cx="280" cy="280" rx="82" ry="226" />
          <ellipse cx="280" cy="280" rx="166" ry="226" />
          <path d="M54 280H506" />
          <path d="M280 54V506" />
        </g>

        <g clipPath="url(#globeClip)" fill="url(#land)" opacity="0.84">
          <path d="M180 107l42 4 27 20 30-6 25 15 41 4 31 20 33 4 20 24-6 29-33 18-23 32-37-1-20-19-38-2-27-23-32-11-20-37-23-22z" />
          <path d="M329 265l32 12 18 25-7 34 18 23-13 43-30 11-17-29-24-17 4-39-18-27 16-27z" />
          <path d="M405 350l26 7 15 19-11 15-28-5-15-20z" />
          <path d="M122 173l35-18 27 12 9 29-28 22-9 41-31 2-23-31z" />
        </g>

        <path
          d="M385 204 C 442 238, 458 306, 411 374"
          fill="none"
          stroke="url(#route)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="7 9"
        />
        <circle cx="385" cy="204" r="5" fill="#7DD3FC" />
        <circle cx="385" cy="204" r="12" fill="none" stroke="#7DD3FC" opacity="0.34" />
        <g filter="url(#glow)">
          <circle cx="411" cy="374" r="7" fill="#F4845F" />
          <circle cx="411" cy="374" r="18" fill="none" stroke="#F4845F" opacity="0.42" />
        </g>
        <text x="350" y="188" fill="#B6D8E3" fontSize="14" fontFamily="Space Grotesk">
          SEOUL
        </text>
        <text x="426" y="380" fill="#F8B09A" fontSize="14" fontFamily="Space Grotesk">
          ULUWATU
        </text>
      </svg>
      <div className={styles.globeCoordinate}>8.82° S · 115.09° E</div>
    </div>
  );
}

function LocalMapView({
  guide,
  activePlaceId,
  onSelectPlace,
}: {
  guide: PublicGuide;
  activePlaceId: string;
  onSelectPlace: (placeId: string) => void;
}) {
  const positions = useMemo(
    () => getCoordinatePositions(guide.places),
    [guide.places]
  );
  const routePoints = positions.map(({ x, y }) => `${x},${y}`).join(' ');

  return (
    <div className={styles.localMap}>
      <div className={styles.mapCaption}>
        <span>PECATU COAST</span>
        <span>좌표 기준 위치 개요</span>
      </div>
      <svg
        className={styles.mapDrawing}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mapSea" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10262A" />
            <stop offset="100%" stopColor="#071013" />
          </linearGradient>
          <filter id="routeGlow">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="100" height="100" fill="url(#mapSea)" />
        <path
          d="M68 -4 C62 13 72 22 65 38 C57 58 60 73 48 104 L104 104 L104 -4 Z"
          fill="#252920"
          stroke="#4B5949"
          strokeWidth="0.6"
        />
        <g fill="none" stroke="#586050" strokeWidth="0.28" opacity="0.62">
          <path d="M73 3 C66 18 75 28 69 42 C61 60 65 78 53 99" />
          <path d="M79 1 C72 17 81 29 75 44 C68 62 72 80 61 101" />
          <path d="M86 0 C79 18 88 31 82 47 C75 65 80 84 69 101" />
          <path d="M93 0 C86 19 95 33 89 50 C82 68 87 86 77 102" />
        </g>
        <g fill="none" stroke="#203D42" strokeWidth="0.24" opacity="0.82">
          <circle cx="24" cy="20" r="9" />
          <circle cx="24" cy="20" r="16" />
          <circle cx="24" cy="20" r="24" />
          <circle cx="18" cy="76" r="11" />
          <circle cx="18" cy="76" r="19" />
          <circle cx="18" cy="76" r="28" />
        </g>
        <polyline
          points={routePoints}
          fill="none"
          stroke="#F4845F"
          strokeWidth="0.9"
          strokeDasharray="2.2 2.2"
          filter="url(#routeGlow)"
        />
      </svg>

      {guide.places.map((place) => {
        const position = positions.find(({ id }) => id === place.id);
        if (!position) return null;

        return (
          <button
            key={place.id}
            type="button"
            aria-label={`${place.sequence}. ${place.localName} 선택`}
            aria-pressed={activePlaceId === place.id}
            className={`${styles.mapPin} ${
              activePlaceId === place.id ? styles.mapPinActive : ''
            }`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onClick={() => onSelectPlace(place.id)}
          >
            {String(place.sequence).padStart(2, '0')}
          </button>
        );
      })}

      <div className={styles.mapLegend}>
        <span className={styles.routeLine} />
        추천 순서
      </div>
    </div>
  );
}

export function PublicGuideExperience({
  guide,
  canonicalUrl,
}: PublicGuideExperienceProps) {
  const [atlasMode, setAtlasMode] = useState<AtlasMode>('globe');
  const [activePlaceId, setActivePlaceId] = useState(guide.places[0]?.id ?? '');
  const referenceCount = guide.places.reduce(
    (total, place) => total + place.references.length,
    0
  );

  const selectPlace = (placeId: string, scroll = false) => {
    setActivePlaceId(placeId);
    if (scroll) {
      document
        .getElementById(`place-${placeId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className={styles.pageShell}>
      <header className={styles.header}>
        <a href="/" className={styles.brand} aria-label="Scrave 홈">
          <span className={styles.brandMark}>S</span>
          <span>
            <strong>Scrave</strong>
            <small>PUBLIC ARCHIVE</small>
          </span>
        </a>
        <div className={styles.headerMeta}>
          <span className={styles.publicBadge}>PUBLIC</span>
          <ShareGuideButton
            title={guide.title}
            description={guide.description}
            canonicalUrl={canonicalUrl}
            className={styles.shareButton}
          />
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{guide.eyebrow}</p>
            <h1>{guide.title}</h1>
            <p className={styles.heroDescription}>{guide.description}</p>

            <dl className={styles.guideStats}>
              <div>
                <dt>장소</dt>
                <dd>{guide.places.length}곳</dd>
              </div>
              <div>
                <dt>확인한 자료</dt>
                <dd>{referenceCount}개</dd>
              </div>
              <div>
                <dt>마지막 확인</dt>
                <dd>{guide.updatedAt.replaceAll('-', '.')}</dd>
              </div>
            </dl>

            <a href="#route" className={styles.routeLink}>
              세 곳 따라보기
              <ArrowDown size={17} aria-hidden="true" />
            </a>
          </div>

          <div className={styles.atlasPanel}>
            <div className={styles.atlasToolbar}>
              <div>
                <p>TRAVEL ATLAS</p>
                <span>{guide.location}</span>
              </div>
              <div className={styles.atlasToggle} aria-label="지도 보기 방식">
                <button
                  type="button"
                  aria-pressed={atlasMode === 'globe'}
                  onClick={() => setAtlasMode('globe')}
                >
                  <Globe2 size={15} aria-hidden="true" />
                  지구본
                </button>
                <button
                  type="button"
                  aria-pressed={atlasMode === 'local'}
                  onClick={() => setAtlasMode('local')}
                >
                  <MapIcon size={15} aria-hidden="true" />
                  현지 지도
                </button>
              </div>
            </div>

            <div className={styles.atlasCanvas}>
              {atlasMode === 'globe' ? (
                <GlobeView />
              ) : (
                <LocalMapView
                  guide={guide}
                  activePlaceId={activePlaceId}
                  onSelectPlace={(placeId) => selectPlace(placeId, true)}
                />
              )}
            </div>
          </div>
        </section>

        <section id="route" className={styles.routeSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>ONE DAY · THREE SCENES</p>
              <h2>낮에서 밤으로 이어지는 순서</h2>
            </div>
            <p>
              장소 이름만 모으지 않고, 언제 가면 좋은지와 무엇을 다시 확인해야
              하는지까지 함께 정리했습니다.
            </p>
          </div>

          <div className={styles.routeGrid}>
            <aside className={styles.routeRail} aria-label="추천 방문 순서">
              {guide.places.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => selectPlace(place.id, true)}
                  aria-pressed={activePlaceId === place.id}
                  className={
                    activePlaceId === place.id ? styles.routeRailActive : ''
                  }
                >
                  <span>{String(place.sequence).padStart(2, '0')}</span>
                  <span>
                    <strong>{place.localName}</strong>
                    <small>{place.scene.split(' · ')[1]}</small>
                  </span>
                </button>
              ))}
            </aside>

            <div className={styles.placeList}>
              {guide.places.map((place) => {
                const CategoryIcon = getCategoryIcon(place.category);
                const mapLink = getGuideMapLinks(place)[0];
                const isActive = activePlaceId === place.id;

                return (
                  <article
                    id={`place-${place.id}`}
                    key={place.id}
                    className={`${styles.placeCard} ${
                      isActive ? styles.placeCardActive : ''
                    }`}
                    onMouseEnter={() => setActivePlaceId(place.id)}
                  >
                    <div className={styles.placeVisual} data-category={place.category}>
                      <div className={styles.placeNumber}>
                        {String(place.sequence).padStart(2, '0')}
                      </div>
                      <CategoryIcon size={34} aria-hidden="true" />
                      <div className={styles.visualCoordinates}>
                        {Math.abs(place.coordinates.latitude).toFixed(3)}° S
                        <br />
                        {place.coordinates.longitude.toFixed(3)}° E
                      </div>
                    </div>

                    <div className={styles.placeContent}>
                      <div className={styles.placeTitleRow}>
                        <div>
                          <p className={styles.categoryLabel}>
                            {CATEGORY_LABELS[place.category]}
                          </p>
                          <h3>{place.localName}</h3>
                          <span>{place.name}</span>
                        </div>
                        <span className={styles.verifiedBadge}>
                          <CheckCircle2 size={13} aria-hidden="true" />
                          위치 확인
                        </span>
                      </div>

                      <p className={styles.placeSummary}>{place.summary}</p>

                      <div className={styles.visitDetails}>
                        <div>
                          <Clock3 size={17} aria-hidden="true" />
                          <span>
                            <small>추천 시간</small>
                            <strong>{place.visitWindow}</strong>
                          </span>
                        </div>
                        <div>
                          <MapPin size={17} aria-hidden="true" />
                          <span>
                            <small>주소</small>
                            <strong>{place.address}</strong>
                          </span>
                        </div>
                      </div>

                      {place.hours && (
                        <div className={styles.hoursBox}>
                          <CalendarCheck size={17} aria-hidden="true" />
                          <div>
                            <small>공식 사이트 표기 영업시간</small>
                            {place.hours.map((hours) => (
                              <span key={hours}>{hours}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={styles.practicalNote}>
                        <strong>가기 전 확인</strong>
                        <p>{place.practicalNote}</p>
                      </div>

                      <div className={styles.placeActions}>
                        {mapLink && (
                          <a
                            href={mapLink.webUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.primaryAction}
                          >
                            <Navigation size={16} aria-hidden="true" />
                            Google 지도에서 보기
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </a>
                        )}
                        <span>{place.references.length}개 자료로 확인</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.evidenceSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>SOURCE DESK</p>
              <h2>추천과 사실을 나눠서 저장했습니다</h2>
            </div>
            <p>
              주소와 운영 정보는 관광청·공식 사이트에서 확인하고, 블로그와
              영상은 경험을 가늠하는 참고 자료로만 구분했습니다.
            </p>
          </div>

          <div className={styles.evidenceGrid}>
            {guide.places.flatMap((place) =>
              place.references.map((reference) => {
                const ReferenceIcon = getReferenceIcon(reference.kind);
                return (
                  <a
                    key={`${place.id}-${reference.url}`}
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.evidenceCard}
                  >
                    <div className={styles.evidencePreview}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getGuideReferencePreviewImagePath(reference)}
                        alt={reference.preview.imageAlt}
                        loading="lazy"
                      />
                    </div>
                    <div className={styles.referenceType}>
                      <ReferenceIcon size={17} aria-hidden="true" />
                      {REFERENCE_LABELS[reference.kind]}
                    </div>
                    <h3>{reference.preview.title}</h3>
                    <strong className={styles.referenceLabel}>
                      {reference.label}
                    </strong>
                    <p>{reference.note}</p>
                    <p className={styles.previewDescription}>
                      {reference.preview.description}
                    </p>
                    <div>
                      <span>{reference.publisher}</span>
                      <span>
                        {reference.checkedAt.replaceAll('-', '.')}
                        <ExternalLink size={13} aria-hidden="true" />
                      </span>
                    </div>
                  </a>
                );
              })
            )}
          </div>
        </section>

        <section className={styles.shareSection}>
          <div>
            <p className={styles.eyebrow}>PASS IT ON</p>
            <h2>같이 갈 사람에게 이 지도 그대로 보내세요</h2>
            <p>
              상대방은 가입하지 않아도 세 장소와 출처, Google 지도 링크를 모두
              볼 수 있습니다.
            </p>
          </div>
          <ShareGuideButton
            title={guide.title}
            description={guide.description}
            canonicalUrl={canonicalUrl}
            className={styles.shareButtonLarge}
          />
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}>
          Scrave
        </a>
        <p>캡처에서 시작해, 확인 가능한 여행 자산으로.</p>
        <span>{guide.curator} · {guide.updatedAt.slice(0, 4)}</span>
      </footer>
    </div>
  );
}
