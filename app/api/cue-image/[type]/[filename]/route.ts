import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; filename: string } }
) {
  const { type, filename } = params;

  if (type !== 'layers' && type !== 'materials') {
    return new NextResponse('Invalid image type', { status: 400 });
  }

  // Local cache path
  const cacheDir = path.join(process.cwd(), 'public', 'cache_images', type);
  const cachePath = path.join(cacheDir, filename);

  // Return cached file if exists
  if (fs.existsSync(cachePath)) {
    const fileBuffer = fs.readFileSync(cachePath);
    const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // Otherwise, fetch from upstream CueWizard
  const targetUrl = `https://www.cuewizard.com/images/${type}/${filename}`;
  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Referer: 'https://www.cuewizard.com/edit',
      },
    });

    if (!upstreamRes.ok) {
      return new NextResponse('Image not found upstream', { status: upstreamRes.status });
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to cache asynchronously
    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(cachePath, buffer);
    } catch (saveErr) {
      console.error('Failed to cache image locally:', saveErr);
    }

    const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    console.error('Error fetching image:', err);
    return new NextResponse('Internal server error loading image', { status: 500 });
  }
}
