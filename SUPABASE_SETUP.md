# Supabase setup

The portfolio remains a static site. Supabase provides its database, admin authentication, and image storage; the public pages keep their current HTML as a fallback until published database records are available.

## Connect the existing project safely

Do not create another project. [`js/supabase-config.js`](js/supabase-config.js) is configured for project `hhtcmfenbdzpmcltigy` with its `sb_publishable_` browser key. A publishable key is not a secret; never put a `service_role` or secret key in frontend code.

The project hostname currently returns DNS NXDOMAIN in the reported checks. Until `hhtcmfenbdzpmcltigy.supabase.co` resolves, Auth, REST/database, and Storage requests cannot reach the project. Check the project URL/reference in the Supabase dashboard or with Supabase support; JavaScript cannot repair a nonexistent DNS record.

Do not run [`database/schema.sql`](database/schema.sql) blindly against the existing project. It creates missing tables, but also drops/recreates policies and triggers with matching names, replaces a database function, updates the `portfolio-media` bucket settings, and grants all authenticated users write access to the generated tables. First inspect the current tables, policies, triggers, function, bucket, and users in the Supabase dashboard. Apply only reviewed, missing changes; do not delete or replace existing data or policies just to make login work.

After DNS is fixed, verify the existing Auth setup and RLS policies in the dashboard, confirm the intended administrator user already exists, and keep public sign-ups disabled if that matches the project's access policy. Open `admin/index.html` through Live Server and sign in there; no password belongs in source code. The dashboard currently reveals its UI to any authenticated user, so the database's existing RLS policy must enforce which accounts can write. Do not assume that the policy in the SQL template matches the live project.

Admin access relies on Supabase Auth plus the SQL policies: public visitors can only read published records; authenticated users can manage records and upload images. Keep public sign-ups disabled so visitors cannot create an authenticated account.

## Database collections

The dashboard manages Profile, Experience, Organization, Projects, Gallery, Certificates, Achievements, Education, Publications, Skills, and Social media. Collection entries use a title, subtitle, organization, period, description, JSON `details` array, image/link URLs, display order, and publish toggle. Profile has its own fields. Gallery images can be uploaded directly from the editor to the public `portfolio-media` bucket. Use **Import current portfolio** once to copy the existing static content into empty collections before editing it in the database; already-populated collections are skipped.

## Publish

The repository already points to GitHub Pages (`simonveres.github.io/Portofolio`). Push the changes to the `main` branch and ensure **Settings > Pages** publishes the repository from that branch. Configure the Supabase URL/key before publishing; the public anon key is safe only together with the supplied row-level security policies. GitHub and Supabase account access is required to complete the remote setup.

## Note about existing content

Existing portfolio markup is preserved as a fallback. A category switches to database-rendered content after it has published rows; import current content first to retain its complete contents. Unpublished rows stay private and do not replace the existing public markup.