"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textSize, setTextSize] = useState(48);
  const [textX, setTextX] = useState(50);
  const [textY, setTextY] = useState(50);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  // Crop state
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // iPhone 16 resolution: 1170 x 2532
  const IPHONE_WIDTH = 1170;
  const IPHONE_HEIGHT = 2532;
  const ASPECT_RATIO = IPHONE_WIDTH / IPHONE_HEIGHT;

  // Load current wallpaper on mount
  useEffect(() => {
    const loadCurrentWallpaper = async () => {
      try {
        const response = await fetch("/api/wallpaper", { cache: "no-store" });
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          // Only load if it's an actual image, not the placeholder SVG
          if (contentType?.includes("image/jpeg")) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setOriginalImage(url);
          }
        }
      } catch (error) {
        console.error("Failed to load current wallpaper:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentWallpaper();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
          
          // Calculate initial scale to cover the crop area
          const scaleX = IPHONE_WIDTH / img.naturalWidth;
          const scaleY = IPHONE_HEIGHT / img.naturalHeight;
          const scale = Math.max(scaleX, scaleY);
          setImageScale(scale);
          
          // Center the image
          const scaledWidth = img.naturalWidth * scale;
          const scaledHeight = img.naturalHeight * scale;
          setImageOffset({
            x: (IPHONE_WIDTH - scaledWidth) / 2,
            y: (IPHONE_HEIGHT - scaledHeight) / 2,
          });
        };
        img.src = event.target?.result as string;
        setOriginalImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const drawPreview = useCallback(() => {
    if (!canvasRef.current || !originalImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, IPHONE_WIDTH, IPHONE_HEIGHT);

      // Draw image with current offset and scale
      const scaledWidth = img.naturalWidth * imageScale;
      const scaledHeight = img.naturalHeight * imageScale;
      
      ctx.drawImage(
        img,
        imageOffset.x,
        imageOffset.y,
        scaledWidth,
        scaledHeight
      );

      // Draw text if provided
      if (text) {
        ctx.fillStyle = textColor;
        ctx.font = `bold ${textSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          text,
          (textX / 100) * IPHONE_WIDTH,
          (textY / 100) * IPHONE_HEIGHT
        );
      }
    };
    img.src = originalImage;
  }, [originalImage, text, textColor, textSize, textX, textY, imageOffset, imageScale]);

  // Mouse/touch handlers for dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!originalImage) return;
    setIsDragging(true);
    const rect = cropContainerRef.current?.getBoundingClientRect();
    if (rect) {
      // Scale pointer position to canvas coordinates
      const scaleFactorX = IPHONE_WIDTH / rect.width;
      const scaleFactorY = IPHONE_HEIGHT / rect.height;
      setDragStart({
        x: e.clientX * scaleFactorX - imageOffset.x,
        y: e.clientY * scaleFactorY - imageOffset.y,
      });
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !originalImage) return;
    const rect = cropContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const scaleFactorX = IPHONE_WIDTH / rect.width;
      const scaleFactorY = IPHONE_HEIGHT / rect.height;
      
      const scaledWidth = naturalSize.width * imageScale;
      const scaledHeight = naturalSize.height * imageScale;
      
      // Calculate new offset
      let newX = e.clientX * scaleFactorX - dragStart.x;
      let newY = e.clientY * scaleFactorY - dragStart.y;
      
      // Constrain to keep image covering the frame
      const maxX = 0;
      const minX = IPHONE_WIDTH - scaledWidth;
      const maxY = 0;
      const minY = IPHONE_HEIGHT - scaledHeight;
      
      newX = Math.min(maxX, Math.max(minX, newX));
      newY = Math.min(maxY, Math.max(minY, newY));
      
      setImageOffset({ x: newX, y: newY });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    const newScale = Math.max(
      // Minimum scale to cover the frame
      Math.max(IPHONE_WIDTH / naturalSize.width, IPHONE_HEIGHT / naturalSize.height),
      imageScale + delta
    );
    
    // Adjust offset to zoom towards center
    const scaleDiff = newScale - imageScale;
    const newOffsetX = imageOffset.x - (naturalSize.width * scaleDiff) / 2;
    const newOffsetY = imageOffset.y - (naturalSize.height * scaleDiff) / 2;
    
    // Constrain offsets
    const scaledWidth = naturalSize.width * newScale;
    const scaledHeight = naturalSize.height * newScale;
    const constrainedX = Math.min(0, Math.max(IPHONE_WIDTH - scaledWidth, newOffsetX));
    const constrainedY = Math.min(0, Math.max(IPHONE_HEIGHT - scaledHeight, newOffsetY));
    
    setImageScale(newScale);
    setImageOffset({ x: constrainedX, y: constrainedY });
  };

  const handleUpload = async () => {
    if (!canvasRef.current) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      // Convert canvas to blob
      canvasRef.current.toBlob(
        async (blob) => {
          if (!blob) {
            setUploadStatus("Error: Could not create image");
            setIsUploading(false);
            return;
          }

          const formData = new FormData();
          formData.append("image", blob, "wallpaper.jpg");
          formData.append("text", text);
          formData.append("textColor", textColor);
          formData.append("textSize", textSize.toString());
          formData.append("textX", textX.toString());
          formData.append("textY", textY.toString());

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          
          if (response.ok) {
            setUploadStatus("✅ Wallpaper uploaded successfully!");
          } else {
            setUploadStatus(`❌ Error: ${data.error || data.details || "Upload failed"}`);
          }
          setIsUploading(false);
        },
        "image/jpeg",
        0.95
      );
    } catch (error) {
      setUploadStatus(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIsUploading(false);
    }
  };

  // Redraw when image or text properties change
  useEffect(() => {
    if (originalImage) {
      const timeoutId = setTimeout(drawPreview, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [drawPreview, originalImage]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">
          Remote Wallpaper Creator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side: Controls */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <h2 className="text-xl font-semibold mb-4 text-white">Upload Photo</h2>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
              />
            </div>

            {originalImage && (
              <>
                {/* Zoom Controls */}
                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
                  <h2 className="text-xl font-semibold mb-4 text-white">
                    Crop & Position
                  </h2>
                  <p className="text-sm text-gray-300 mb-4">
                    Drag the preview to reposition. Use zoom to adjust.
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleZoom(-0.1)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500 font-bold text-xl"
                    >
                      −
                    </button>
                    <span className="text-white">Zoom: {Math.round(imageScale * 100)}%</span>
                    <button
                      onClick={() => handleZoom(0.1)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500 font-bold text-xl"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
                  <h2 className="text-xl font-semibold mb-4 text-white">
                    Text Customization
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Text
                      </label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter text to overlay"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-full h-10 border border-white/20 rounded-md cursor-pointer bg-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Text Size: {textSize}px
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="200"
                        value={textSize}
                        onChange={(e) => setTextSize(Number(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Horizontal Position: {textX}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={textX}
                        onChange={(e) => setTextX(Number(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Vertical Position: {textY}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={textY}
                        onChange={(e) => setTextY(Number(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full bg-purple-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUploading ? "Uploading..." : "Upload Wallpaper"}
                  </button>
                  {uploadStatus && (
                    <p
                      className={`mt-4 text-center ${
                        uploadStatus.includes("✅")
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {uploadStatus}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right side: Preview */}
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
            <h2 className="text-xl font-semibold mb-4 text-white">Preview (iPhone 16)</h2>
            <div 
              ref={cropContainerRef}
              className="border-4 border-gray-600 rounded-[2rem] overflow-hidden bg-black relative"
              style={{ 
                aspectRatio: `${IPHONE_WIDTH} / ${IPHONE_HEIGHT}`,
                cursor: originalImage ? (isDragging ? "grabbing" : "grab") : "default",
                touchAction: "none",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <canvas
                ref={canvasRef}
                width={IPHONE_WIDTH}
                height={IPHONE_HEIGHT}
                className="w-full h-full object-contain"
                style={{ imageRendering: "auto" }}
              />
            </div>
            {!originalImage && (
              <p className="text-center text-gray-400 mt-4">
                Upload an image to see preview
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
          <h3 className="font-semibold text-white mb-2">API Endpoint</h3>
          <p className="text-sm text-gray-300">
            Your wallpaper will be available at:{" "}
            <code className="bg-purple-900/50 px-2 py-1 rounded text-purple-300">
              /api/wallpaper
            </code>
          </p>
        </div>
      </div>
    </main>
  );
}
