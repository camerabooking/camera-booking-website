// ======================================
// CAMERA BOOKING - WEBSITE JAVASCRIPT
// File name must be: app.js
// ======================================

"use strict";

const API = (
  window.CAMERA_BOOKING_API ||
  "https://camera-booking-backend.onrender.com"
).replace(/\/$/, "");

const $ = (id) => document.getElementById(id);

let token = localStorage.getItem("cb_token") || "";
let me = null;
let selectedService = "";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
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

function message(text, isError = false) {
  const el = $("authMessage");
  if (!el) {
    toast(text);
    return;
  }
  el.textContent = text;
  el.style.color = isError ? "#e57373" : "#d6b36a";
}

function normalizePhone(phone) {
  const value = String(phone || "").replace(/[\s()-]/g, "");
  if (/^\d{10}$/.test(value)) return "+91" + value;
  if (/^91\d{10}$/.test(value)) return "+" + value;
  return value;
}

async function request(path, body = null, method = "POST") {
  let response;
  try {
    response = await fetch(API + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {})
      },
      ...(body !== null ? { body: JSON.stringify(body) } : {})
    });
  } catch (err) {
    throw new Error("Backend connect nahi hua. Thodi der baad dobara try karein.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.error || data.message || data.detail ||
      ("Server error: " + response.status)
    );
  }
  return data;
}

function showTab(tab) {
  const panels = {
    customer: "customerPanel",
    partner: "partnerPanel",
    admin: "adminPanel"
  };

  Object.entries(panels).forEach(([name, id]) => {
    if ($(id)) $(id).classList.toggle("hidden", name !== tab);
  });

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  if ($("authTitle")) {
    $("authTitle").textContent =
      tab === "customer" ? "Customer Login / Register" :
      tab === "partner" ? "Partner Registration" : "Admin Login";
  }
  message("");
}

function openModal() {
  if ($("authModal")) $("authModal").classList.remove("hidden");
}

function closeModal() {
  if ($("authModal")) $("authModal").classList.add("hidden");
}

if ($("closeModal")) $("closeModal").addEventListener("click", closeModal);

if ($("authModal")) {
  $("authModal").addEventListener("click", (event) => {
    if (event.target === $("authModal")) closeModal();
  });
}

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});

document.querySelectorAll("[data-auth]").forEach((button) => {
  button.addEventListener("click", () => {
    showTab(button.dataset.auth);
    openModal();
  });
});

document.querySelectorAll("[data-service]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedService = button.dataset.service || "";
    showTab("customer");
    openModal();
  });
});

showTab("customer");

// OTP input rows are hidden until OTP is requested.
["customerOtp", "partnerOtp"].forEach((id) => {
  if ($(id)) $(id).parentElement.classList.add("hidden");
});
["customerVerify", "partnerVerify"].forEach((id) => {
  if ($(id)) $(id).disabled = true;
});

// CUSTOMER: send OTP
if ($("customerSend")) {
  $("customerSend").addEventListener("click", async () => {
    try {
      const phone = normalizePhone($("customerPhone")?.value);
      if (!/^\+\d{10,15}$/.test(phone)) {
        throw new Error("Sahi mobile number enter karein. India ke liye 10 digit number chalega.");
      }
      await request("/api/auth/send-otp", { phone });
      $("customerOtp").parentElement.classList.remove("hidden");
      $("customerVerify").disabled = false;
      message("OTP SMS par bhej diya gaya hai.");
    } catch (error) {
      message(error.message, true);
    }
  });
}

// CUSTOMER: verify OTP and login
if ($("customerVerify")) {
  $("customerVerify").addEventListener("click", async () => {
    try {
      const phone = normalizePhone($("customerPhone")?.value);
      const otp = $("customerOtp")?.value.trim();
      const name = $("customerName")?.value.trim() || "";
      if (!/^\+\d{10,15}$/.test(phone) || !otp) {
        throw new Error("Mobile number aur OTP zaroori hain.");
      }
      const data = await request("/api/auth/verify-otp", {
        phone, otp, name, role: "customer"
      });
      if (!data.token) {
        throw new Error(data.message || "Customer login complete nahi hua.");
      }
      await saveLogin(data);
    } catch (error) {
      message(error.message, true);
    }
  });
}

