// Supabase-tilkobling
const supabaseUrl = "https://lllydmhdgetqhihhezsq.supabase.co";
const supabaseKey = "sb_publishable_GQQrAyPTReEIUAbehyJRBA_6ld7H8-0";

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("Supabase er koblet:", supabaseClient);
