
// ======================================
// CAMERA BOOKING - COMPLETE WEBSITE APP
// ======================================

const API = (
  window.CAMERA_BOOKING_API ||
  "https://camera-booking-backend.onrender.com"
).replace(/\/$/, "");

const $ = id => document.getElementById(id);

let token = localStorage.getItem("cb_token") || "";
let me = null;
let selectedService = null;
let allBookings = [];
let allPartners = [];

// ======================================
// SERVICE CATALOGUE
// Prices are confirmed by admin on enquiry.
// ======================================

const SERVICES = [
  {id:1,name:"Wedding Photography",category:"wedding",description:"Professional wedding photography coverage."},
  {id:2,name:"Wedding Videography",category:"wedding",description:"Wedding video coverage and cinematic moments."},
  {id:3,name:"Pre-Wedding Shoot",category:"wedding",description:"Creative pre-wedding photography."},
  {id:4,name:"Cinematic Wedding Film",category:"wedding",description:"Cinematic wedding film production."},
  {id:5,name:"Engagement Photography",category:"wedding",description:"Engagement ceremony photography."},
  {id:6,name:"Haldi Photography",category:"wedding",description:"Haldi ceremony coverage."},
  {id:7,name:"Mehndi Photography",category:"wedding",description:"Mehndi ceremony photography."},
  {id:8,name:"Reception Photography",category:"wedding",description:"Reception event photography."},
  {id:9,name:"Birthday Photography",category:"event",description:"Birthday party photography."},
  {id:10,name:"Birthday Videography",category:"event",description:"Birthday video coverage."},
  {id:11,name:"Event Photography",category:"event",description:"Professional event photography."},
  {id:12,name:"Event Videography",category:"event",description:"Complete event video coverage."},
  {id:13,name:"Corporate Photography",category:"event",description:"Corporate event photography."},
  {id:14,name:"Conference Videography",category:"event",description:"Conference and seminar video coverage."},
  {id:15,name:"School Event Photography",category:"event",description:"School and college event coverage."},
  {id:16,name:"Cultural Programme",category:"event",description:"Cultural programme photography and video."},
  {id:17,name:"Music Video Production",category:"video",description:"Music video planning and production."},
  {id:18,name:"Short Film Production",category:"video",description:"Short film shooting and production."},
  {id:19,name:"Documentary Film",category:"video",description:"Documentary video production."},
  {id:20,name:"YouTube Video Shooting",category:"video",description:"YouTube content shooting."},
  {id:21,name:"Reels Video Shooting",category:"video",description:"Short-form social media video."},
  {id:22,name:"Promotional Video",category:"video",description:"Business and product promotional video."},
  {id:23,name:"Drone Videography",category:"video",description:"Aerial video coverage where legally permitted."},
  {id:24,name:"Live Streaming",category:"video",description:"Event live-streaming service."},
  {id:25,name:"Portrait Photography",category:"portrait",description:"Professional portrait session."},
  {id:26,name:"Model Portfolio",category:"portrait",description:"Model portfolio photography."},
  {id:27,name:"Fashion Photography",category:"portrait",description:"Fashion and clothing photography."},
  {id:28,name:"Product Photography",category:"portrait",description:"Product photos for online and offline business."},
  {id:29,name:"Family Photography",category:"portrait",description:"Family photoshoot."},
  {id:30,name:"Couple Photoshoot",category:"portrait",description:"Creative couple photography."},
  {id:31,name:"Maternity Photography",category:"portrait",description:"Maternity photoshoot."},
  {id:32,name:"Baby Photography",category:"portrait",description:"Baby and children photography."},
  {id:33,name:"Makeup Artist Booking",category:"talent",description:"Makeup artist enquiry and booking."},
  {id:34,name:"Bridal Makeup",category:"talent",description:"Bridal makeup artist enquiry."},
  {id:35,name:"Hair Stylist Booking",category:"talent",description:"Professional hair stylist enquiry."},
  {id:36,name:"Actor / Actress Enquiry",category:"talent",description:"Acting and casting enquiry."},
  {id:37,name:"Model Enquiry",category:"talent",description:"Model and portfolio enquiry."},
  {id:38,name:"Anchor / Host Booking",category:"talent",description:"Event anchor and host enquiry."},
  {id:39,name:"Dancer Booking",category:"talent",description:"Professional dancer enquiry."},
  {id:40,name:"Photographer Booking",category:"crew",description:"Professional photographer assignment."},
  {id:41,name:"Videographer Booking",category:"crew",description:"Professional videographer assignment."},
  {id:42,name:"Cinematographer Booking",category:"crew",description:"Cinematographer assignment."},
  {id:43,name:"Camera Assistant",category:"crew",description:"Camera assistant for shoots."},
  {id:44,name:"Video Editor",category:"crew",description:"Professional video editing enquiry."},
  {id:45,name:"Photo Editing",category:"crew",description:"Photo editing and retouching."},
  {id:46,name:"Album Design",category:"crew",description:"Wedding and event album design."},
  {id:47,name:"Wedding Album Printing",category:"crew",description:"Printed wedding album enquiry."},
  {id:48,name:"Photo Frame",category:"crew",description:"Custom photo frame enquiry."}
];

