import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey ?? supabaseAnonKey
);

export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP ?? "5511932139081";

export function buildWhatsAppLink(message?: string): string {
  return `https://wa.me/${WHATSAPP}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