// PARTNER: send OTP
if ($("partnerSend")) {
  $("partnerSend").addEventListener("click", async () => {
    try {
      const name = $("partnerName")?.value.trim();
      const phone = normalizePhone($("partnerPhone")?.value);
      const city = $("partnerCity")?.value.trim();
      if (!name) throw new Error("Apna full name enter karein.");
      if (!city) throw new Error("City / district enter karein.");
      if (!/^\+\d{10,15}$/.test(phone)) {
        throw new Error("Sahi mobile number enter karein.");
      }
      await request("/api/auth/send-otp", { phone });
      $("partnerOtp").parentElement.classList.remove("hidden");
      $("partnerVerify").disabled = false;
      message("Partner OTP SMS par bhej diya gaya hai.");
    } catch (error) {
      message(error.message, true);
    }
  });
}

// PARTNER: verify OTP and submit application
if ($("partnerVerify")) {
  $("partnerVerify").addEventListener("click", async () => {
    try {
      if (!$("partnerAgreement")?.checked) {
        throw new Error("Draft Partner Agreement read karke checkbox select karein.");
      }
      const phone = normalizePhone($("partnerPhone")?.value);
      const otp = $("partnerOtp")?.value.trim();
      const name = $("partnerName")?.value.trim();
      const city = $("partnerCity")?.value.trim();
      if (!phone || !otp || !name || !city) {
        throw new Error("Name, mobile, city aur OTP complete karein.");
      }

      // Current backend accepts name, phone, city and role.
      // Skills field is collected in the page but needs a backend update to save.
      const data = await request("/api/auth/verify-otp", {
        phone, otp, name, city, role: "partner"
      });

      if (data.pending) {
        message(data.message || "Application submit ho gayi hai. Admin approval ka wait karein.");
        return;
      }
      if (!data.token) {
        throw new Error(data.message || "Partner registration complete nahi hua.");
      }
      await saveLogin(data);
    } catch (error) {
      message(error.message, true);
    }
  });
}

// PARTNER AGREEMENT - discussion draft only
if ($("agreementText")) {
  $("agreementText").textContent =
`CAMERA BOOKING - DRAFT PARTNER AGREEMENT

Business Name: CAMERA BOOKING
Business Address: Bhowraguri Satbil Pt-2, Kokrajhar, Assam, India.

1. The partner may provide photography, videography or other approved creative services as mutually agreed for each assignment.
2. The partner must provide accurate personal, contact, skill and payment details.
3. Every new partner application is subject to CAMERA BOOKING admin approval.
4. Work assignments, service details, dates, locations and payment must be agreed before each assignment.
5. Partners must respect customer privacy, obtain appropriate permissions and behave professionally.
6. No assignment or income is guaranteed. Work depends on customer requirements and availability.
7. Cancellations, payment disputes or other issues should be reported to CAMERA BOOKING promptly.
8. Both parties should review and agree to the final terms before signing.

Partner Name: ______________________
Partner Mobile: ____________________
Partner City: _______________________
Partner Signature: __________________
Business Representative: _____________
Date: ______________________________

IMPORTANT: This is a discussion draft, not a final legal contract. Have an Indian lawyer review it before signing or notarisation.`;
}

// ADMIN LOGIN
if ($("adminLogin")) {
  $("adminLogin").addEventListener("click", async () => {
    try {
      const email = $("adminEmail")?.value.trim();
      const password = $("adminPassword")?.value;
      if (!email || !password) {
        throw new Error("Admin email aur password enter karein.");
      }
      const data = await request("/api/auth/admin-login", { email, password });
      if (!data.token) throw new Error(data.message || "Admin login failed.");
      await saveLogin(data);
    } catch (error) {
      message(error.message, true);
    }
  });
}

async function saveLogin(data) {
  token = data.token;
  localStorage.setItem("cb_token", token);
  me = data.user || null;
  closeModal();
  await dashboard();
}

if ($("logoutBtn")) {
  $("logoutBtn").addEventListener("click", () => {
    token = "";
    me = null;
    localStorage.removeItem("cb_token");
    if ($("dashboard")) $("dashboard").classList.add("hidden");
    closeModal();
    toast("Logged out successfully.");
  });
}

