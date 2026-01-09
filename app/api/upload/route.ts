import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { put } from "@vercel/blob";

// Use Vercel Blob Storage in production, file system in development
const USE_BLOB_STORAGE =
  process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // The image from the canvas already has text rendered on it
    // and is already at the correct resolution, so we just save it directly
    const arrayBuffer = await imageFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    if (USE_BLOB_STORAGE) {
      // Use Vercel Blob Storage for production
      const imageBlob = new Blob([uint8Array], { type: "image/jpeg" });
      const blob = await put("wallpaper.jpg", imageBlob, {
        access: "public",
        contentType: "image/jpeg",
      });

      // Store metadata
      const metadata = {
        updatedAt: new Date().toISOString(),
        imageUrl: blob.url,
      };
      await put("wallpaper.json", JSON.stringify(metadata, null, 2), {
        access: "public",
        contentType: "application/json",
      });
    } else {
      // Use file system for local development
      const publicDir = join(process.cwd(), "public");
      const dataDir = join(process.cwd(), "data");
      const wallpaperPath = join(publicDir, "wallpaper.jpg");
      const metadataPath = join(dataDir, "wallpaper.json");

      // Ensure directories exist
      if (!existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true });
      }

      // Save the image
      await writeFile(wallpaperPath, uint8Array);

      // Save metadata
      const metadata = {
        updatedAt: new Date().toISOString(),
      };
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    return NextResponse.json({
      success: true,
      message: "Wallpaper uploaded successfully",
      url: "/api/wallpaper",
    });
  } catch (error) {
    console.error("Error processing wallpaper:", error);
    return NextResponse.json(
      {
        error: "Failed to process wallpaper",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
