import { describe, expect, it, vi } from 'vitest';
import { requestCaptureCoordinates } from '@/lib/capture-coordinates';

describe('requestCaptureCoordinates', () => {
  it('asks the server to fill coordinates for one capture and returns its places', async () => {
    const places = [{ name: '블루보틀', lat: 37.54, lng: 127.05, geocodedAt: '2026-10-24T00:00:00.000Z' }];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ captureId: 7, places }), { status: 200 })
    );

    await expect(requestCaptureCoordinates(7, fetchMock)).resolves.toEqual(places);
    expect(fetchMock).toHaveBeenCalledWith('/api/geocode/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captureId: 7 }),
    });
  });

  it('returns null when the server refuses or fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(requestCaptureCoordinates(7, fetchMock)).resolves.toBeNull();
  });

  it('returns null when the request itself fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(requestCaptureCoordinates(7, fetchMock)).resolves.toBeNull();
  });

  it('returns null when the response has no place list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"captureId":7}', { status: 200 }));
    await expect(requestCaptureCoordinates(7, fetchMock)).resolves.toBeNull();
  });
});