function showDashboard(title, account) {
  if (!$("dashboard")) return;
  $("dashboard").classList.remove("hidden");
  $("dashboardTitle").textContent = title;
  $("accountInfo").textContent = account || "";
  ["customerDash", "partnerDash", "adminDash"].forEach((id) => {
    if ($(id)) $(id).classList.add("hidden");
  });
  $("dashboard").scrollIntoView({ behavior: "smooth" });
}

async function dashboard() {
  try {
    const data = await request("/api/me", null, "GET");
    me = data.user || data;
    if (me.role === "customer") await customerDashboard();
    else if (me.role === "partner") await partnerDashboard();
    else if (me.role === "admin") await adminDashboard();
    else throw new Error("Account role not recognized.");
  } catch (error) {
    token = "";
    me = null;
    localStorage.removeItem("cb_token");
    toast(error.message);
  }
}

// CUSTOMER DASHBOARD
async function customerDashboard() {
  showDashboard(
    "Customer Dashboard",
    "Welcome " + (me.name || "") + " · " + (me.phone || "")
  );
  $("customerDash").classList.remove("hidden");

  if (selectedService && $("bookingService")) {
    $("bookingService").value = selectedService;
  }
  if ($("bookingDate")) {
    $("bookingDate").min = new Date().toISOString().slice(0, 10);
  }

  if ($("createBooking")) {
    $("createBooking").onclick = async () => {
      try {
        const eventDate = $("bookingDate")?.value;
        const city = $("bookingCity")?.value.trim();
        const venue = $("bookingVenue")?.value.trim();
        if (!eventDate) throw new Error("Event date select karein.");
        if (!city) throw new Error("City / district enter karein.");
        if (!venue) throw new Error("Venue / location enter karein.");

        await request("/api/bookings", {
          service: $("bookingService")?.value,
          city,
          venue,
          eventDate,
          customerName: me.name || "",
          notes: $("bookingNotes")?.value.trim() || ""
        });
        toast("Booking request submit ho gayi.");
        if ($("bookingNotes")) $("bookingNotes").value = "";
        await loadCustomerBookings();
      } catch (error) {
        toast(error.message);
      }
    };
  }
  await loadCustomerBookings();
}

async function loadCustomerBookings() {
  try {
    const data = await request("/api/bookings/mine", null, "GET");
    const bookings = Array.isArray(data) ? data : (data.bookings || []);
    $("myBookings").innerHTML = bookings.map((booking) => `
      <div class="data-row">
        <strong>#${escapeHtml(booking.id)} - ${escapeHtml(booking.service)}</strong>
        <p>${escapeHtml(booking.city)} · ${escapeHtml(booking.event_date || booking.eventDate || "")}</p>
        <span class="status">${escapeHtml(booking.status)}</span>
      </div>
    `).join("") || "Abhi koi booking nahi hai.";
  } catch (error) {
    $("myBookings").textContent = error.message;
  }
}

// PARTNER DASHBOARD
async function partnerDashboard() {
  showDashboard(
    "Partner Dashboard",
    "Welcome " + (me.name || "") + " · " + (me.phone || "")
  );
  $("partnerDash").classList.remove("hidden");
  $("partnerStatus").textContent = "Account status: " + (me.status || "Pending");

  if ($("partnerCertificate")) {
    $("partnerCertificate").classList.toggle("hidden", me.status !== "approved");
  }

  if (me.status !== "approved") {
    $("partnerBookings").textContent = "Admin approval ke baad assigned bookings yahan dikhenge.";
    $("partnerPayments").textContent = "Admin approval ke baad payment records yahan dikhenge.";
    return;
  }

  try {
    const data = await request("/api/partner/bookings", null, "GET");
    const bookings = Array.isArray(data) ? data : (data.bookings || []);
    $("partnerBookings").innerHTML = bookings.map((booking) => `
      <div class="data-row">
        <strong>#${escapeHtml(booking.id)} · ${escapeHtml(booking.service)}</strong>
        <p>${escapeHtml(booking.city)} · ${escapeHtml(booking.status)}</p>
      </div>
    `).join("") || "Abhi koi assigned booking nahi hai.";
  } catch (error) {
    $("partnerBookings").textContent = error.message;
  }

  try {
    const data = await request("/api/partner/payments", null, "GET");
    const payments = Array.isArray(data) ? data : (data.payments || []);
    $("partnerPayments").innerHTML = payments.map((payment) => `
      <div class="data-row">
        ₹${escapeHtml(payment.amount)} · Booking #${escapeHtml(payment.booking_id || payment.bookingId)}
      </div>
    `).join("") || "Abhi payment record nahi hai.";
  } catch (error) {
    $("partnerPayments").textContent = error.message;
  }
}

