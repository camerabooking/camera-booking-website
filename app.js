// ======================================
// CAMERA BOOKING - WEBSITE JAVASCRIPT
// ======================================

const API = (
  window.CAMERA_BOOKING_API ||
  "https://camera-booking-backend.onrender.com"
).replace(/\/$/, "");

const $ = id => document.getElementById(id);

let token = localStorage.getItem("cb_token") || "";
let me = null;
let selectedService = "";


// ======================================
// COMMON FUNCTIONS
// ======================================

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
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
    "background:#222;color:white;padding:13px 20px;" +
    "border:1px solid #d6b36a;border-radius:8px;" +
    "z-index:99999;max-width:90%;text-align:center;";

  clearTimeout(window.cbToastTimer);

  window.cbToastTimer = setTimeout(() => {
    el.remove();
  }, 3500);
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
  phone = phone.replace(/\s+/g, "");

  if (/^\d{10}$/.test(phone)) {
    return "+91" + phone;
  }

  if (/^91\d{10}$/.test(phone)) {
    return "+" + phone;
  }

  return phone;
}

async function request(path, body = null, method = "POST") {
  const response = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? {
        Authorization: "Bearer " + token
      } : {})
    },
    ...(body !== null ? {
      body: JSON.stringify(body)
    } : {})
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      data.detail ||
      "Server se connection nahi ho paya."
    );
  }

  return data;
}

function getList(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data[key])) return data[key];
  return [];
}


// ======================================
// LOGIN MODAL
// ======================================

function openModal() {
  $("authModal")?.classList.remove("hidden");
}

function closeModal() {
  $("authModal")?.classList.add("hidden");
}

$("closeModal")?.addEventListener("click", closeModal);

$("authModal")?.addEventListener("click", event => {
  if (event.target === $("authModal")) {
    closeModal();
  }
});


// ======================================
// CUSTOMER / PARTNER / ADMIN TABS
// ======================================

function showTab(tab) {
  $("customerPanel")?.classList.toggle(
    "hidden",
    tab !== "customer"
  );

  $("partnerPanel")?.classList.toggle(
    "hidden",
    tab !== "partner"
  );

  $("adminPanel")?.classList.toggle(
    "hidden",
    tab !== "admin"
  );

  document.querySelectorAll("[data-tab]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.tab === tab
    );
  });

  if ($("authTitle")) {
    $("authTitle").textContent =
      tab === "customer"
        ? "Customer Login / Register"
        : tab === "partner"
        ? "Partner Registration"
        : "Admin Login";
  }

  message("");
}

document.querySelectorAll("[data-tab]").forEach(button => {
  button.addEventListener("click", () => {
    showTab(button.dataset.tab);
  });
});

document.querySelectorAll("[data-auth]").forEach(button => {
  button.addEventListener("click", () => {
    showTab(button.dataset.auth);
    openModal();
  });
});

document.querySelectorAll("[data-service]").forEach(button => {
  button.addEventListener("click", () => {
    selectedService = button.dataset.service || "";
    showTab("customer");
    openModal();
  });
});

showTab("customer");


// ======================================
// CUSTOMER OTP LOGIN
// ======================================

if ($("customerOtp")) {
  $("customerOtp").parentElement.classList.add("hidden");
}

if ($("customerVerify")) {
  $("customerVerify").disabled = true;
}

if ($("customerSend")) {
  $("customerSend").onclick = async () => {
    try {
      const phone = normalizePhone(
        $("customerPhone").value.trim()
      );

      if (!/^\+91\d{10}$/.test(phone)) {
        throw new Error(
          "Sahi 10 digit Indian mobile number enter karein."
        );
      }

      await request("/api/auth/send-otp", {
        phone
      });

      $("customerOtp").parentElement.classList.remove("hidden");
      $("customerVerify").disabled = false;

      message("OTP SMS par bhej diya gaya hai.");

    } catch (error) {
      message(error.message, true);
    }
  };
}

if ($("customerVerify")) {
  $("customerVerify").onclick = async () => {
    try {
      const phone = normalizePhone(
        $("customerPhone").value.trim()
      );

      const otp = $("customerOtp").value.trim();
      const name = $("customerName").value.trim();

      if (!/^\d{6}$/.test(otp)) {
        throw new Error("6 digit OTP enter karein.");
      }

      const data = await request("/api/auth/verify-otp", {
        phone,
        otp,
        name,
        role: "customer"
      });

      if (!data.token) {
        throw new Error(
          data.message || "Customer login complete nahi hua."
        );
      }

      await saveLogin(data);

    } catch (error) {
      message(error.message, true);
    }
  };
}


// ======================================
// PARTNER REGISTRATION
// ======================================

if ($("partnerOtp")) {
  $("partnerOtp").parentElement.classList.add("hidden");
}

