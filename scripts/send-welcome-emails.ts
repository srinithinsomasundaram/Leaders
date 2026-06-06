/**
 * Script to send welcome emails to all users
 *
 * Usage:
 * npx tsx scripts/send-welcome-emails.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

interface Profile {
  id: string;
  email: string;
  name: string;
  username: string;
}

async function sendWelcomeEmailsToAllUsers() {
  // Import dynamically after env vars are loaded
  const { createClient } = await import("@supabase/supabase-js");
  const { sendWelcomeEmail } = await import("../src/lib/email.server");
  const ws = await import("ws");

  // Create Supabase admin client with WebSocket support for Node.js 20
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: fetch,
      },
      realtime: {
        transport: ws.WebSocket as any,
      },
    }
  );

  console.log("🚀 Starting welcome email send to all users...\n");

  try {
    // Fetch all users with their profiles and emails
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, name, username")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("❌ Error fetching profiles:", profilesError);
      process.exit(1);
    }

    if (!profiles || profiles.length === 0) {
      console.log("⚠️  No profiles found in the database.");
      process.exit(0);
    }

    console.log(`📊 Found ${profiles.length} users\n`);

    // Get emails from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error("❌ Error fetching auth users:", authError);
      process.exit(1);
    }

    // Create a map of user_id -> email
    const emailMap = new Map<string, string>();
    authUsers.users.forEach((user) => {
      if (user.email) {
        emailMap.set(user.id, user.email);
      }
    });

    // Combine profiles with emails
    const usersWithEmails: Profile[] = profiles
      .map((profile) => ({
        id: profile.id,
        email: emailMap.get(profile.id) || "",
        name: profile.name || "Leader",
        username: profile.username || "user",
      }))
      .filter((user) => user.email); // Only users with emails

    console.log(`✅ ${usersWithEmails.length} users have valid email addresses\n`);

    let successCount = 0;
    let failureCount = 0;
    const failures: Array<{ email: string; error: string }> = [];

    // Send emails with delay to avoid rate limiting
    for (let i = 0; i < usersWithEmails.length; i++) {
      const user = usersWithEmails[i];

      try {
        console.log(`[${i + 1}/${usersWithEmails.length}] Sending to ${user.name} (${user.email})...`);

        await sendWelcomeEmail({
          email: user.email,
          name: user.name,
          username: user.username,
        });

        successCount++;
        console.log(`  ✅ Sent successfully\n`);

        // Add a small delay between sends to avoid rate limiting (100ms)
        if (i < usersWithEmails.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error: any) {
        failureCount++;
        const errorMsg = error?.message || String(error);
        failures.push({ email: user.email, error: errorMsg });
        console.log(`  ❌ Failed: ${errorMsg}\n`);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📧 EMAIL SENDING SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📊 Total: ${usersWithEmails.length}`);

    if (failures.length > 0) {
      console.log("\n❌ Failed emails:");
      failures.forEach(({ email, error }) => {
        console.log(`  - ${email}: ${error}`);
      });
    }

    console.log("\n✨ Done!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
sendWelcomeEmailsToAllUsers();