// PARTNER CERTIFICATE - printable acknowledgement, not an official
// backend-issued certificate or independently verifiable credential.
if ($("partnerCertificate")) {
  $("partnerCertificate").addEventListener("click", () => {
    if (!me || me.status !== "approved") {
      toast("Certificate print karne se pehle admin approval zaroori hai.");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast("Print page kholne ke liye browser popup allow karein.");
      return;
    }
    printWindow.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>CAMERA BOOKING Partner Approval</title>
<style>
body{font-family:Arial,sans-serif;padding:35px;color:#222;text-align:center}
.certificate{border:8px double #c49b48;padding:45px 25px;max-width:850px;margin:auto}
h1{color:#a77b25;letter-spacing:3px}h2{margin-top:35px}
p{line-height:1.8}.note{font-size:12px;color:#666;margin-top:35px}
</style></head><body><div class="certificate">
<h1>CAMERA BOOKING</h1><h2>PARTNER APPROVAL ACKNOWLEDGEMENT</h2>
<p>This page records that the following account is marked approved in the website:</p>
<h2>${escapeHtml(me.name || "Partner")}</h2>
<p>Mobile: ${escapeHtml(me.phone || "")}</p><p>City: ${escapeHtml(me.city || "")}</p>
<p>Business: CAMERA BOOKING</p>
<p>Business Address: Bhowraguri Satbil Pt-2, Kokrajhar, Assam, India.</p>
<p>Authorized Business Representative</p><p>CAMERA BOOKING</p>
<p class="note">Website-generated print acknowledgement only. It is not a government certificate, legal licence, or independently verifiable credential.</p>
</div><script>window.onload=function(){window.print();};<\/script></body></html>`);
    printWindow.document.close();
  });
}

// ADMIN DASHBOARD
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
    const partnerData = await request("/api/admin/partners", null, "GET");
    const partners = Array.isArray(partnerData) ? partnerData : (partnerData.partners || []);

    $("adminPartners").innerHTML = partners.map((partner) => `
      <div class="data-row">
        <strong>#${escapeHtml(partner.id)} · ${escapeHtml(partner.name)}</strong>
        <p>${escapeHtml(partner.city || "")} · ${escapeHtml(partner.phone || "")}</p>
        <p>Status: <span class="status">${escapeHtml(partner.status)}</span></p>
        <div class="action-row">
          <button class="btn" data-partner="${escapeHtml(partner.id)}" data-status="approved">Approve</button>
          <button class="btn outline" data-partner="${escapeHtml(partner.id)}" data-status="rejected">Reject</button>
        </div>
      </div>
    `).join("") || "No partner applications.";

    document.querySelectorAll("[data-partner]").forEach((button) => {
      button.onclick = async () => {
        try {
          await request(
            "/api/admin/partners/" + encodeURIComponent(button.dataset.partner),
            { status: button.dataset.status },
            "PATCH"
          );
          toast("Partner status update ho gaya.");
          await loadAdminData();
        } catch (error) {
          toast(error.message);
        }
      };
    });

    const bookingData = await request("/api/admin/bookings", null, "GET");
    const bookings = Array.isArray(bookingData) ? bookingData : (bookingData.bookings || []);

    $("adminBookings").innerHTML = bookings.map((booking) => `
      <div class="data-row">
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

    bookings.forEach((booking) => {
      const statusSelect = $("status-" + booking.id);
      if (statusSelect) statusSelect.value = booking.status || "pending";
      const partnerInput = $("partner-" + booking.id);
      if (partnerInput && booking.partner_id) partnerInput.value = booking.partner_id;
    });

    document.querySelectorAll("[data-booking]").forEach((button) => {
      button.onclick = async () => {
        try {
          const id = button.dataset.booking;
          const partnerId = $("partner-" + id)?.value.trim();
          await request("/api/admin/bookings/" + encodeURIComponent(id), {
            status: $("status-" + id)?.value,
            partnerId: partnerId || null
          }, "PATCH");
          toast("Booking update ho gayi.");
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

// Restore an existing session after page refresh.
if (token) {
  dashboard();
}