if ($("partnerVerify")) {
  $("partnerVerify").disabled = true;
}

if ($("partnerSend")) {
  $("partnerSend").onclick = async () => {
    try {
      const name = $("partnerName").value.trim();
      const phone = normalizePhone(
        $("partnerPhone").value.trim()
      );
      const city = $("partnerCity").value.trim();

      if (!name) {
        throw new Error("Apna full name enter karein.");
      }

      if (!city) {
        throw new Error("City / district enter karein.");
      }

      if (!/^\+91\d{10}$/.test(phone)) {
        throw new Error("Sahi 10 digit mobile number enter karein.");
      }

      await request("/api/auth/send-otp", {
        phone
      });

      $("partnerOtp").parentElement.classList.remove("hidden");
      $("partnerVerify").disabled = false;

      message("Partner OTP SMS par bhej diya gaya hai.");

    } catch (error) {
      message(error.message, true);
    }
  };
}

if ($("partnerVerify")) {
  $("partnerVerify").onclick = async () => {
    try {
      if (!$("partnerAgreement").checked) {
        throw new Error(
          "Partner Agreement read karke agree karein."
        );
      }

      const phone = normalizePhone(
        $("partnerPhone").value.trim()
      );

      const otp = $("partnerOtp").value.trim();

      if (!/^\d{6}$/.test(otp)) {
        throw new Error("6 digit OTP enter karein.");
      }

      const data = await request("/api/auth/verify-otp", {
        phone,
        otp,
        name: $("partnerName").value.trim(),
        city: $("partnerCity").value.trim(),
        role: "partner"
      });

      if (data.pending) {
        message(
          data.message ||
          "Partner application submit ho gayi hai. Admin approval ka wait karein."
        );
        return;
      }

      if (!data.token) {
        throw new Error(
          data.message || "Partner registration complete nahi hua."
        );
      }

      await saveLogin(data);

    } catch (error) {
      message(error.message, true);
    }
  };
}


// ======================================
// PARTNER AGREEMENT DRAFT
// ======================================

if ($("agreementText")) {
  $("agreementText").textContent =
`CAMERA BOOKING - DRAFT PARTNER AGREEMENT

Business Name: CAMERA BOOKING

Business Address:
Bhowraguri Satbil Pt-2,
Kokrajhar, Assam, India.

1. The partner agrees to provide photography, videography or other approved creative services as mutually agreed for each assignment.

2. The partner must provide accurate personal, contact, skill and payment details.

3. Every new partner application is subject to CAMERA BOOKING admin approval.

4. Work assignments, service details, dates, locations and payment must be agreed before each assignment.

5. Partners must respect customer privacy and obtain appropriate permissions.

6. No assignment or income is guaranteed. Work depends on customer requirements and availability.

7. Any cancellation, payment dispute or other issue should be reported to CAMERA BOOKING.

8. Both parties should discuss and agree on the final terms before signing.

Partner Name: ______________________

Partner Mobile: ____________________

Partner City: _______________________

Partner Signature: __________________

Business Representative: _____________

Date: ______________________________

IMPORTANT:
This is a discussion draft, not a final legal contract.
Have an Indian lawyer review it before signing or notarisation.`;
}


// ======================================
// ADMIN LOGIN
// ======================================

if ($("adminLogin")) {
  $("adminLogin").onclick = async () => {
    try {
      const email = $("adminEmail").value.trim();
      const password = $("adminPassword").value;

      if (!email || !password) {
        throw new Error(
          "Admin email aur password enter karein."
        );
      }

      const data = await request(
        "/api/auth/admin-login",
        { email, password }
      );

      if (!data.token) {
        throw new Error("Admin login failed.");
      }

      await saveLogin(data);

    } catch (error) {
      message(error.message, true);
    }
  };
}


// ======================================
// SAVE LOGIN
// ======================================

async function saveLogin(data) {
  token = data.token;

  localStorage.setItem("cb_token", token);

  me = data.user || null;

  closeModal();

  await dashboard();
}


// ======================================
// LOGOUT
// ======================================

if ($("logoutBtn")) {
  $("logoutBtn").onclick = () => {
    token = "";
    me = null;

    localStorage.removeItem("cb_token");

    $("dashboard")?.classList.add("hidden");

    closeModal();

    toast("Logged out successfully.");
  };
}


// ======================================
// DASHBOARD COMMON
// ======================================

function showDashboard(title, account) {
  $("dashboard")?.classList.remove("hidden");

  if ($("dashboardTitle")) {
    $("dashboardTitle").textContent = title;
  }

  if ($("accountInfo")) {
    $("accountInfo").textContent = account || "";
  }

  $("customerDash")?.classList.add("hidden");
  $("partnerDash")?.classList.add("hidden");
  $("adminDash")?.classList.add("hidden");

  $("dashboard")?.scrollIntoView({
    behavior: "smooth"
  });
}


