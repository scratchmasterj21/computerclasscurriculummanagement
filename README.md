# Computer Class Curriculum Management System

A modern curriculum management system built with React, TypeScript, Vite, Tailwind CSS, and Firebase.

## Features

- 📊 **Table View**: View curriculum items in a clean, sortable table
- ✏️ **CRUD Operations**: Create, read, update, and delete curriculum items
- 📦 **Bulk Operations**: Bulk delete, import, and export functionality
- 🔄 **Real-time Sync**: Automatic updates using Firebase Realtime Database
- 🔐 **Authentication**: Secure login with Google Sign-In via Firebase Auth
- 📅 **Year Management**: Switch between different academic years
- 🎯 **Structured Topics**: Add topics with type, duration, and description
- 📎 **Resources**: Attach links, documents, videos, and other resources
- 📥 **Import/Export**: Import from CSV/JSON or export to CSV/JSON

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Firebase** for authentication and real-time database
- **React Hook Form** with Zod for form validation
- **PapaParse** for CSV parsing

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. The Firebase configuration is already set up in `src/config/firebase.ts`. Make sure your Firebase project has:
   - Authentication enabled with Google Sign-In provider
   - Realtime Database enabled
   - Security rules configured (see below)
   
   **To enable Google Sign-In in Firebase Console:**
   - Go to Authentication > Sign-in method
   - Enable Google provider
   - Add your authorized domains if needed

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Firebase Security Rules

Add these rules to your Firebase Realtime Database:

```json
{
  "rules": {
    "curriculum": {
      "$year": {
        ".read": "auth != null",
        ".write": "auth != null",
        "$itemId": {
          ".validate": "newData.hasChildren(['title', 'week', 'topics', 'resources']) && newData.child('week').val() >= 1 && newData.child('week').val() <= 52"
        }
      }
    }
  }
}
```

## Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── curriculum/    # Curriculum-related components
│   ├── layout/        # Layout components
│   └── ui/            # shadcn/ui components
├── config/
│   └── firebase.ts    # Firebase configuration
├── context/
│   └── AuthContext.tsx # Authentication context
├── services/
│   ├── curriculumService.ts    # Firebase operations
│   └── importExportService.ts  # Import/export utilities
├── types/
│   └── curriculum.ts  # TypeScript types
└── pages/
    └── Dashboard.tsx   # Main dashboard page
```

## Usage

### Adding Curriculum Items

1. Click "Add Item" button
2. Fill in the form:
   - Title (required)
   - Week (1-52, required)
   - Description (optional)
   - Topics (at least one required)
   - Resources (optional)
3. Click "Create"

### Bulk Operations

1. Select items using checkboxes
2. Use the bulk actions toolbar to:
   - Delete multiple items
   - Export selected items to CSV
   - Import items from CSV/JSON

### Import/Export

- **Export**: Select items and click "Export" to download as CSV
- **Import**: Click "Import" to upload CSV or paste JSON data

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to Netlify

The project is configured for easy deployment to Netlify.

### Option 1: Deploy via Netlify UI

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [Netlify](https://www.netlify.com/) and sign in
3. Click "Add new site" > "Import an existing project"
4. Connect your repository
5. Netlify will auto-detect the build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click "Deploy site"

### Option 2: Deploy via Netlify CLI

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Build the project:
```bash
npm run build
```

3. Deploy:
```bash
netlify deploy --prod
```

### Important: Firebase Configuration

Before deploying, make sure to:

1. **Add your Netlify domain to Firebase authorized domains:**
   - Go to Firebase Console > Authentication > Settings > Authorized domains
   - Add your Netlify domain (e.g., `your-site.netlify.app`)

2. **Update Firebase Security Rules** (if needed):
   - The rules should allow authenticated users to read/write
   - Make sure your production domain is authorized

3. **Environment Variables** (if needed):
   - If you want to use different Firebase configs for production, you can set environment variables in Netlify
   - Go to Site settings > Environment variables

### Build Configuration

The project includes:
- `netlify.toml` - Netlify configuration file
- `_redirects` - SPA routing support (copied to dist during build)

The build process automatically:
- Compiles TypeScript
- Builds the Vite project
- Copies the `_redirects` file for SPA routing

## License

MIT
