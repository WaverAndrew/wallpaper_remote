import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { list } from "@vercel/blob";

// Use Vercel Blob Storage in production, file system in development
const USE_BLOB_STORAGE =
  process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL;

const PLACEHOLDER_SVG =
  '<svg width="1170" height="2532" xmlns="http://www.w3.org/2000/svg"><rect width="1170" height="2532" fill="#f0f0f0"/><text x="585" y="1266" font-family="Arial" font-size="48" fill="#999" text-anchor="middle" dominant-baseline="middle">No wallpaper set</text></svg>';

export async function GET() {
  try {
    let imageData: Uint8Array;

    if (USE_BLOB_STORAGE) {
      // Fetch from Vercel Blob Storage
      try {
        // List blobs to find wallpaper.jpg
        const { blobs } = await list({ prefix: "wallpaper.jpg" });
        const wallpaperBlob = blobs.find((blob) => blob.pathname === "wallpaper.jpg");

        if (!wallpaperBlob) {
          // If blob doesn't exist, return placeholder
          return new NextResponse(PLACEHOLDER_SVG, {
            status: 200,
            headers: {
              "Content-Type": "image/svg+xml",
              "Cache-Control": "no-cache",
            },
          });
        }

        // Fetch the blob URL
        const response = await fetch(wallpaperBlob.url);
        if (!response.ok) {
          throw new Error("Failed to fetch blob");
        }
        const arrayBuffer = await response.arrayBuffer();
        imageData = new Uint8Array(arrayBuffer);
      } catch (error) {
        console.error("Error fetching from blob storage:", error);
        // If blob doesn't exist or error, return placeholder
        return new NextResponse(PLACEHOLDER_SVG, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-cache",
          },
        });
      }
    } else {
      // Use file system for local development
      const wallpaperPath = join(process.cwd(), "public", "wallpaper.jpg");

      // Check if wallpaper exists
      if (!existsSync(wallpaperPath)) {
        // Return a default placeholder image
        return new NextResponse(PLACEHOLDER_SVG, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-cache",
          },
        });
      }

      // Read the wallpaper file and convert to Uint8Array
      const fileBuffer = await readFile(wallpaperPath);
      imageData = Uint8Array.from(fileBuffer);
    }

    // Return the image with appropriate headers
    return new NextResponse(imageData, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error serving wallpaper:", error);
    return NextResponse.json(
      { error: "Failed to serve wallpaper" },
      { status: 500 }
    );
  }
}