// ======================================
// CHECK LOGIN AND ACCOUNT ROLE
// ======================================

async function dashboard() {
  try {
    const data = await request(
      "/api/me",
      null,
      "GET"
    );

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


// ======================================
// CUSTOMER DASHBOARD
// ======================================

async function customerDashboard() {
  showDashboard(
    "Customer Dashboard",
    "Welcome " + (me.name || "") +
    " · " + (me.phone || "")
  );

  $("customerDash")?.classList.remove("hidden");

  if (selectedService && $("bookingService")) {
    $("bookingService").value = selectedService;
  }

  if ($("bookingDate")) {
    $("bookingDate").min =
      new Date().toISOString().slice(0, 10);
  }

  if ($("createBooking")) {
    $("createBooking").onclick = async () => {
      try {
        const eventDate = $("bookingDate").value;
        const city = $("bookingCity").value.trim();
        const venue = $("bookingVenue").value.trim();

        if (!city || !venue || !eventDate) {
          throw new Error(
            "City, venue aur event date enter karein."
          );
        }

        await request("/api/bookings", {
          service: $("bookingService").value,
          city,
          venue,
          eventDate,
          customerName: me.name,
          notes: $("bookingNotes").value.trim()
        });

        toast("Booking request submitted successfully.");

        $("bookingVenue").value = "";
        $("bookingNotes").value = "";

        await loadCustomerBookings();

      } catch (error) {
        toast(error.message);
      }
    };
  }

  await loadCustomerBookings();
}


// ======================================
// CUSTOMER BOOKING LIST
// ======================================

async function loadCustomerBookings() {
  try {
    const data = await request(
      "/api/bookings/mine",
      null,
      "GET"
    );

    const bookings = getList(data, "bookings");

    if (!$("myBookings")) return;

    $("myBookings").innerHTML =
      bookings.map(booking => `
        <div class="dashboard-item">
          <strong>
            #${escapeHtml(booking.id)}
            - ${escapeHtml(booking.service)}
          </strong>

          <p>
            ${escapeHtml(booking.city)}
            · ${escapeHtml(booking.event_date || booking.eventDate || "")}
          </p>

          <span class="status">
            ${escapeHtml(booking.status)}
          </span>
        </div>
      `).join("") || "Abhi koi booking nahi hai.";

  } catch (error) {
    if ($("myBookings")) {
      $("myBookings").textContent = error.message;
    }
  }
}


// ======================================
// PARTNER DASHBOARD
// ======================================

async function partnerDashboard() {
  showDashboard(
    "Partner Dashboard",
    "Welcome " + (me.name || "") +
    " · " + (me.phone || "")
  );

  $("partnerDash")?.classList.remove("hidden");

  if ($("partnerStatus")) {
    $("partnerStatus").textContent =
      "Account status: " + (me.status || "Pending");
  }

  if (me.status === "approved") {
    $("partnerCertificate")?.classList.remove("hidden");
  } else {
    $("partnerCertificate")?.classList.add("hidden");
  }

  // Assigned bookings
  try {
    const data = await request(
      "/api/partner/bookings",
      null,
      "GET"
    );

    const bookings = getList(data, "bookings");

    if ($("partnerBookings")) {
      $("partnerBookings").innerHTML =
        bookings.map(booking => `
          <div class="dashboard-item">
            <strong>
              #${escapeHtml(booking.id)}
              · ${escapeHtml(booking.service)}
            </strong>

            <p>
              ${escapeHtml(booking.city)}
              · ${escapeHtml(booking.status)}
            </p>
          </div>
        `).join("") || "Abhi koi assigned booking nahi hai.";
    }

  } catch (error) {
    if ($("partnerBookings")) {
      $("partnerBookings").textContent = error.message;
    }
  }

  // Partner payments
  try {
    const data = await request(
      "/api/partner/payments",
      null,
      "GET"
    );

    const payments = getList(data, "payments");

    if ($("partnerPayments")) {
      $("partnerPayments").innerHTML =
        payments.map(payment => `
          <div class="dashboard-item">
            ₹${escapeHtml(payment.amount)}
            · Booking #${escapeHtml(payment.booking_id)}
          </div>
        `).join("") || "Abhi payment record nahi hai.";
    }

  } catch (error) {
    if ($("partnerPayments")) {
      $("partnerPayments").textContent = error.message;
    }
  }
}


// ======================================
// PARTNER CERTIFICATE - PRINTABLE DRAFT
// ======================================

if ($("partnerCertificate")) {
  $("partnerCertificate").onclick = () => {
    if (!me || me.status !== "approved") {
      toast("Certificate ke liye admin approval zaroori hai.");
      return;
    }

    const certificateWindow = window.open("", "_blank");

    if (!certificateWindow) {
      toast("Certificate open karne ke liye popup allow karein.");
      return;
    }

    certificateWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CAMERA BOOKING Partner Certificate</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 45px;
            text-align: center;
            color: #222;
          }

          .certificate {
            border: 8px double #c49b48;
            padding: 45px 25px;
          }

          h1 {
            color: #a77b25;
            letter-spacing: 3px;
          }

          h2 {
            margin-top: 40px;
          }

          p {
            line-height: 1.8;
          }
        </style>
      </head>

      <body>
        <div class="certificate">
          <h1>CAMERA BOOKING</h1>
          <h2>PARTNER APPROVAL CERTIFICATE</h2>

          <p>This document confirms that</p>

          <h2>${escapeHtml(me.name || "Partner")}</h2>

          <p>
            has an approved partner account with CAMERA BOOKING.
          </p>

          <p>Mobile: ${escapeHtml(me.phone || "")}</p>
          <p>City: ${escapeHtml(me.city || "")}</p>

          <p>
            Business Address:
            Bhowraguri Satbil Pt-2,
            Kokrajhar, Assam, India.
          </p>

          <br><br>

          <p>Authorized Business Representative</p>
          <p>CAMERA BOOKING</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
      </html>
    `);

    certificateWindow.document.close();
  };
}


// ======================================
// ADMIN DASHBOARD
// ======================================

async function adminDashboard() {
  showDashboard(
    "Admin Dashboard",
    "Signed in as " + (me.email || me.name || "Admin")
  );

  $("adminDash")?.classList.remove("hidden");

  await loadAdminData();
}


// ======================================
// ADMIN: PARTNERS AND BOOKINGS
// ======================================

async function loadAdminData() {
  try {
    // Load partner applications
    const data = await request(
      "/api/admin/partners",
      null,
      "GET"
    );

    const partners = getList(data, "partners");

    if ($("adminPartners")) {
      $("adminPartners").innerHTML =
        partners.map(partner => `
          <div class="dashboard-item">
            <strong>
              #${escapeHtml(partner.id)}
              · ${escapeHtml(partner.name)}
            </strong>

            <p>
              ${escapeHtml(partner.city || "")}
              · ${escapeHtml(partner.phone || "")}
            </p>

            <p>
              Status: ${escapeHtml(partner.status)}
            </p>

            <div class="action-row">
              <button
                class="btn"
                data-partner="${escapeHtml(partner.id)}"
                data-status="approved">
                Approve
              </button>

              <button
                class="btn outline"
                data-partner="${escapeHtml(partner.id)}"
                data-status="rejected">
                Reject
              </button>
            </div>
          </div>
        `).join("") || "No partner applications.";
    }

    // Approve / reject partner
    document.querySelectorAll("[data-partner]").forEach(button => {
      button.onclick = async () => {
        try {
          await request(
            "/api/admin/partners/" + button.dataset.partner,
            {
              status: button.dataset.status
            },
            "PATCH"
          );

          toast("Partner status updated.");

          await loadAdminData();

        } catch (error) {
          toast(error.message);
        }
      };
    });

    // Load bookings
    const bookingData = await request(
      "/api/admin/bookings",
      null,
      "GET"
    );

    const bookings = getList(bookingData, "bookings");

    if ($("adminBookings")) {
      $("adminBookings").innerHTML =
        bookings.map(booking => `
          <div class="dashboard-item">
            <strong>
              #${escapeHtml(booking.id)}
              · ${escapeHtml(booking.service)}
            </strong>

            <p>
              ${escapeHtml(booking.city)}
              · ${escapeHtml(booking.status)}
            </p>

            <p>
              Event date:
              ${escapeHtml(booking.event_date || booking.eventDate || "")}
            </p>

            <label>
              Booking status
              <select id="status-${escapeHtml(booking.id)}">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="assigned">Assigned</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <button
              class="btn"
              data-update-booking="${escapeHtml(booking.id)}">
              Update Booking
            </button>
          </div>
        `).join("") || "No bookings found.";

      // Set current booking status in dropdown
      bookings.forEach(booking => {
        const select = $("status-" + booking.id);

        if (select) {
          select.value = booking.status || "pending";
        }
      });
    }

    // Update booking status
    document.querySelectorAll("[data-update-booking]").forEach(button => {
      button.onclick = async () => {
        try {
          const id = button.dataset.updateBooking;
          const status = $("status-" + id).value;

          await request(
            "/api/admin/bookings/" + id,
            { status },
            "PATCH"
          );

          toast("Booking status updated.");

          await loadAdminData();

        } catch (error) {
          toast(error.message);
        }
      };
    });

  } catch (error) {
    toast("Admin data: " + error.message);
  }
}


// ======================================
// AUTO LOGIN CHECK
// ======================================

if (token) {
  dashboard();
}
