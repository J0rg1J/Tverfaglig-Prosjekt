// Supabase-tilkobling
const supabaseUrl = "https://lllydmhdgetqhihhezsq.supabase.co";
const supabaseKey = "sb_publishable_GQQrAyPTReEIUAbehyJRBA_6ld7H8-0";

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("Supabase er koblet:", supabaseClient);

async function hentMeldinger() {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Feil ved henting:", error);
    return;
  }

  console.log("DATA FRA SUPABASE:", data);

  const messagesDiv = document.getElementById("messages");
  messagesDiv.innerHTML = "";

  data.forEach((msg) => {
    const div = document.createElement("div");
    div.className = "list-group-item";

    div.innerHTML = `
      <strong>${msg.name ?? "Anonym"}</strong><br>
      ${msg.text}
    `;

    messagesDiv.appendChild(div);
  });
}

hentMeldinger();
