# Remote Wallpaper Creator

A web application that allows you to upload photos, customize them with text overlays, and serve them as iPhone 16 wallpapers via a constant API route.

## Features

- 📸 Upload photos
- ✏️ Add customizable text overlays
- 📱 Automatically resize to iPhone 16 resolution (1170 x 2532)
- 🔗 Constant API endpoint for wallpaper retrieval
- ☁️ Deployable on Vercel

## Getting Started

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. Upload a photo using the file input
2. Customize the text overlay:
   - Enter your text
   - Choose text color
   - Adjust text size
   - Position the text (horizontal and vertical percentages)
3. Click "Upload Wallpaper" to save it
4. The wallpaper will be available at `/api/wallpaper`

## API Endpoints

### GET `/api/wallpaper`

Returns the latest wallpaper image in iPhone 16 resolution (1170 x 2532).

**Response:** JPEG image

### POST `/api/upload`

Uploads and processes a new wallpaper.

**Body:** FormData with:

- `image`: Image file
- `text`: Text to overlay (optional)
- `textColor`: Text color in hex format (optional, default: #FFFFFF)
- `textSize`: Text size in pixels (optional, default: 48)
- `textX`: Horizontal position as percentage (optional, default: 50)
- `textY`: Vertical position as percentage (optional, default: 50)

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Set up Vercel Blob Storage:
   - Go to your Vercel project settings
   - Navigate to "Storage" → "Blob"
   - Create a new Blob store (or use existing)
   - Copy the `BLOB_READ_WRITE_TOKEN` from the store settings
   - Add it as an environment variable in your Vercel project
4. Deploy!

**Note:** The app automatically uses Vercel Blob Storage in production (when `BLOB_READ_WRITE_TOKEN` is set or when running on Vercel). For local development, it uses the file system.

## Apple Shortcut Setup

For your girlfriend's iPhone shortcut:

1. Open Shortcuts app
2. Create a new shortcut
3. Add actions:
   - "Get Contents of URL" → Your Vercel URL + `/api/wallpaper`
   - "Set Wallpaper" → Use the image from the previous action
4. Save and run the shortcut

The shortcut can be set to run automatically or manually.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts      # Upload and process wallpaper
│   │   └── wallpaper/
│   │       └── route.ts      # Serve wallpaper
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main UI
├── public/
│   └── wallpaper.jpg         # Stored wallpaper (gitignored)
├── data/
│   └── wallpaper.json        # Metadata (gitignored)
└── package.json
```

## Technologies

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Sharp (image processing)
- Canvas API (client-side preview)
