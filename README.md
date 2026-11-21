# CAT CPN Downloads

A modern download-library website built for CAT CPN. The public storefront uses **HTML, CSS and vanilla JavaScript**. The private management dashboard uses **React**. The API is powered by **Node.js + Express**, and download information is stored in **MongoDB** through Mongoose.

> Upload and distribute only files you created, own, or have permission to share. This project does not fetch or copy files from third-party websites.

## What's included

- Responsive CAT CPN storefront with a search bar, category filters, featured cards, sorting and pagination.
- File downloads served by the backend, with download counts saved in MongoDB.
- React admin panel with sign-in, upload form, library overview, storage/download statistics and delete controls.
- Private admin API protected by JWT, rate limits and server-only credentials.
- Upload validation and a configurable file-size limit. Executable scripts such as `.exe`, `.bat`, `.sh` and `.js` are not accepted.
- Docker Compose configuration for a local MongoDB database, plus support for MongoDB Atlas.

## Requirements

- Node.js 18.18 or newer (Node.js 20 LTS recommended).
- npm.
- MongoDB running locally, or a MongoDB Atlas connection string.
- Docker Desktop / Docker Engine only if you want the included local MongoDB container.

## Install and run locally

1. Open this project folder in a terminal.
2. Install the backend and admin dashboard packages:

   ```bash
   npm run install:all
   ```

3. Create your environment file:

   **macOS / Linux / Termux**
   ```bash
   cp .env.example .env
   ```

   **Windows PowerShell**
   ```powershell
   Copy-Item .env.example .env
   ```

4. Edit `.env`. Set a unique admin password (at least 12 characters) and a random `JWT_SECRET` (at least 32 characters). These credentials belong on the server only. Do not put them in HTML, JavaScript, GitHub, or screenshots.

5. Start MongoDB using the included Docker configuration:

   ```bash
   npm run db:up
   ```

   The database is saved in a Docker volume, so it remains available when the container restarts.

6. Start the website and React admin dashboard:

   ```bash
   npm run dev
   ```

   Open:
   - Public website: `http://localhost:5000`
   - Admin dashboard: `http://localhost:5000/admin` (during development this opens the React dev server)
   - API health: `http://localhost:5000/api/health`

7. Sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD` from your `.env` file. Upload a file from **Upload a file**. It will then appear in the public library.

## Use MongoDB Atlas instead

If you do not have Docker or you are developing from a phone, create a MongoDB Atlas database and copy its connection string. Replace `MONGODB_URI` in `.env` with the Atlas URI, including your database name. Make sure the Atlas network-access and database-user settings permit your server to connect. Keep the URI private.

Example format (replace the placeholders):

```text
MONGODB_URI=mongodb+srv://DB_USER:DB_PASSWORD@YOUR_CLUSTER.mongodb.net/cat_cpn_downloads
```

When using Atlas, you do not need to run `npm run db:up`.

## Build for production

Build the React dashboard, then start the Express server:

```bash
npm run build:admin
npm start
```

Set `NODE_ENV=production`, `MONGODB_URI`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET` and `PUBLIC_URL` in your hosting provider's environment settings. Deploy the whole project to a Node.js-capable host with persistent storage for `server/storage/uploads`. The host must allow outbound database connections to MongoDB. Do not commit `.env` or uploaded files to Git.

For production, use HTTPS. Back up both the MongoDB database and the `server/storage/uploads` directory. If the server filesystem is temporary/ephemeral, use persistent disk storage or move file storage to a private object-storage service before launch.

## Supported upload formats

`.apk`, `.pdf`, `.zip`, `.rar`, `.7z`, `.txt`, `.csv`, `.doc`, `.docx`, `.ppt`, `.pptx`, `.xls`, `.xlsx`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.mp3`, `.wav`, `.mp4`, `.mov`.

The maximum file size defaults to 100 MB and can be changed with `MAX_UPLOAD_MB` in `.env`.

## Project structure

```text
cat-cpn-downloads/
├── admin/                 # React + Vite admin dashboard
│   └── src/
├── public/                # Vanilla HTML, CSS and JavaScript storefront
├── server/
│   ├── middleware/        # JWT admin authentication
│   ├── models/            # Mongoose models
│   ├── routes/            # Auth and download API routes
│   ├── storage/uploads/   # Uploaded files (not committed to Git)
│   └── utils/             # Upload validation and storage setup
├── .env.example
├── docker-compose.yml
└── package.json
```

## Important security notes

- Change the sample admin password and JWT secret before running the site outside your own device.
- Use a strong, unique admin password and never share the admin login.
- Only publish legal, safe files. Do not upload copyrighted apps, games, films, music or documents unless you have permission to distribute them.
- Keep Node.js, dependencies and the hosting environment updated.
- This starter stores uploads on the server disk. Production hosting must provide persistent disk storage or an object-storage integration.
- The storefront does not automatically discover or download files from other websites. Admins publish the files they are allowed to share.

## Main commands

```bash
npm run install:all  # Install root + React dashboard packages
npm run db:up        # Start local MongoDB using Docker
npm run db:down      # Stop the MongoDB container
npm run dev           # Start API + React dashboard development servers
npm run build:admin  # Build the React dashboard for production
npm start             # Start production server
npm run check         # Check server JavaScript syntax
```
