"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(
    null
  );
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textSize, setTextSize] = useState(48);
  const [textX, setTextX] = useState(50);
  const [textY, setTextY] = useState(50);
  // Crop frame position (0-100% of available movement range)
  const [cropOffsetX, setCropOffsetX] = useState(50);
  const [cropOffsetY, setCropOffsetY] = useState(50);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const cropFrameRef = useRef<HTMLDivElement>(null);

  // iPhone 16 resolution: 1170 x 2532
  const IPHONE_WIDTH = 1170;
  const IPHONE_HEIGHT = 2532;
  const TARGET_ASPECT = IPHONE_WIDTH / IPHONE_HEIGHT;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImage(dataUrl);

        // Pre-load the image to get dimensions
        const img = new Image();
        img.onload = () => {
          setImageElement(img);
          // Reset crop position
          setCropOffsetX(50);
          setCropOffsetY(50);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate crop frame dimensions relative to the displayed image
  const getCropInfo = useCallback(() => {
    if (!imageElement) return null;

    const imgWidth = imageElement.naturalWidth;
    const imgHeight = imageElement.naturalHeight;
    const imgAspect = imgWidth / imgHeight;

    // Calculate the crop frame size in image pixels
    let cropWidth: number;
    let cropHeight: number;

    if (imgAspect > TARGET_ASPECT) {
      // Image is wider - crop frame height = full image height
      cropHeight = imgHeight;
      cropWidth = cropHeight * TARGET_ASPECT;
    } else {
      // Image is taller - crop frame width = full image width
      cropWidth = imgWidth;
      cropHeight = cropWidth / TARGET_ASPECT;
    }

    // Calculate max offset (how much the crop can move)
    const maxOffsetX = imgWidth - cropWidth;
    const maxOffsetY = imgHeight - cropHeight;

    // Calculate actual crop position based on slider values
    const cropX = (cropOffsetX / 100) * maxOffsetX;
    const cropY = (cropOffsetY / 100) * maxOffsetY;

    return {
      cropWidth,
      cropHeight,
      cropX,
      cropY,
      maxOffsetX,
      maxOffsetY,
      imgWidth,
      imgHeight,
      canMoveX: maxOffsetX > 0,
      canMoveY: maxOffsetY > 0,
    };
  }, [imageElement, cropOffsetX, cropOffsetY, TARGET_ASPECT]);

  // Draw the final cropped image to canvas
  const drawToCanvas = useCallback(() => {
    if (!canvasRef.current || !imageElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cropInfo = getCropInfo();
    if (!cropInfo) return;

    // Clear canvas
    ctx.clearRect(0, 0, IPHONE_WIDTH, IPHONE_HEIGHT);

    // Draw the cropped portion of the image
    ctx.drawImage(
      imageElement,
      cropInfo.cropX,
      cropInfo.cropY,
      cropInfo.cropWidth,
      cropInfo.cropHeight,
      0,
      0,
      IPHONE_WIDTH,
      IPHONE_HEIGHT
    );

    // Draw text if provided
    if (text) {
      ctx.fillStyle = textColor;
      ctx.font = `bold ${textSize}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Add text shadow for better visibility
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.fillText(
        text,
        (textX / 100) * IPHONE_WIDTH,
        (textY / 100) * IPHONE_HEIGHT
      );

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }, [imageElement, text, textColor, textSize, textX, textY, getCropInfo]);

  const handleUpload = async () => {
    if (!canvasRef.current) return;

    // Make sure canvas is up to date
    drawToCanvas();

    setIsUploading(true);
    setUploadStatus(null);

    try {
      canvasRef.current.toBlob(
        async (blob) => {
          if (!blob) {
            setUploadStatus("Error: Could not create image");
            setIsUploading(false);
            return;
          }

          const formData = new FormData();
          formData.append("image", blob, "wallpaper.jpg");

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

  // Update canvas when dependencies change
  useEffect(() => {
    if (imageElement) {
      drawToCanvas();
    }
  }, [drawToCanvas, imageElement]);

  const cropInfo = getCropInfo();

  // Handle drag on the preview image
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropInfo) return;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !previewContainerRef.current || !cropInfo) return;

      const container = previewContainerRef.current;
      const rect = container.getBoundingClientRect();

      // Get mouse position relative to container
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Convert to percentage
      if (cropInfo.canMoveX) {
        const newX = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setCropOffsetX(newX);
      }
      if (cropInfo.canMoveY) {
        const newY = Math.max(0, Math.min(100, (y / rect.height) * 100));
        setCropOffsetY(newY);
      }
    },
    [isDragging, cropInfo]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Remote Wallpaper Creator
        </h1>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left: Image with crop overlay */}
          <div className="xl:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Select Crop Area</h2>

            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {image && imageElement && cropInfo && (
              <>
                <div
                  ref={previewContainerRef}
                  className="relative inline-block cursor-move select-none"
                  onMouseDown={handleMouseDown}
                  style={{ maxWidth: "100%" }}
                >
                  {/* Original image */}
                  <img
                    src={image}
                    alt="Original"
                    className="max-w-full h-auto"
                    style={{ maxHeight: "70vh" }}
                    draggable={false}
                  />

                  {/* Dark overlay for non-cropped areas */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "rgba(0, 0, 0, 0.5)",
                      clipPath: `polygon(
                        0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                        ${(cropInfo.cropX / cropInfo.imgWidth) * 100}% ${
                        (cropInfo.cropY / cropInfo.imgHeight) * 100
                      }%,
                        ${(cropInfo.cropX / cropInfo.imgWidth) * 100}% ${
                        ((cropInfo.cropY + cropInfo.cropHeight) /
                          cropInfo.imgHeight) *
                        100
                      }%,
                        ${
                          ((cropInfo.cropX + cropInfo.cropWidth) /
                            cropInfo.imgWidth) *
                          100
                        }% ${
                        ((cropInfo.cropY + cropInfo.cropHeight) /
                          cropInfo.imgHeight) *
                        100
                      }%,
                        ${
                          ((cropInfo.cropX + cropInfo.cropWidth) /
                            cropInfo.imgWidth) *
                          100
                        }% ${(cropInfo.cropY / cropInfo.imgHeight) * 100}%,
                        ${(cropInfo.cropX / cropInfo.imgWidth) * 100}% ${
                        (cropInfo.cropY / cropInfo.imgHeight) * 100
                      }%
                      )`,
                    }}
                  />

                  {/* Crop frame border */}
                  <div
                    ref={cropFrameRef}
                    className="absolute border-2 border-white pointer-events-none"
                    style={{
                      left: `${(cropInfo.cropX / cropInfo.imgWidth) * 100}%`,
                      top: `${(cropInfo.cropY / cropInfo.imgHeight) * 100}%`,
                      width: `${
                        (cropInfo.cropWidth / cropInfo.imgWidth) * 100
                      }%`,
                      height: `${
                        (cropInfo.cropHeight / cropInfo.imgHeight) * 100
                      }%`,
                      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    {/* Corner markers */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
                  </div>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  {cropInfo.canMoveX || cropInfo.canMoveY
                    ? "Drag the image or use the sliders below to adjust the crop position."
                    : "Image matches iPhone 16 aspect ratio perfectly!"}
                </p>

                {/* Crop position sliders */}
                <div className="mt-4 space-y-4">
                  {cropInfo.canMoveX && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horizontal Position
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Left</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={cropOffsetX}
                          onChange={(e) =>
                            setCropOffsetX(Number(e.target.value))
                          }
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500">Right</span>
                      </div>
                    </div>
                  )}

                  {cropInfo.canMoveY && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vertical Position
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Top</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={cropOffsetY}
                          onChange={(e) =>
                            setCropOffsetY(Number(e.target.value))
                          }
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500">Bottom</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {!image && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <p className="text-gray-500">Upload an image to get started</p>
              </div>
            )}
          </div>

          {/* Right: Preview & Controls */}
          <div className="space-y-6">
            {/* Final Preview */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Final Preview</h2>
              <div className="border-4 border-gray-800 rounded-[1.5rem] overflow-hidden bg-black">
                <canvas
                  ref={canvasRef}
                  width={IPHONE_WIDTH}
                  height={IPHONE_HEIGHT}
                  className="w-full h-auto"
                  style={{ maxHeight: "400px", objectFit: "contain" }}
                />
              </div>
            </div>

            {/* Text Controls */}
            {image && (
              <>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold mb-4">Add Text</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text
                      </label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter text to overlay"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Color
                        </label>
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Size: {textSize}px
                        </label>
                        <input
                          type="range"
                          min="20"
                          max="200"
                          value={textSize}
                          onChange={(e) => setTextSize(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Position X: {textX}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={textX}
                        onChange={(e) => setTextX(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Position Y: {textY}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={textY}
                        onChange={(e) => setTextY(Number(e.target.value))}
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

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">API Endpoint</h3>
              <p className="text-sm text-blue-800">
                Wallpaper available at:{" "}
                <code className="bg-blue-100 px-2 py-1 rounded">
                  /api/wallpaper
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
