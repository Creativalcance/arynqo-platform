import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const dynamic = 'force-static';
export const runtime = 'nodejs';

export async function GET() {
  const logo = await readFile(join(process.cwd(), 'public/logo-arynqo.png'));
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#F7F9FC', color: '#07111F', borderBottom: '14px solid #1683FF' }}>
      {/* ImageResponse renders this embedded asset without a network request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${logo.toString('base64')}`} width={800} height={200} style={{ width: 800, height: 200, flexShrink: 0 }} alt="ARYNQO" />
      <div style={{ display: 'flex', marginTop: 42, fontSize: 46, fontWeight: 700 }}>Where talent evolves.</div>
      <div style={{ display: 'flex', marginTop: 32, fontSize: 27, color: '#475569' }}>arynqo.com</div>
    </div>,
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } },
  );
}
