# Weighed

Product rankings scored by credentialed experts and weighed against verified-purchase reviews.

Built with Next.js 14 and Supabase (database, sign-in and photo storage). Hosts free on Vercel.

---

## Get it live (about an hour, no coding)

You'll create three free accounts: **GitHub** (stores the code), **Supabase** (database) and **Vercel** (hosting).

### 1. Put the code on GitHub

1. Create an account at github.com if you don't have one.
2. Click **New repository**, name it `weighed`, keep it **Private**, and click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
4. Unzip `weighed.zip` on your computer, open the `weighed` folder, select **everything inside it**, and drag it into the upload area. Click **Commit changes**.

### 2. Set up the database on Supabase

1. Create an account at supabase.com and click **New project**. Pick a name, set a database password (save it somewhere safe), choose the region nearest your visitors, and create it. Wait a minute or two for it to finish.
2. In the left sidebar, open **SQL Editor** → **New query**.
3. Open `supabase/schema.sql` from the code, copy all of it, paste it into the editor, and click **Run**. You should see "Success. No rows returned."
4. Start another **New query**, paste all of `supabase/seed.sql`, and click **Run**. This loads the sample products. (Skip this if you want to start empty.)
5. Go to **Project Settings** → **API**. Keep this tab open: you'll need the **Project URL** and the **anon public** key in step 3.

### 3. Deploy on Vercel

1. Create an account at vercel.com and choose **Continue with GitHub**.
2. Click **Add New…** → **Project**, find `weighed`, and click **Import**.
3. Open **Environment Variables** and add these three:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL from Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key from Supabase |
   | `NEXT_PUBLIC_SITE_URL` | leave blank for now |

4. Click **Deploy**. After a few minutes you get a live address like `https://weighed-abc123.vercel.app`.
5. Copy that address. In Vercel, go to **Settings** → **Environment Variables**, set `NEXT_PUBLIC_SITE_URL` to it, then **Deployments** → **⋯** → **Redeploy**.

### 4. Connect sign-in

1. In Supabase, go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to your Vercel address.
3. Under **Redirect URLs**, add `https://YOUR-ADDRESS/auth/callback`.

### 5. Make yourself the admin

1. Open your live site, click **Sign in**, enter your email, and click the link you receive.
2. In Supabase, open **SQL Editor** → **New query**, paste this with your email, and click **Run**:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

3. Refresh the site. You'll now see **Admin** in the menu.

You're live. Anyone can view the rankings; only you can change them.

---

## Using the site

- **Rankings** (`/` and `/c/<category>`): public. Scores are calculated live from ballots and review data.
- **Product pages** (`/p/<id>`): the full score breakdown and every ballot. Admins also see forms to add ballots, update review numbers, change the photo or delete the product.
- **Admin** (`/admin`): scoring weights with a live preview, add products, press coverage, people and roles, and removing the sample data.
- **Panel** (`/panel`): experts sign in, complete their profile and license details, declare conflicts, and submit their own ballots. The database blocks a ballot for any brand they've declared a tie to.
- **Corrections** (`/corrections`): a public log the database writes automatically whenever a ballot, customer data or the method changes. Sample data isn't logged.

### Adding an expert

1. Ask them to sign in at `/login`. They'll land on the Panel page and can fill in their profile and license.
2. Verify their license with the issuing board.
3. In **Admin → People**, set their role to **Panelist**, tick **Verified**, and click **Save**.

---

## For a developer

```bash
cp .env.example .env.local   # fill in the Supabase values
npm install
npm run dev                  # http://localhost:3000
npm test                     # scoring unit tests (Node 22+)
```

- `lib/scoring.ts`: the scoring model (pure functions, unit-tested in `lib/scoring.test.ts`).
- `supabase/schema.sql`: tables, row-level security, the corrections-log triggers and the photo bucket. Security is enforced in the database: viewers can only read; panelists can only insert their own ballots, never for a brand they've declared; admins can write everything.
- `app/admin/actions.ts` and `app/panel/actions.ts`: server actions for every write.

### Not built yet

- Importing verified-purchase reviews automatically (review numbers are entered by an admin for now).
- Expert profile pages, email notifications, and a Newsroom page.
- Legal pages (privacy, terms, affiliate disclosure). Add these before launch.
