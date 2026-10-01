# 🚀 Group Member Setup Guide: Supabase & One-Click Project Launch

Welcome to the **Druto Sheba (Emergency Response System)** setup guide! Follow these simple instructions to initialize the project database on your local machine and launch the app in seconds.

---

## ⚡ Quick Launch: One-Click Runner (`run_project.bat`)

For the easiest experience, we have created an automated launcher **`run_project.bat`** located right in the project root folder.

### How to use:
1. **Double-click `run_project.bat`** in the project root directory.
2. That's it! The launcher will automatically:
   - ✅ Navigate to the project directory portably (works from **any folder, drive, or PC** using dynamic paths).
   - ✅ Check if `node_modules` are installed (and automatically run `npm install` if missing).
   - ✅ Boot up the Next.js development server on **`http://localhost:3500`**.
   - ✅ Monitor the server in the background and **automatically open your default browser** as soon as the app is ready.

> [!TIP]
> **Portability Note:** The script uses dynamic relative paths (`%~dp0`), meaning group members **do NOT need to edit file paths** even if their project is stored in a different folder or drive (e.g. `D:\Projects\...` or `C:\Users\...\Desktop\...`). Just double-click and run!

---

## 🏛️ Step 1: Create a Supabase Account & Database Project

1. Go to [Supabase](https://supabase.com/) and register / log in (using your GitHub account is recommended).
2. Click **New Project** and select your organization.
3. Configure the project:
   - **Name**: `Emergency-Response-System` (or similar)
   - **Database Password**: Set a secure password. 
     > [!IMPORTANT]
     > **Do NOT use special characters** (like `@`, `#`, `?`, `:`, `/`) in your database password. Keep it simple with letters and numbers (e.g., `Saikat12345`) to avoid connection string URL parsing errors! Write this password down!
   - **Region**: Choose a region close to you (e.g., Singapore).
4. Click **Create New Project** and wait 1–2 minutes for setup completion.

---

## 🔗 Step 2: Get the Connection String (URI)

Once your project is created, copy the connection details to link it with your code:

1. Look at the top menu bar of your Supabase dashboard and click the green **Connect** button.
2. In the popup that appears:
   - Select the **Direct Connection string** tab (the 3rd option from the left).
   - Under *Connection Method*, keep **Direct connection** selected.
   - Under *Type*, keep **URI** selected.
3. Scroll down to the **Connection string** text box.
4. Click the **Copy** button on the right side of the text box to copy the URI.
   - The URI looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxx.supabase.co:5432/postgres`

---

## ⚙️ Step 3: Replace Password & Configure Your Project

To save time and avoid replacing the password twice inside VS Code, modify the URI in Notepad first:

1. Open **Notepad** on your computer and paste the raw connection URI you copied from Supabase.
2. Replace the `[YOUR-PASSWORD]` part (including the square brackets `[` and `]`) with your actual database password.
   - *Example:* If your password is `Saikat12345`, your final URI inside Notepad will be:
     `postgresql://postgres:Saikat12345@db.xxxxxxxxxx.supabase.co:5432/postgres`
3. Copy this new, fully-modified URI from Notepad.
4. Paste this same URI directly into the following two files:

### 1. In the Database Setup Script
- Open `druto-sheba-app/run_db_setup.js` in VS Code.
- Go to **line 5** and paste the URI inside the quotes:
  ```javascript
  const connectionString = "PASTE_THE_MODIFIED_URI_HERE";
  ```
- Save and close.

### 2. In the Application Environment File
- Open the `.env.local` file inside the `druto-sheba-app/` directory.
- Update these lines with your new details (leave everything else as-is):
  ```env
  PG_HOST=YOUR_NEW_SUPABASE_HOST_HERE (e.g., db.xxxxxxxxxx.supabase.co)
  PG_PASSWORD=YOUR_NEW_PASSWORD_HERE
  PG_CONNECTION_STRING="PASTE_THE_MODIFIED_URI_HERE"
  NEXT_PUBLIC_CARTO_API_KEY=cb1_2pxd_1_aa2f346c817a884d6435d78a
  ```
  *(Tip: Your `PG_HOST` is just the domain name inside your copied Connection String—the part after the `@` symbol and before the `:` symbol).*
- Save and close the file.

---

## 🛠️ Step 4: Run the Database Setup Script

Instead of manually copy-pasting multiple SQL files into the Supabase web SQL editor, run the automated setup script:

1. Open your terminal in the `druto-sheba-app` folder.
2. Execute the setup script:
   ```bash
   node run_db_setup.js
   ```
3. This script will automatically connect to your Supabase, reset the schema, create all necessary tables, constraints, triggers, and insert all default seed data in seconds.

---

## 🖥️ Step 5: Start the Development Server

You can start the project in either of two ways:

### Option A: Using the One-Click Launcher (Recommended)
- Simply double-click **`run_project.bat`** in the project root!

### Option B: Using the Command Line
1. Open your terminal inside `druto-sheba-app/` and install dependencies (if not already done):
   ```bash
   npm install
   ```
2. Start the local server on port 3500:
   ```bash
   npm run dev -- -p 3500
   ```
3. Open `http://localhost:3500` in your web browser. You're ready to run!
