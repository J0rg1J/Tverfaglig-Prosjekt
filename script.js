// Supabase-tilkobling
const supabaseUrl = "https://lllydmhdgetqhihhezsq.supabase.co";
const supabaseKey = "sb_publishable_GQQrAyPTReEIUAbehyJRBA_6ld7H8-0";

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("Supabase er koblet:", supabaseClient);

function formatDateISO(d) {
  // yyyy-mm-dd
  return d.toISOString().slice(0, 10);
}

async function bookUtstyr(equipmentId) {
  const phone = prompt("Skriv inn telefonnummer:");
  if (!phone) return;

  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + 7);

  // 1) Lag booking
  const { error: bookingError } = await supabaseClient.from("bookings").insert([
    {
      equipment_id: equipmentId,
      user_phone: phone,
      start_date: formatDateISO(start),
      end_date: formatDateISO(end),
      returned: false,
    },
  ]);

  if (bookingError) {
    console.error("Booking-feil:", bookingError);
    alert("Kunne ikke booke. Sjekk Console.");
    return;
  }

  // 2) Sett utstyr til utlånt
  const { error: updateError } = await supabaseClient
    .from("equipment")
    .update({ available: false })
    .eq("id", equipmentId);

  if (updateError) {
    console.error("Oppdateringsfeil:", updateError);
    alert("Booking lagret, men status ble ikke oppdatert.");
    return;
  }

  alert("Booket i 1 uke!");
  hentUtstyr();
}

async function hentUtstyr() {
  const { data, error } = await supabaseClient
    .from("equipment")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Feil ved henting:", error);
    return;
  }

  console.log("Utstyr:", data);

  const list = document.getElementById("messages");
  list.innerHTML = "";

  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "list-group-item";

    const statusTekst = item.available ? "Tilgjengelig" : "Utlånt";
    const statusFarge = item.available ? "success" : "danger";

    const bookKnapp = item.available
      ? `<button class="btn btn-sm btn-primary mt-2" onclick="bookUtstyr('${item.id}')">Book</button>`
      : "";

    div.innerHTML = `
      <div>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${item.name}</strong><br>
            <small>${item.category}</small>
          </div>
          <span class="badge bg-${statusFarge}">${statusTekst}</span>
        </div>
        ${bookKnapp}
      </div>
    `;

    list.appendChild(div);
  });
}

// Start
hentUtstyr();