// ======================================
// COMMON HELPERS
// ======================================

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
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
  phone = String(phone || "").replace(/\s+/g, "");

  if (/^\d{10}$/.test(phone)) return "+91" + phone;
  if (/^91\d{10}$/.test(phone)) return "+" + phone;

  return phone;
}

function getList(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Not available";

  return new Intl.NumberFormat("en-IN", {
    style:"currency",
    currency:"INR",
    maximumFractionDigits:2
  }).format(amount);
}

async function request(path, body = null, method = "POST") {
  const response = await fetch(API + path, {
    method,
    headers: {
      "Content-Type":"application/json",
      ...(token ? {Authorization:"Bearer " + token} : {})
    },
    ...(body !== null ? {body:JSON.stringify(body)} : {})
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      data.detail ||
      "Server connection failed."
    );
  }

  return data;
}

// ======================================
// MODAL
// ======================================

function openModal() {
  $("authModal")?.classList.remove("hidden");
}

function closeModal() {
  $("authModal")?.classList.add("hidden");
}

$("closeModal")?.addEventListener("click", closeModal);

$("authModal")?.addEventListener("click", event => {
  if (event.target === $("authModal")) closeModal();
});

// ======================================
// LOGIN TABS
// ======================================

function showTab(tab) {
  ["customer","partner","admin"].forEach(name => {
    $(name + "Panel")?.classList.toggle("hidden", name !== tab);
  });

  document.querySelectorAll("[data-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  if ($("authTitle")) {
    $("authTitle").textContent =
      tab === "customer" ? "Customer Login / Register" :
      tab === "partner" ? "Partner Registration" :
      "Admin Login";
  }

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
    selectService(button.dataset.service);
    showTab("customer");
    openModal();
  });
});

showTab("customer");

// ======================================
// SERVICE CATALOGUE DISPLAY
// ======================================

function renderServices(list = SERVICES) {
  const grid = $("serviceCatalogGrid");
  if (!grid) return;

  grid.innerHTML = list.map(service => `
    <article class="card service-card">
      <div class="service-card-content">
        <span class="status">${escapeHtml(service.category)}</span>
        <h3>${escapeHtml(service.name)}</h3>
        <p>${escapeHtml(service.description)}</p>
        <p class="service-price">Price: Confirm with admin</p>
        <button class="btn" data-catalog-service="${service.id}">
          Select Service
        </button>
      </div>
    </article>
  `).join("") || "<p>No services found.</p>";

  grid.querySelectorAll("[data-catalog-service]").forEach(button => {
    button.addEventListener("click", () => {
      selectService(button.dataset.catalogService);
    });
  });
}

function selectService(id) {
  selectedService = SERVICES.find(
    service => String(service.id) === String(id)
  ) || SERVICES.find(
    service => service.name.toLowerCase() === String(id).toLowerCase()
  ) || null;

  if (!selectedService) {
    selectedService = {
      id:0,
      name:String(id),
      description:"Selected service"
    };
  }

  if ($("selectedServiceName")) {
    $("selectedServiceName").textContent = selectedService.name;
  }

  if ($("selectedServiceDescription")) {
    $("selectedServiceDescription").textContent =
      selectedService.description || "Service selected.";
  }

  if ($("selectedServicePrice")) {
    $("selectedServicePrice").textContent = "Price confirmed by admin";
  }

  if ($("bookingService")) {
    $("bookingService").value = selectedService.name;
  }

  $("selectedServicePanel")?.classList.remove("hidden");
  $("bookingFormPanel")?.classList.remove("hidden");

  if (!token) {
    showTab("customer");
    openModal();
    message("Login first to submit your booking.");
    return;
  }

  $("bookingFormPanel")?.scrollIntoView({behavior:"smooth"});
}

function filterServices() {
  const search = ($("serviceSearch")?.value || "").toLowerCase();
  const activeFilter = document.querySelector(
    "#serviceFilters [data-category].active"
  );

  const category = activeFilter?.dataset.category || "all";

  const filtered = SERVICES.filter(service => {
    const matchesSearch =
      service.name.toLowerCase().includes(search) ||
      service.description.toLowerCase().includes(search);

    const matchesCategory =
      category === "all" || service.category === category;

    return matchesSearch && matchesCategory;
  });

  renderServices(filtered);
}

$("serviceSearch")?.addEventListener("input", filterServices);

document.querySelectorAll("#serviceFilters [data-category]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#serviceFilters [data-category]").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    filterServices();
  });
});

renderServices();

// ======================================
// CUSTOMER LOGIN - NO OTP
// ======================================

