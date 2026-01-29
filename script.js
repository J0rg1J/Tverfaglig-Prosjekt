// Supabase-tilkobling
const supabaseUrl = "https://lllydmhdgetqhihhezsq.supabase.co";
const supabaseKey = "sb_publishable_GQQrAyPTReEIUAbehyJRBA_6ld7H8-0";

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("Supabase er koblet:", supabaseClient);

const adminEmails = ["jorgenhellenesj@gmail.com", "placeholder@example.com"];

let utstyrCache = [];

function visMelding(tekst, type = "success") {
  const feedback = document.getElementById("feedback");

  feedback.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${tekst}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

async function loggInnMedSkjema() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Innlogging-feil:", error);
    visMelding("Innlogging feilet. Sjekk e-post/passord.", "danger");
    return;
  }

  visMelding("Du er logget inn.", "success");
  oppdaterAdminVisning();

  // Lukk modal
  const modalEl = document.getElementById("authModal");
  bootstrap.Modal.getInstance(modalEl)?.hide();
}

async function lagBrukerMedSkjema() {
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  const { error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    console.error("Sign up-feil:", error);
    visMelding("Kunne ikke lage bruker.", "danger");
    return;
  }

  visMelding(
    "Bruker opprettet. Sjekk e-post for verifisering (hvis aktivert).",
    "success",
  );
}

async function loggInn() {
  const email = prompt("E-post:")?.trim();
  const password = prompt("Passord:");

  if (!email || !password) return;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Innlogging-feil:", error);
    visMelding("Innlogging feilet.", "danger");
    return;
  }

  visMelding("Du er logget inn.", "success");
  oppdaterAdminVisning();
}

async function oppdaterAdminVisning() {
  const adminSection = document.getElementById("adminSection");

  const { data } = await supabaseClient.auth.getUser();
  const user = data?.user;

  if (!user) {
    adminSection.classList.add("d-none");
    return;
  }

  if (adminEmails.includes(user.email)) {
    adminSection.classList.remove("d-none");
    hentAktiveUtlån();
  } else {
    adminSection.classList.add("d-none");
  }
}

function formatDateISO(d) {
  // yyyy-mm-dd
  return d.toISOString().slice(0, 10);
}

async function bookUtstyr(equipmentId) {
  const phone = prompt("Skriv inn telefonnummer:")?.trim();
  if (!phone) return;

  // Sjekk om bruker er sperret pga for sen levering
  const today = formatDateISO(new Date());

  const { data: lateBookings, error: lateError } = await supabaseClient
    .from("bookings")
    .select("id")
    .eq("user_phone", phone)
    .eq("returned", false)
    .lt("end_date", today);

  if (lateError) {
    console.error("Feil ved sperre-sjekk:", lateError);
    alert("Kunne ikke sjekke sperrestatus. Sjekk Console.");
    return;
  }

  if ((lateBookings?.length ?? 0) > 0) {
    visMelding(
      "Du kan ikke booke nytt utstyr før for sent levert utstyr er levert inn.",
      "warning",
    );
    return;
  }

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
    visMelding("Kunne ikke booke utstyr.", "danger");
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

  visMelding("Utstyr er booket i 1 uke.", "success");
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

  utstyrCache = data;
  fyllKategorier();
  renderUtstyr();
}

function fyllKategorier() {
  const select = document.getElementById("filterCategory");
  if (!select) return;

  const kategorier = [...new Set(utstyrCache.map((x) => x.category))].sort();

  // Behold "Alle"
  select.innerHTML =
    `<option value="">Alle</option>` +
    kategorier.map((k) => `<option value="${k}">${k}</option>`).join("");
}

function renderUtstyr() {
  const list = document.getElementById("messages");
  list.innerHTML = "";

  const category = document.getElementById("filterCategory")?.value ?? "";
  const availability =
    document.getElementById("filterAvailability")?.value ?? "all";
  const search = (
    document.getElementById("filterSearch")?.value ?? ""
  ).toLowerCase();

  let filtered = utstyrCache;

  if (category) {
    filtered = filtered.filter((x) => x.category === category);
  }

  if (availability === "available") {
    filtered = filtered.filter((x) => x.available === true);
  } else if (availability === "unavailable") {
    filtered = filtered.filter((x) => x.available === false);
  }

  if (search) {
    filtered = filtered.filter((x) =>
      (x.name ?? "").toLowerCase().includes(search),
    );
  }

  filtered.forEach((item) => {
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

async function hentAktiveUtlån() {
  const { data, error } = await supabaseClient
    .from("bookings")
    .select("id, user_phone, start_date, end_date, equipment_id")
    .eq("returned", false)
    .order("end_date", { ascending: true });

  if (error) {
    console.error("Feil ved henting av utlån:", error);
    return;
  }

  const container = document.getElementById("activeBookings");
  container.innerHTML = "";

  data.forEach((b) => {
    const div = document.createElement("div");
    div.className = "list-group-item";

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>Tlf:</strong> ${b.user_phone}<br>
          <small>${b.start_date} → ${b.end_date}</small><br>
          <small><strong>Utstyr-ID:</strong> ${b.equipment_id}</small>
        </div>
        <button class="btn btn-sm btn-success" onclick="markerLevert('${b.id}', '${b.equipment_id}')">
          Markér levert
        </button>
      </div>
    `;

    container.appendChild(div);
  });
}

async function markerLevert(bookingId, equipmentId) {
  // 1) sett booking returned = true
  const { error: bErr } = await supabaseClient
    .from("bookings")
    .update({ returned: true })
    .eq("id", bookingId);

  if (bErr) {
    console.error("Feil ved retur:", bErr);
    alert("Kunne ikke markere som levert.");
    return;
  }

  // 2) sett utstyr available = true
  const { error: eErr } = await supabaseClient
    .from("equipment")
    .update({ available: true })
    .eq("id", equipmentId);

  if (eErr) {
    console.error("Feil ved oppdatering av utstyr:", eErr);
    alert("Levert, men kunne ikke gjøre utstyr tilgjengelig.");
    return;
  }

  visMelding("Utstyr er markert som levert.", "success");
  hentUtstyr();
  hentAktiveUtlån();
}

function hookFilterEvents() {
  document
    .getElementById("filterCategory")
    ?.addEventListener("change", renderUtstyr);
  document
    .getElementById("filterAvailability")
    ?.addEventListener("change", renderUtstyr);
  document
    .getElementById("filterSearch")
    ?.addEventListener("input", renderUtstyr);
}

hookFilterEvents();
hentUtstyr();
oppdaterAdminVisning();
