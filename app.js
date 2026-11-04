
const API = (window.CAMERA_BOOKING_API || "").replace(/\/$/, "");

const $ = (id) => document.getElementById(id);

let token = localStorage.getItem("cb_token") || "";
let me = null;
let selectedService = "";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function message(text, isError = false) {
  const el = $("authMessage");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#e57373" : "#d6b36a";
}

function toast(text) {
  let el = $("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.cssText =
    "position:fixed;bottom:25px;left:50%;transform:translateX(-50%);" +
    "background:#222;color:white;padding:13px 20px;border:1px solid #d6b36a;" +
    "border-radius:8px;z-index:99999;max-width:90%;text-align:center;";
  clearTimeout(window.cbToastTimer);
  window.cbToastTimer = setTimeout(() => el.remove(), 3500);
}

async function request(path, body = null, method = "POST") {
  if (!API) throw new Error("Backend URL config.js mein set nahi hai.");

  const response = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data;
}

function openModal() {
  $("authModal").classList.remove("hidden");
  $("authModal").classList.add("show");
}

function closeModal() {
  $("authModal").classList.add("hidden");
  $("authModal").classList.remove("show");
}

$("closeModal").onclick = closeModal;

$("authModal").addEventListener("click", e => {
  if (e.target === $("authModal")) closeModal();
});

function showTab(tab) {
  ["customer", "partner", "admin"].forEach(name => {
    $("customerPanel").classList.toggle("hidden", name !== tab);
    $("partnerPanel").classList.toggle("hidden", name !== tab);
    $("adminPanel").classList.toggle("hidden", name !== tab);
  });

  document.querySelectorAll("[data-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  $("authTitle").textContent =
    tab === "customer" ? "Customer Login / Register" :
    tab === "partner" ? "Partner Registration" : "Admin Login";

  message("");
}

document.querySelectorAll("[data-tab]").forEach(button => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});

document.querySelectorAll("[data-auth]").forEach(button => {
  button.addEventListener("click", () => {
    showTab(button.dataset.auth);
    openModal();
  });
});

document.querySelectorAll("[data-service]").forEach(button => {
  button.addEventListener("click", () => {
    selectedService = button.dataset.service;
    showTab("customer");
    openModal();
  });
});

// Customer OTP
$("customerOtp").parentElement.classList.add("hidden");
$("customerVerify").disabled = true;

$("customerSend").onclick = async () => {
  try {
    const phone = $("customerPhone").value.trim();
    if (!phone) throw new Error("Mobile number enter karein.");

    await request("/api/auth/send-otp", { phone });

    $("customerOtp").parentElement.classList.remove("hidden");
    $("customerVerify").disabled = false;
    message("OTP SMS par bhej diya gaya hai.");
  } catch (error) {
    message(error.message, true);
  }
};

$("customerVerify").onclick = async () => {
  try {
    const phone = $("customerPhone").value.trim();
    const otp = $("customerOtp").value.trim();
    const name = $("customerName").value.trim();

    if (!phone || !otp) throw new Error("Mobile number aur OTP zaroori hain.");

    const data = await request("/api/auth/verify-otp", {
      phone,
      otp,
      name,
      role: "customer"
    });

    if (!data.token) throw new Error(data.message || "Login complete nahi hua.");

    await saveLogin(data);
  } catch (error) {
    message(error.message, true);
  }
};

// Partner registration
$("partnerOtp").parentElement.classList.add("hidden");
$("partnerVerify").disabled = true;

$("partnerSend").onclick = async () => {
  try {
    const phone = $("partnerPhone").value.trim();

    if (!$("partnerName").value.trim()) {
      throw new Error("Apna naam enter karein.");
    }
    if (!$("partnerCity").value.trim()) {
      throw new Error("City / district enter karein.");
    }
    if (!phone) throw new Error("Mobile number enter karein.");

    await request("/api/auth/send-otp", { phone });

    $("partnerOtp").parentElement.classList.remove("hidden");
    $("partnerVerify").disabled = false;
    message("Partner OTP SMS par bhej diya gaya hai.");
  } catch (error) {
    message(error.message, true);
  }
};

$("partnerVerify").onclick = async () => {
  try {
    if (!$("partnerAgreement").checked) {
      throw new Error("Draft Partner Agreement ko read karke agree karein.");
    }

    const data = await request("/api/auth/verify-otp", {
      phone: $("partnerPhone").value.trim(),
      otp: $("partnerOtp").value.trim(),
      name: $("partnerName").value.trim(),
      city: $("partnerCity").value.trim(),
      role: "partner"
    });

    if (data.pending) {
      message(data.message || "Application admin approval ke liye submit ho gayi hai.");
      return;
    }

    if (!data.token) {
      throw new Error(data.message || "Partner registration complete nahi hua.");
    }

    await saveLogin(data);
  } catch (error) {
    message(error.message, true);
  }
};

// Draft agreement text
$("agreementText").textContent =
`CAMERA BOOKING - DRAFT PARTNER AGREEMENT

Business: CAMERA BOOKING
Address: Bhowraguri Satbil Pt-2, Kokrajhar, Assam, India.

1. The partner agrees to provide the photography, videography or other approved creative services described in an agreed booking.

2. The partner must provide accurate personal, contact, skill and payment details.

3. Every new partner application is subject to CAMERA BOOKING admin approval.

4. Work assignments, service details, dates, location and payment must be agreed before each assignment.

5. Partners must respect customer privacy, obtain appropriate permissions and behave professionally.

6. No assignment is guaranteed. Work depends on customer requirements and availability.

7. Any cancellation, payment dispute or other issue should be reported to the business.

8. Both parties should discuss and agree on the final terms before signing.

Partner name: ______________________
Partner mobile: ____________________
Partner city: _______________________

Partner signature: __________________
Business representative: _____________
Date: ______________________________

IMPORTANT: This is a discussion draft, not a final legal contract. Have an Indian lawyer review it before signing or notarisation.`;

// Admin login
$("adminLogin").onclick = async () => {
  try {
    const data = await request("/api/auth/admin-login", {
      email: $("adminEmail").value.trim(),
      password: $("adminPassword").value
    });

    if (!data.token) throw new Error("Admin login failed.");
    await saveLogin(data);
  } catch (error) {
    message(error.message, true);
  }
};

async function saveLogin(data) {
  token = data.token;
  localStorage.setItem("cb_token", token);
  me = data.user || null;
  closeModal();
  await dashboard();
}

// Logout
$("logoutBtn").onclick = () => {
  token = "";
  me = null;
  localStorage.removeItem("cb_token");
  $("dashboard").classList.add("hidden");
  closeModal();
  toast("Logged out successfully.");
};

// Dashboard
function showDashboard(title, account) {
  $("dashboard").classList.remove("hidden");
  $("dashboardTitle").textContent = title;
  $("accountInfo").textContent = account || "";

  ["customerDash", "partnerDash", "adminDash"].forEach(id => {
    $(id).classList.add("hidden");
  });

  $("dashboard").scrollIntoView({ behavior: "smooth" });
}

async function dashboard() {
  try {
    const data = await request("/api/me", null, "GET");
    me = data.user || data;

    if (me.role === "customer") {
      await customerDashboard();
    } else if (me.role === "partner") {
      await partnerDashboard();
    } else if (me.role === "admin") {
      await adminDashboard();
    } else {
      throw new Error("Account role not recognized.");
    }
  } catch (error) {
    token = "";
    me = null;
    localStorage.removeItem("cb_token");
    toast(error.message);
  }
}

// Customer dashboard
async function customerDashboard() {
  showDashboard(
    "Customer Dashboard",
    "Welcome " + (me.name || "") + " · " + (me.phone || "")
  );

  $("customerDash").classList.remove("hidden");

  if (selectedService) {
    $("bookingService").value = selectedService;
  }

  $("bookingDate").min = new Date().toISOString().slice(0, 10);

  $("createBooking").onclick = async () => {
    try {
      const eventDate = $("bookingDate").value;
      if (!eventDate) throw new Error("Event date select karein.");

      await request("/api/bookings", {
        service: $("bookingService").value,
        city: $("bookingCity").value.trim(),
        venue: $("bookingVenue").value.trim(),
        eventDate,
        customerName: me.name,
        notes: $("bookingNotes").value.trim()
      });

      toast("Booking request submitted successfully.");
      await loadCustomerBookings();
    } catch (error) {
      toast(error.message);
    }
  };

  await loadCustomerBookings();
}

async function loadCustomerBookings() {
  try {
    const data = await request("/api/bookings/mine", null, "GET");
    const bookings = data.bookings || [];

    $("myBookings").innerHTML = bookings.map(booking => `
      <div class="dashboard-item">
        <strong>#${escapeHtml(booking.id)} - ${escapeHtml(booking.service)}</strong>
        <p>${escapeHtml(booking.city)} · ${escapeHtml(booking.event_date)}</p>
        <span class="status">${escapeHtml(booking.status)}</span>
      </div>
    `).join("") || "Abhi koi booking nahi hai.";
  } catch (error) {
    $("myBookings").textContent = error.message;
  }
}

// Partner dashboard
async function partnerDashboard() {
  showDashboard(
    "Partner Dashboard",
    "Welcome " + (me.name || "") + " · " + (me.phone || "")
  );

  $("partnerDash").classList.remove("hidden");
  $("partnerStatus").textContent = "Account status: " + (me.status || "Pending");

  if (me.status === "approved") {
    $("partnerCertificate").classList.remove("hidden");
  }

  try {
    const data = await request("/api/partner/bookings", null, "GET");
    $("partnerBookings").innerHTML = (data.bookings || []).map(booking => `
      <div class="dashboard-item">
        <strong>#${escapeHtml(booking.id)} · ${escapeHtml(booking.service)}</strong>
        <p>${escapeHtml(booking.city)} · ${escapeHtml(booking.status)}</p>
      </div>
    `).join("") || "Abhi koi assigned booking nahi hai.";
  } catch (error) {
    $("partnerBookings").textContent = error.message;
  }

  try {
    const data = await request("/api/partner/payments", null, "GET");
    $("partnerPayments").innerHTML = (data.payments || []).map(payment => `
      <div class="dashboard-item">
        ₹${escapeHtml(payment.amount)} · Booking #${escapeHtml(payment.booking_id)}
      </div>
    `).join("") || "Abhi payment record nahi hai.";
  } catch (error) {
    $("partnerPayments").textContent = error.message;
  }
}

// Admin dashboard
async function adminDashboard() {
  showDashboard(
    "Admin Dashboard",
    "Signed in as " + (me.email || me.name || "Admin")
  );

  $("adminDash").classList.remove("hidden");
  await loadAdminData();
}

async function loadAdminData() {
  try {
    const data = await request("/api/admin/partners", null, "GET");
    const partners = data.partners || [];

    $("adminPartners").innerHTML = partners.map(partner => `
      <div class="dashboard-item">
        <strong>#${escapeHtml(partner.id)} · ${escapeHtml(partner.name)}</strong>
        <p>${escapeHtml(partner.city || "")} · ${escapeHtml(partner.phone || "")}</p>
        <p>Status: ${escapeHtml(partner.status)}</p>
        <button class="btn" data-partner="${escapeHtml(partner.id)}" data-status="approved">Approve</button>
        <button class="btn outline" data-partner="${escapeHtml(partner.id)}" data-status="rejected">Reject</button>
      </div>
    `).join("") || "No partner applications.";

    document.querySelectorAll("[data-partner]").forEach(button => {
      button.onclick = async () => {
        try {
          await request(
            "/api/admin/partners/" + button.dataset.partner,
            { status: button.dataset.status },
            "PATCH"
          );
          toast("Partner status updated.");
          await loadAdminData();
        } catch (error) {
          toast(error.message);
        }
      };
    });

    const bookingData = await request("/api/admin/bookings", null, "GET");
    const bookings = bookingData.bookings || [];

    $("adminBookings").innerHTML = bookings.map(booking => `
      <div class="dashboard-item">
        <strong>#${escapeHtml(booking.id)} · ${escapeHtml(booking.service)}</strong>
        <p>${escapeHtml(booking.city)} · ${escapeHtml(booking.status)}</p>
        <label>Booking status
          <select id="status-${escapeHtml(booking.id)}">
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label>Approved partner ID
          <input id="partner-${escapeHtml(booking.id)}" placeholder="Partner ID">
        </label>
        <button class="btn" data-booking="${escapeHtml(booking.id)}">Update Booking</button>
      </div>
    `).join("") || "No bookings yet.";

    bookings.forEach(booking => {
      const statusSelect = $("status-" + booking.id);
      if (statusSelect) statusSelect.value = booking.status;
    });

    document.querySelectorAll("[data-booking]").forEach(button => {
      button.onclick = async () => {
        try {
          const id = button.dataset.booking;
          const partnerId = $("partner-" + id).value.trim();

          await request("/api/admin/bookings/" + id, {
            status: $("status-" + id).value,
            partnerId: partnerId || null
          }, "PATCH");

          toast("Booking updated.");
          await loadAdminData();
        } catch (error) {
          toast(error.message);
        }
      };
    });

  } catch (error) {
    toast(error.message);
  }
}

// Restore existing login
if (token) {
  dashboard();
}