if ($("customerContinue")) {
  $("customerContinue").onclick = async () => {
    const button = $("customerContinue");

    try {
      const name = $("customerName").value.trim();
      const phone = normalizePhone($("customerPhone").value.trim());

      if (name.length < 2) {
        throw new Error("Enter your full name.");
      }

      if (!/^\+91\d{10}$/.test(phone)) {
        throw new Error("Enter a valid 10 digit Indian mobile number.");
      }

      button.disabled = true;
      button.textContent = "Please wait...";

      const data = await request("/api/auth/customer-register", {
        name,
        phone,
        role:"customer"
      });

      if (!data.token) {
        throw new Error(data.message || "Customer login failed.");
      }

      await saveLogin(data);

    } catch (error) {
      message(error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "Continue";
    }
  };
}

// ======================================
// PARTNER AGREEMENT
// ======================================

if ($("agreementText")) {
  $("agreementText").textContent =
`CAMERA BOOKING - DRAFT PARTNER AGREEMENT

Business Name: CAMERA BOOKING

Business Address:
Bhowraguri Satbil Pt-2,
Kokrajhar, Assam, India.

1. The partner agrees to provide approved photography, videography or creative services.

2. The partner must provide accurate personal, contact and skill details.

3. Every partner application is subject to CAMERA BOOKING admin approval.

4. Work assignments, service details, dates, locations and payment must be agreed before each assignment.

5. Partners must respect customer privacy and obtain appropriate permissions.

6. No assignment or income is guaranteed. Work depends on customer requirements and availability.

7. Any cancellation, payment dispute or other issue should be reported to CAMERA BOOKING.

8. Both parties should agree on final terms before signing.

Partner Name: ______________________
Partner Mobile: ____________________
Partner City: _______________________
Partner Signature: __________________

Business Representative: _____________
Date: ______________________________

IMPORTANT:
This is a discussion draft, not a final legal contract.
Have an Indian lawyer review it before signing.`;
}

// ======================================
// PARTNER REGISTRATION
// ======================================

if ($("partnerRegister")) {
  $("partnerRegister").onclick = async () => {
    const button = $("partnerRegister");

    try {
      const name = $("partnerName").value.trim();
      const email = $("partnerEmail").value.trim().toLowerCase();
      const phone = normalizePhone($("partnerPhone").value.trim());
      const city = $("partnerCity").value.trim();
      const skills = $("partnerSkills").value.trim();

      if (name.length < 2) throw new Error("Enter your full name.");

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Enter a valid email address.");
      }

      if (!/^\+91\d{10}$/.test(phone)) {
        throw new Error("Enter a valid 10 digit mobile number.");
      }

      if (!city) throw new Error("Enter your city or district.");
      if (!skills) throw new Error("Enter your photography / videography skills.");

      if (!$("partnerAgreement")?.checked) {
        throw new Error("Please accept the partner agreement.");
      }

      button.disabled = true;
      button.textContent = "Submitting...";

      const data = await request("/api/auth/partner-register", {
        name,
        email,
        phone,
        city,
        skills,
        role:"partner"
      });

      message(
        data.message ||
        "Application submitted. Admin approval is required before partner access."
      );

    } catch (error) {
      message(error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "Register & Verify Email";
    }
  };
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
        throw new Error("Enter admin email and password.");
      }

      const data = await request("/api/auth/admin-login", {
        email,
        password
      });

      if (!data.token) throw new Error("Admin login failed.");

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
    selectedService = null;

    localStorage.removeItem("cb_token");

    $("dashboard")?.classList.add("hidden");
    $("publicWebsite")?.classList.remove("hidden");

    closeModal();
    window.scrollTo({top:0,behavior:"smooth"});

    toast("Logged out successfully.");
  };
}

// ======================================
// DASHBOARD COMMON
// ======================================

function showDashboard(title, account) {
  $("publicWebsite")?.classList.add("hidden");
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

  $("dashboard")?.scrollIntoView({behavior:"smooth"});
}

// ======================================
// DASHBOARD LOGIN CHECK
// ======================================

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

    $("dashboard")?.classList.add("hidden");
    $("publicWebsite")?.classList.remove("hidden");

    toast(error.message);
  }
}

// ======================================
// CUSTOMER DASHBOARD
// ======================================

async function customerDashboard() {
  showDashboard(
    "Customer Dashboard",
    "Welcome " + (me.name || "") + " · " + (me.phone || "")
  );

  $("customerDash")?.classList.remove("hidden");

  renderServices();

  if ($("bookingDate")) {
    const today = new Date();
    const localToday = new Date(
      today.getTime() - today.getTimezoneOffset() * 60000
    ).toISOString().slice(0,10);

    $("bookingDate").min = localToday;
  }

  if (selectedService && $("bookingService")) {
    $("bookingService").value = selectedService.name;
  }

  updatePriceSummary();

  if ($("createBooking")) {
    $("createBooking").onclick = submitBooking;
  }

  await loadCustomerBookings();
}

// ======================================
// PRICE SUMMARY
// ======================================

function updatePriceSummary() {
  // Actual service prices and discount calculations must come
  // from the backend
