# Gemini Journal & Reflections

A secure, private personal journaling and AI reflection application powered by **Gemini 3.6 Flash**, **Cloud Firestore**, and **Firebase Authentication**.

---

## Architecture & Security Model

The system enforces strict tenant isolation:
- **Client**: React 19, Tailwind CSS, Lucide icons, Vite SPA.
- **Backend API**: Node.js Express server routing AI reflection requests to `@google/genai` with zero client-side key exposure.
- **AI Engine**: Gemini 3.6 Flash with a Resilient Model Fallback Ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`).
- **Database**: Cloud Firestore with owner-bound access rules enforcing `request.auth.uid == userId`.
- **Identity**: Firebase Authentication (Google Sign-In with popup). No plaintext passwords stored.

---

## 1. Environment & Prerequisites

### Enable Required Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com
```

### Install Firebase & Google Cloud SDK
Ensure `gcloud` and `firebase-tools` are installed and authenticated:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
npm install -g firebase-tools
firebase login
```

---

## 2. Secret Management Setup

### Create and Populate the Secret
```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Cloud Firestore)

Deploy the owner-bound security rules to ensure no cross-user document access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy the rules using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Cloud Run Deployment Flow

Build and deploy the application container to Google Cloud Run:

```bash
# Build and deploy with Secret Manager environment injection
gcloud run deploy gemini-journal-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

---

## 5. Required Campaign Labeling

Apply the mandatory challenge verification label to your Cloud Run service:

```bash
gcloud run services update gemini-journal-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Verification Walkthrough

Follow these sequential steps to verify all features:
1. **Landing & Authentication**:
   - Access the root landing page.
   - Click "Continue with Google".
   - Confirm successful Firebase Auth sign-in and redirect to the personal dashboard.
2. **First Journal Reflection**:
   - In the input area, select a reflection prompt starter or type a custom reflection.
   - Select the **Reflect & Inquire** mode and press "Send".
   - Verify that Gemini returns an empathetic, formatted reflection with constructive takeaways.
   - Confirm the status indicator transitions from **Saving...** to **Firestore Saved**.
3. **Multi-Turn Continuity**:
   - Type a follow-up answer or thought in response to Gemini's reflection question.
   - Verify that Gemini incorporates previous context from the session into its response.
4. **Automated Synthesis**:
   - Click **Synthesize Summary**.
   - Verify that Gemini generates a suggested title, executive summary, and thematic tag chips.
5. **Reflection → Action Insights**:
   - In any completed or active conversation, click **Generate Action Insights** (in the workspace or the dedicated Bento Action Card).
   - If the conversation is empty, verify the friendly advisory banner prompts the user to add reflections first.
   - Verify that Gemini generates:
     * **Core Theme**: High-level focus area
     * **Key Insight**: Deep cognitive takeaway
     * **Concrete Next Action**: One tangible real-world step
     * **Reflection Question**: An introspective follow-up inquiry
   - Verify that the Action Insights Bento Card displays the results with the Deep Indigo + Lavender palette and that the interaction document in Firestore is updated with the `actionInsights` payload without losing any previous conversation turns or tags.
6. **Session Isolation & History**:
   - Click **+ New Reflection** to start a separate thread.
   - Notice the previous reflection appears in the left sidebar with the "Action" badge.
   - Search by keyword, action theme, or tag to instantly filter entries.
7. **Cross-Tenant Isolation Test**:
   - Direct Firestore requests without matching `request.auth.uid` are rejected by security rules.
