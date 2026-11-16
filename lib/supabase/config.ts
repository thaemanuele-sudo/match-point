/**
 * Progetto Supabase di Match Point (wbnqcsrdlfgaomizghnx).
 * Indirizzo e chiave "publishable" sono pubblici per natura (finiscono comunque nel browser), quindi stanno qui:
 * così l'app non dipende dalle variabili NEXT_PUBLIC_SUPABASE_* che l'integrazione Vercel ha creato
 * per un altro progetto Supabase. Si possono sostituire con NEXT_PUBLIC_MP_SUPABASE_URL / NEXT_PUBLIC_MP_SUPABASE_KEY.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_MP_SUPABASE_URL || "https://wbnqcsrdlfgaomizghnx.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_MP_SUPABASE_KEY || "sb_publishable_5PjT-S5lZO-bo3Y9Su2OIg_g8HeaVam";
