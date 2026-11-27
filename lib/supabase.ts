import { createClient } from "@supabase/supabase-js";

// Public (publishable) credentials. All writes go through PIN-checked
// SECURITY DEFINER functions; tables are read-only for the anon role.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vnugoyrmtyggpnonvtwp.supabase.co";
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudWdveXJtdHlnZ3Bub252dHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMTE1MzEsImV4cCI6MjEwOTc4NzUzMX0.-th2i9B5CShfGp3bx5TBLs6KJVHZ8qAqwTIP8WujIFE";

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 20 } },
});
