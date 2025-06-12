# Firebase Storage CORS Configuration Instructions

This document provides instructions for manually configuring CORS (Cross-Origin Resource Sharing) for the Firebase Storage bucket to allow file uploads from the GitHub Pages deployment.

## Problem
File uploads fail with CORS errors because the Firebase Storage bucket doesn't allow requests from the GitHub Pages origin `https://danik911.github.io`.

## Solution: Manual CORS Configuration

### Option 1: Using Google Cloud Console (Recommended)

1. **Go to Google Cloud Console:**
   - Visit [https://console.cloud.google.com](https://console.cloud.google.com)
   - Log in with your Google account (`porvipop1@gmail.com`)

2. **Navigate to Cloud Storage:**
   - In the left sidebar, go to **Storage > Browser**
   - You should see the bucket: `gantt-chart-ea44e.firebasestorage.app`

3. **Configure CORS:**
   - Click on the bucket name
   - Go to the **Permissions** tab
   - Click **Edit CORS configuration** (if available) or look for CORS settings
   - Add the following CORS configuration:

```json
[
  {
    "origin": ["https://danik911.github.io"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization", "X-Requested-With"],
    "maxAgeSeconds": 3600
  }
]
```

### Option 2: Using Command Line (gsutil)

If you have Google Cloud SDK installed and authenticated:

1. **Install Google Cloud SDK:**
   - Download from [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
   - Follow installation instructions for Windows

2. **Authenticate:**
   ```bash
   gcloud auth login
   gcloud config set project gantt-chart-ea44e
   ```

3. **Apply CORS configuration:**
   ```bash
   gsutil cors set cors.json gs://gantt-chart-ea44e.firebasestorage.app
   ```

   (The `cors.json` file is already created in the project root)

### Option 3: Using the CORS Configuration Script

If you have Google Cloud SDK installed and authenticated:

```bash
node configure-cors.js
```

## Verification

After configuring CORS:

1. **Deploy the changes to GitHub Pages:**
   ```bash
   git add .
   git commit -m "Fix Firebase Storage bucket format and CORS configuration"
   git push origin main
   ```

2. **Test file upload:**
   - Go to [https://danik911.github.io/thesis-gantt-chart/#/file-upload](https://danik911.github.io/thesis-gantt-chart/#/file-upload)
   - Try uploading a file
   - Check browser console for any remaining errors

## Important Notes

- The bucket name format has changed from `<projectId>.appspot.com` to `<projectId>.firebasestorage.app` for projects created after October 30, 2024
- Make sure to clear browser cache after CORS configuration changes
- The CORS configuration allows requests only from `https://danik911.github.io` for security reasons

## Troubleshooting

If uploads still fail:
1. Check browser console for specific error messages
2. Verify the bucket name is correct: `gantt-chart-ea44e.firebasestorage.app`
3. Ensure Firebase Storage rules allow authenticated uploads (already configured)
4. Try uploading in an incognito/private browser window to avoid cache issues 