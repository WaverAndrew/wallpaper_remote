"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textSize, setTextSize] = useState(48);
  const [textX, setTextX] = useState(50);
  const [textY, setTextY] = useState(50);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // iPhone 16 resolution: 1170 x 2532
  const IPHONE_WIDTH = 1170;
  const IPHONE_HEIGHT = 2532;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        drawPreview();
      };
      reader.readAsDataURL(file);
    }
  };

  const drawPreview = useCallback(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, IPHONE_WIDTH, IPHONE_HEIGHT);

      // Draw image, covering the entire canvas (crop to fit)
      ctx.drawImage(img, 0, 0, IPHONE_WIDTH, IPHONE_HEIGHT);

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
    img.src = image;
  }, [image, text, textColor, textSize, textX, textY]);

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

          if (response.ok) {
            setUploadStatus("✅ Wallpaper uploaded successfully!");
          } else {
            const error = await response.text();
            setUploadStatus(`❌ Error: ${error}`);
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
    if (image) {
      const timeoutId = setTimeout(drawPreview, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [drawPreview, image]);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Remote Wallpaper Creator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side: Controls */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Upload Photo</h2>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {image && (
              <>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold mb-4">
                    Text Customization
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text
                      </label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => {
                          setText(e.target.value);
                        }}
                        placeholder="Enter text to overlay"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => {
                          setTextColor(e.target.value);
                        }}
                        className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Size: {textSize}px
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="200"
                        value={textSize}
                        onChange={(e) => {
                          setTextSize(Number(e.target.value));
                        }}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horizontal Position: {textX}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={textX}
                        onChange={(e) => {
                          setTextX(Number(e.target.value));
                        }}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vertical Position: {textY}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={textY}
                        onChange={(e) => {
                          setTextY(Number(e.target.value));
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUploading ? "Uploading..." : "Upload Wallpaper"}
                  </button>
                  {uploadStatus && (
                    <p
                      className={`mt-4 text-center ${
                        uploadStatus.includes("✅")
                          ? "text-green-600"
                          : "text-red-600"
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
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Preview (iPhone 16)</h2>
            <div className="border-4 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
              <canvas
                ref={canvasRef}
                width={IPHONE_WIDTH}
                height={IPHONE_HEIGHT}
                className="w-full h-auto max-h-[600px] object-contain"
                style={{ imageRendering: "auto" }}
              />
            </div>
            {!image && (
              <p className="text-center text-gray-500 mt-4">
                Upload an image to see preview
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 p-6 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">API Endpoint</h3>
          <p className="text-sm text-blue-800">
            Your wallpaper will be available at:{" "}
            <code className="bg-blue-100 px-2 py-1 rounded">
              /api/wallpaper
            </code>
          </p>
        </div>
      </div>
    </main>
  );
}
