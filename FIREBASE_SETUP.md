# Firebase setup

The Firebase integration is staged alongside the existing Supabase files. Nothing here creates a Firebase project, deploys rules, publishes the site, or deletes Supabase data/files.

## 1. Create and configure Firebase in Console

1. Use the existing Firebase project `simon-veres-portofolio`; do not create a new project. Keep its registered Firebase Web App and existing configuration.
2. Keep the existing Web App configuration in [`js/firebase-config.js`](js/firebase-config.js) for project `simon-veres-portofolio`. Web API keys in this client config are public identifiers, not Admin SDK credentials. Never add a service-account private key or other secret.
3. In **Authentication > Sign-in method**, enable **Email/Password**. Create the administrator account in **Authentication > Users**. This app does not create or store passwords itself.
4. In **Authentication > Settings > Authorized domains**, add `localhost`, `127.0.0.1`, and the deployed GitHub Pages hostname `simonveres.github.io` if not already present.
5. Create the default Cloud Firestore database. Firebase Storage is optional; portfolio images and files can be entered as URLs, so Storage and a billing upgrade are not required for CMS CRUD.
6. Review and publish [`firestore.rules`](firestore.rules) from **Firestore Database > Rules**. These rules limit public reads to published records, allow full content access only to active admins, and block client writes to `admins`.
7. In Firestore, manually create collection `admins`, then a document whose **document ID is the administrator's Firebase Auth UID**, with field `active` of type Boolean and value `true`. Do not use the email as document ID. Client code cannot create or edit admin records.
8. The current public renderer filters by `published` and sorts by `order` in the browser, so its read path does not require composite indexes.

## 2. Firestore data model

Firestore creates a collection on the first document write; empty collections do not need to be pre-created. The dashboard uses:

| Collection | Document / fields |
| --- | --- |
| `profiles` | Singleton document `main`: `name`, `title`, `description`, `location`, `email`, `phone`, `gpa`, `university`, `profileImage`, `cvUrl`, `published`, `updatedAt` |
| `experiences` | Auto ID: `position`, `company`, `location`, `startDate`, `endDate`, `description`, `published`, `order`, `updatedAt` |
| `organizations` | Auto ID: `organizationName`, `position`, `startDate`, `endDate`, `description`, `image`, `published`, `order`, `updatedAt` |
| `projects` | Auto ID: `title`, `description`, `technologies`, `projectUrl`, `githubUrl`, `image`, `published`, `order`, `updatedAt` |
| `gallery` | Auto ID: `title`, `description`, `image`, `imageUrl`, `published`, `order`, `updatedAt` |
| `publications` | Auto ID: `title`, `publisher`, `date`, `description`, `url`, `contribution`, `published`, `order`, `updatedAt` |
| `achievements` | Auto ID: `title`, `issuer`, `date`, `description`, `image`, `url`, `published`, `order`, `updatedAt` |
| `certificates` | Auto ID: `title`, `issuer`, `date`, `description`, `certificateUrl`, `image`, `published`, `order`, `updatedAt` |
| `education` | Auto ID: `institution`, `degree`, `field`, `startDate`, `endDate`, `description`, `published`, `order`, `updatedAt` |
| `skills` | Auto ID: `name`, `category`, `level`, `description`, `published`, `order`, `updatedAt` |
| `socials` | Auto ID: `platform`, `username`, `url`, `icon`, `published`, `order`, `updatedAt` |
| `contacts` | Singleton document `main`: `email`, `phone`, `whatsapp`, `address`, `linkedin`, `instagram`, `github`, `website`, `published`, `updatedAt` |
| `admins` | Document ID is Firebase Auth UID; `active: true` grants admin access |
| `users` | Document ID is Auth UID; role and account/payment/portfolio statuses are protected by Rules |
| `usernames` | Username slug document ID maps to one `ownerUid`; written atomically with the user profile |
| `settings/platform` | Public platform name, WhatsApp number, portfolio price, and currency; only admins can write |

Public portfolio reads require `published == true` and an associated user whose account is active, payment is paid, and portfolio is published. Existing legacy portfolio documents without `userId` remain compatible as public demo content when published; new user content always requires `userId`. Admin access still requires Firebase Auth and `admins/{uid}.active == true`. User queries are scoped to their Auth UID. `updatedAt` is written using Firestore `serverTimestamp()` and is not editable in forms.

## 3. Storage layout

New CMS records use image and file URL fields and do not upload to Storage. Storage is loaded lazily only for older records that already contain `imagePath` or `filePath`; Storage errors do not prevent Firestore CMS access or replace the static fallback. Existing [`storage.rules`](storage.rules) remain available if Storage is enabled later.

## 4. Import existing static content

The current HTML and local assets remain untouched as the public fallback. No importer runs automatically; add Firestore records from the dashboard when ready. If no published Firebase record exists, the matching static HTML remains visible. Existing Firestore documents are not overwritten by any automatic migration.

The source assets remain in `assets/` and are not deleted or uploaded by dashboard CRUD.

## 5. Test locally

1. Fill in the Firebase Web App config, then open the repository with VS Code Live Server (serve from the repository root).
2. Visit `http://127.0.0.1:5500/admin/index.html`, enter the administrator email/password in the form, and verify redirect to `admin/dashboard.html`.
3. Use the sidebar to select a collection, add a draft with URL fields, edit it, change its order where available, publish it, then delete a disposable test record after confirming the prompt. Verify changes in Firestore Console and confirm a draft is not shown publicly.
4. Use the Dashboard overview to check collection counts. Open the matching public page and verify published data renders; when no published records remain, its static HTML fallback should remain visible.
5. Sign out; `admin/dashboard.html` should redirect to login. Test public pages while signed out: only published documents should render. If Firebase is unconfigured, unavailable, or has no published records, existing HTML remains visible.
6. Repeat on the GitHub Pages domain after source changes are committed and pushed. GitHub stores source code; Firebase stores auth, content, and uploaded files.

## 6. Migration safety

The old files [`js/supabase-config.js`](js/supabase-config.js), [`js/admin.js`](js/admin.js), [`js/portfolio-content.js`](js/portfolio-content.js), [`database/schema.sql`](database/schema.sql), and [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) are deliberately retained and are not loaded by the Firebase login/dashboard/public data path. No Firebase project, UID, or config changes are needed for this CMS update. Verify login, CRUD, and public rendering against the configured Firebase project before relying on Firestore-only content.

## 7. Multi-user rollout

1. Review and publish the updated [`firestore.rules`](firestore.rules) before allowing registration. The browser cannot safely enforce ownership or payment approval by itself.
2. Create the indexes from [`firestore.indexes.json`](firestore.indexes.json) in Firestore **Indexes > Composite**. Public section reads filter by `userId` and `published`.
3. Configure `settings/platform` from the admin dashboard with the platform name, WhatsApp number in international digits (for example `628...`), price, and currency. No payment gateway or Storage bucket is used.
4. Users register at `register.html`, then manage data at `dashboard/user.html`. Their records are scoped by `userId`; username URLs use `portfolio.html?username=slug`, compatible with GitHub Pages deep links.
5. When a user requests payment, their status becomes `pending`; only an admin can approve or reject it. Approval records `approvedAt` and `approvedBy`; only the combined active/paid/published status makes the portfolio public.
6. Existing static pages, assets, and legacy Firestore records are preserved. No automatic migration assigns existing content to a new user. Keep the current portfolio as the demo until you deliberately associate or copy selected content to an owner.

Local browser checks cover page loading and access redirects only. Test registration, ownership isolation, payment status transitions, and public access after publishing the Rules and indexes; a live Firebase account is required for those network checks.