import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { list } from '@vercel/blob';

// Use Vercel Blob Storage in production, file system in development
const USE_BLOB_STORAGE = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL;

export async function GET() {
  try {
    let imageBuffer: Buffer;

    if (USE_BLOB_STORAGE) {
      // Fetch from Vercel Blob Storage
      try {
        // List blobs to find the wallpaper
        const { blobs } = await list({ prefix: 'wallpaper.jpg' });
        const wallpaperBlob = blobs.find(b => b.pathname === 'wallpaper.jpg');
        
        if (!wallpaperBlob) {
          throw new Error('Wallpaper not found');
        }
        
        // Fetch the image from the blob URL
        const response = await fetch(wallpaperBlob.url);
        if (!response.ok) {
          throw new Error('Failed to fetch wallpaper');
        }
        imageBuffer = Buffer.from(await response.arrayBuffer());
      } catch (error) {
        // If blob doesn't exist, return placeholder
        return new NextResponse(
          '<svg width="1170" height="2532" xmlns="http://www.w3.org/2000/svg"><rect width="1170" height="2532" fill="#f0f0f0"/><text x="585" y="1266" font-family="Arial" font-size="48" fill="#999" text-anchor="middle" dominant-baseline="middle">No wallpaper set</text></svg>',
          {
            status: 200,
            headers: {
              'Content-Type': 'image/svg+xml',
              'Cache-Control': 'no-cache',
            },
          }
        );
      }
    } else {
      // Use file system for local development
      const wallpaperPath = join(process.cwd(), 'public', 'wallpaper.jpg');

      // Check if wallpaper exists
      if (!existsSync(wallpaperPath)) {
        // Return a default placeholder image
        return new NextResponse(
          '<svg width="1170" height="2532" xmlns="http://www.w3.org/2000/svg"><rect width="1170" height="2532" fill="#f0f0f0"/><text x="585" y="1266" font-family="Arial" font-size="48" fill="#999" text-anchor="middle" dominant-baseline="middle">No wallpaper set</text></svg>',
          {
            status: 200,
            headers: {
              'Content-Type': 'image/svg+xml',
              'Cache-Control': 'no-cache',
            },
          }
        );
      }

      // Read the wallpaper file
      imageBuffer = await readFile(wallpaperPath);
    }

    // Return the image with appropriate headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error serving wallpaper:', error);
    return NextResponse.json(
      { error: 'Failed to serve wallpaper' },
      { status: 500 }
    );
  }
}

