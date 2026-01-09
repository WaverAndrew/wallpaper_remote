import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { put } from '@vercel/blob';

// iPhone 16 resolution
const IPHONE_WIDTH = 1170;
const IPHONE_HEIGHT = 2532;

// Use Vercel Blob Storage in production, file system in development
const USE_BLOB_STORAGE = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const text = formData.get('text') as string || '';
    const textColor = formData.get('textColor') as string || '#FFFFFF';
    const textSize = parseInt(formData.get('textSize') as string) || 48;
    const textX = parseFloat(formData.get('textX') as string) || 50;
    const textY = parseFloat(formData.get('textY') as string) || 50;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image with Sharp
    let image = sharp(buffer)
      .resize(IPHONE_WIDTH, IPHONE_HEIGHT, {
        fit: 'cover',
        position: 'center',
      });

    // If text is provided, add text overlay using SVG
    if (text) {
      const svgText = `
        <svg width="${IPHONE_WIDTH}" height="${IPHONE_HEIGHT}">
          <text
            x="${(textX / 100) * IPHONE_WIDTH}"
            y="${(textY / 100) * IPHONE_HEIGHT}"
            font-family="Arial, sans-serif"
            font-size="${textSize}"
            font-weight="bold"
            fill="${textColor}"
            text-anchor="middle"
            dominant-baseline="middle"
          >${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
        </svg>
      `;

      const svgBuffer = Buffer.from(svgText);
      image = image.composite([
        {
          input: svgBuffer,
          top: 0,
          left: 0,
        },
      ]);
    }

    // Convert to JPEG
    const processedImage = await image
      .jpeg({ quality: 95 })
      .toBuffer();

    if (USE_BLOB_STORAGE) {
      // Use Vercel Blob Storage for production
      const blob = await put('wallpaper.jpg', processedImage, {
        access: 'public',
        contentType: 'image/jpeg',
      });

      // Store metadata in blob as well
      const metadata = {
        text,
        textColor,
        textSize,
        textX,
        textY,
        updatedAt: new Date().toISOString(),
        imageUrl: blob.url,
      };
      await put('wallpaper.json', JSON.stringify(metadata, null, 2), {
        access: 'public',
        contentType: 'application/json',
      });
    } else {
      // Use file system for local development
      const publicDir = join(process.cwd(), 'public');
      const dataDir = join(process.cwd(), 'data');
      const wallpaperPath = join(publicDir, 'wallpaper.jpg');
      const metadataPath = join(dataDir, 'wallpaper.json');

      // Ensure directories exist
      if (!existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true });
      }

      // Save the image
      await writeFile(wallpaperPath, processedImage);

      // Save metadata
      const metadata = {
        text,
        textColor,
        textSize,
        textX,
        textY,
        updatedAt: new Date().toISOString(),
      };
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    return NextResponse.json({ 
      success: true,
      message: 'Wallpaper uploaded successfully',
      url: '/api/wallpaper'
    });
  } catch (error) {
    console.error('Error processing wallpaper:', error);
    return NextResponse.json(
      { error: 'Failed to process wallpaper', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

