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

### Step 1: Push to GitHub

1. Push your code to a GitHub repository

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Click "Deploy" (don't worry about configuration yet)

### Step 3: Set up Vercel Blob Storage

1. In your Vercel dashboard, go to your project
2. Click on the **"Storage"** tab (in the top navigation)
3. Click **"Create Database"** or **"Add Storage"**
4. Select **"Blob"** from the options
5. Give it a name (e.g., "wallpaper-storage") and click **"Create"**
6. Once created, click on the Blob store
7. Go to the **"Settings"** tab
8. Find **"Environment Variables"** section
9. Copy the **`BLOB_READ_WRITE_TOKEN`** value

### Step 4: Add Environment Variable

1. Go back to your project's main page in Vercel
2. Click on **"Settings"** tab
3. Click on **"Environment Variables"** in the sidebar
4. Add a new environment variable:
   - **Name:** `BLOB_READ_WRITE_TOKEN`
   - **Value:** (paste the token you copied)
   - **Environment:** Select all (Production, Preview, Development)
5. Click **"Save"**

### Step 5: Redeploy

1. Go to the **"Deployments"** tab
2. Click the three dots (⋯) on your latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger a new deployment

**Note:** The app automatically uses Vercel Blob Storage in production (when `BLOB_READ_WRITE_TOKEN` is set). For local development, it uses the file system, so you don't need the token locally.

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
