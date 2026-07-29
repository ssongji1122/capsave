import { ImageResponse } from 'next/og';

export const alt = '울루와뚜, 하루의 끝을 따라가는 세 곳';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          padding: 62,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#050508',
          backgroundImage:
            'radial-gradient(circle at 78% 22%, rgba(52, 211, 153, 0.18), transparent 32%), radial-gradient(circle at 15% 90%, rgba(244, 132, 95, 0.2), transparent 36%)',
          color: '#F1E1C7',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 62,
            bottom: 56,
            left: 62,
            flexDirection: 'column',
            width: 710,
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              color: '#F4845F',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.18em',
            }}
          >
            BALI · ULUWATU · PUBLIC GUIDE
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 30,
              width: 710,
              fontSize: 58,
              fontWeight: 800,
              letterSpacing: '-0.055em',
              lineHeight: 1.05,
            }}
          >
            <div style={{ display: 'flex' }}>울루와뚜,</div>
            <div style={{ display: 'flex' }}>하루의 끝을 따라가는</div>
            <div style={{ display: 'flex' }}>세 곳</div>
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 42,
              color: '#9F9C94',
              fontSize: 24,
            }}
          >
            장소 3곳 · 확인한 자료 6개 · Google 지도
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 62,
            bottom: 48,
            alignItems: 'center',
            gap: 14,
            color: '#F4845F',
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(244, 132, 95, 0.45)',
              borderRadius: 14,
              background: 'rgba(244, 132, 95, 0.12)',
            }}
          >
            S
          </div>
          Scrave
        </div>

        <div
          style={{
            display: 'flex',
            position: 'absolute',
            right: -32,
            top: 92,
            width: 420,
            height: 420,
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(125, 211, 252, 0.28)',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 34% 27%, #294C52, #102328 58%, #071014 100%)',
            boxShadow: '0 40px 90px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              width: 420,
              height: 132,
              border: '1px solid rgba(125, 211, 252, 0.2)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              width: 158,
              height: 420,
              border: '1px solid rgba(125, 211, 252, 0.18)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              right: 88,
              bottom: 96,
              width: 28,
              height: 28,
              border: '7px solid rgba(244, 132, 95, 0.22)',
              borderRadius: '50%',
              background: '#F4845F',
              boxShadow: '0 0 30px rgba(244, 132, 95, 0.72)',
            }}
          />
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              right: 52,
              bottom: 67,
              color: '#F4A286',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.1em',
            }}
          >
            ULUWATU · BALI
          </div>
        </div>
      </div>
    ),
    size
  );
}
