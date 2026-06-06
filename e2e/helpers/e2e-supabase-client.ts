import { Page } from '@playwright/test';

export async function installSupabaseClientMock(page: Page) {
  await page.addInitScript(() => {
    const userId = 'e2e-user-1';
    const rows = [
      {
        id: 501,
        category: 'place',
        title: '성수 카페 저장',
        summary: '좌표가 이미 있는 장소 캡처',
        places: [{ name: '성수 테스트 카페', address: '서울 성동구', lat: 37.5446, lng: 127.0557 }],
        extracted_text: '',
        links: [],
        tags: ['카페'],
        source: 'other',
        image_url: '/icon.svg',
        created_at: '2026-06-05T10:00:00.000Z',
        user_id: userId,
        confidence: 0.92,
        reclassified_at: null,
        deleted_at: null,
        source_account_id: null,
      },
      {
        id: 502,
        category: 'place',
        title: '을지로 맛집 저장',
        summary: '좌표 변환이 필요한 장소 캡처',
        places: [{ name: '을지로 테스트 식당', address: '서울 중구 을지로' }],
        extracted_text: '',
        links: [],
        tags: ['식당'],
        source: 'other',
        image_url: '/icon.svg',
        created_at: '2026-06-05T09:00:00.000Z',
        user_id: userId,
        confidence: 0.88,
        reclassified_at: null,
        deleted_at: null,
        source_account_id: null,
      },
    ];

    function createInsertedRow(body) {
      return {
        id: 700,
        category: body.category ?? 'place',
        title: body.title ?? '저장된 분석 결과',
        summary: body.summary ?? '',
        places: body.places ?? [],
        extracted_text: body.extracted_text ?? '',
        links: body.links ?? [],
        tags: body.tags ?? [],
        source: body.source ?? 'other',
        image_url: body.image_url ?? 'e2e/uploaded.png',
        created_at: '2026-06-05T12:00:00.000Z',
        user_id: userId,
        confidence: body.confidence ?? 0.9,
        reclassified_at: null,
        deleted_at: null,
        source_account_id: null,
      };
    }

    function createQuery(table) {
      const state = { action: 'select', payload: null, single: false };
      const builder = {
        select() { return builder; },
        is() { return builder; },
        order() { return builder; },
        limit() { return builder; },
        lt() { return builder; },
        eq() { return builder; },
        range() { return builder; },
        or() { return builder; },
        single() {
          state.single = true;
          return builder;
        },
        insert(payload) {
          state.action = 'insert';
          state.payload = payload;
          return builder;
        },
        update(payload) {
          state.action = 'update';
          state.payload = payload;
          return builder;
        },
        upsert(payload) {
          state.action = 'upsert';
          state.payload = payload;
          return builder;
        },
        then(resolve) {
          resolve(executeQuery(table, state));
        },
      };
      return builder;
    }

    function executeQuery(table, state) {
      if (table === 'user_preferences') {
        return { data: { preferred_nav_app: 'naver' }, error: null };
      }
      if (table !== 'captures') {
        return { data: state.single ? null : [], error: null, count: 0 };
      }
      if (state.action === 'insert') {
        const inserted = createInsertedRow(state.payload);
        rows.unshift(inserted);
        return { data: inserted, error: null };
      }
      if (state.action === 'update') {
        return { data: rows[0], error: null };
      }
      return { data: rows, error: null, count: rows.length };
    }

    window.__SCRAVE_E2E_SUPABASE_CLIENT__ = {
      auth: {
        getUser: async () => ({
          data: {
            user: { id: userId, email: 'e2e@scrave.local', is_anonymous: false },
          },
          error: null,
        }),
        signOut: async () => ({ error: null }),
      },
      from: createQuery,
      channel: () => ({
        on() { return this; },
        subscribe() { return this; },
      }),
      removeChannel: () => undefined,
      storage: {
        from: () => ({
          getPublicUrl: (path) => ({ data: { publicUrl: path } }),
          upload: async () => ({ error: null }),
          remove: async () => ({ error: null }),
        }),
      },
    };
  });
}
