// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hcdchflecgmlsxkrmrkv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZGNoZmxlY2dtbHN4a3Jtcmt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2MjQ4NzYsImV4cCI6MjA1NTIwMDg3Nn0.D5VN6DpRf-dRMU0jq3fEZ18u9VP8egga2ClwOy7RGUs";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);