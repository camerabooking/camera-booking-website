
/* =========================================
   CAMERA BOOKING - COMPLETE FRONTEND APP
   ========================================= */

(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

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

  const SERVICES = [
    ["Wedding Photography","wedding","Professional wedding photography coverage."],
    ["Wedding Videography","wedding","Wedding video coverage."],
    ["Pre-Wedding Shoot","wedding","Creative pre-wedding photography."],
    ["Cinematic Wedding Film","wedding","Cinematic wedding film production."],
    ["Engagement Photography","wedding","Engagement ceremony photography."],
    ["Haldi Photography","wedding","Haldi ceremony coverage."],
    ["Mehndi Photography","wedding","Mehndi ceremony photography."],
    ["Reception Photography","wedding","Reception event photography."],
    ["Birthday Photography","event","Birthday party photography."],
    ["Birthday Videography","event","Birthday video coverage."],
    ["Event Photography","event","Professional event photography."],
    ["Event Videography","event","Complete event video coverage."],
    ["Corporate Photography","event","Corporate event photography."],
    ["Conference Videography","event","Conference and seminar video."],
    ["School Event Photography","event","School and college event coverage."],
    ["Cultural Programme","event","Cultural programme photography."],
    ["Music Video Production","video","Music video production."],
    ["Short Film Production","video","Short film shooting and production."],
    ["Documentary Film","video","Documentary video production."],
    ["YouTube Video Shooting","video","YouTube content shooting."],
    ["Reels Video Shooting","video","Social media video shooting."],
    ["Promotional Video","video","Business promotional video."],
    ["Drone Videography","video","Aerial video where legally permitted."],
    ["Live Streaming","video","Event live streaming."],
    ["Portrait Photography","portrait","Professional portrait session."],
    ["Model Portfolio","portrait","Model portfolio photography."],
    ["Fashion Photography","portrait","Fashion photography."],
    ["Product Photography","portrait","Product photography."],
    ["Family Photography","portrait","Family photoshoot."],
    ["Couple Photoshoot","portrait","Couple photography."],
    ["Maternity Photography","portrait","Maternity photoshoot."],
    ["Baby Photography","portrait","Baby and children photography."],
    ["Makeup Artist Booking","talent","Makeup artist enquiry."],
    ["Bridal Makeup","talent","Bridal makeup artist enquiry."],
    ["Hair Stylist Booking","talent","Professional hair stylist."],
    ["Actor / Actress Enquiry","talent","Acting and casting enquiry."],
    ["Model Enquiry","talent","Model and portfolio enquiry."],
    ["Anchor / Host Booking","talent","Event anchor and host."],
    ["Dancer Booking","talent","Professional dancer enquiry."],
    ["Photographer Booking","crew","Photographer assignment."],
    ["Videographer Booking","crew","Videographer assignment."],
    ["Cinematographer Booking","crew","Cinematographer assignment."],
    ["Camera Assistant","crew","Camera assistant for shoots."],
    ["Video Editor","crew","Professional video editing."],
    ["Photo Editing","crew","Photo editing and retouching."],
    ["Album Design","crew","Wedding and event album design."],
    ["Wedding Album Printing","crew","Printed wedding album."],
    ["Photo Frame","crew","Custom photo frame."]
  ].map((item, index) => ({
    id: index + 1,
    name: item[0],
    category: item[1],
    description: item[2]
  }));

  function init() {
    bindEvents();
    renderServices();
    showTab("customer");

    if (token) {
      dashboard();
    }
  }

  /* =========================================
     COMMON HELPERS
     ========================================= */

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
      "z-index:999999;max-width:90%;text-align:center;";

    clearTimeout(window.cbToastTimer);

    window.cbToastTimer = setTimeout(() => {
      el.remove();
    }, 3500);
  }

  function message(text, error = false) {
    const el = $("authMessage");

    if (!el) {
      toast(text);
      return;
    }

    el.textContent = text;
    el.style.color = error ? "#e57373" : "#d6b36a";
  }

  function normalizePhone(value) {
    let phone = String(value || "").replace(/[\s()-]/g, "");

    if (/^\d{10}$/.test(phone)) return "+91" + phone;
    if (/^91\d{10}$/.test(phone)) return "+" + phone;

    return phone;
  }

  function phoneValid(phone) {
    return /^\+91\d{10}$/.test(phone);
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function money(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return "Not available";

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(amount);
  }

  async function request(path, body = null, method = "POST") {
    const response = await fetch(API + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {})
      },
      ...(body !== null ? { body: JSON.stringify(body) } : {})
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Server connection failed."
      );
    }

    return data;
  }

  function setButtonLoading(button, loading, normalText) {
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading ? "Please wait..." : normalText;
  }

  /* =========================================
     MODAL AND LOGIN TABS
     ========================================= */

  function openModal() {
    $("authModal")?.classList.remove("hidden");
  }

  function closeModal() {
    $("authModal")?.classList.add("hidden");
  }

  function showTab(tab) {
    ["customer", "partner", "admin"].forEach(name => {
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

  /* =========================================
     ALL WEBSITE CLICK EVENTS
     Event delegation also supports dynamic buttons.
     ========================================= */

  function bindEvents() {
    document.addEventListener("click", event => {
      const target = event.target;
       alert("CLICK EVENT WORKING");
      const close = target.closest("#closeModal");
      if (close) {
        closeModal();
        return;
      }

      if (target.id === "authModal") {
        closeModal();
        return;
      }

      const tabButton = target.closest("[data-tab]");
      if (tabButton) {
        showTab(tabButton.dataset.tab);
        return;
      }

      const authButton = target.closest("[data-auth]");
      if (authButton) {
        showTab(authButton.dataset.auth);
        openModal();
        return;
      }

      const serviceButton = target.closest("[data-service]");
      if (serviceButton) {
        selectService(serviceButton.dataset.service);
        return;
      }

      const catalogueButton = target.closest("[data-catalog-service]");
      if (catalogueButton) {
        selectService(catalogueButton.dataset.catalogService);
        return;
      }

      const categoryButton = target.closest("[data-category]");
      if (categoryButton) {
        document.querySelectorAll("#serviceFilters [data-category]")
          .forEach(button => button.classList.remove("active"));

        categoryButton.classList.add("active");
        filterServices();
        return;
      }

      const logoutButton = target.closest("#logoutBtn");
      if (logoutButton) {
        logout();
        return;
      }

      const bookingButton = target.closest("#createBooking");
      if (bookingButton) {
        submitBooking();
        return;
      }

      const approveButton = target.closest("[data-approve-partner]");
      if (approveButton) {
        updatePartnerStatus(approveButton.dataset.approvePartner, "approved");
        return;
      }

      const rejectButton = target.closest("[data-reject-partner]");
      if (rejectButton) {
        updatePartnerStatus(rejectButton.dataset.rejectPartner, "rejected");
        return;
      }

      const assignButton = target.closest("[data-update-booking]");
      if (assignButton) {
        updateBookingFromAdmin(assignButton.dataset.updateBooking);
        return;
      }

      const customerButton = target.closest("#customerContinue");
      if (customerButton) {
        customerLogin();
        return;
      }

      const partnerButton = target.closest("#partnerRegister");
      if (partnerButton) {
        partnerRegister();
        return;
      }

      const adminButton = target.closest("#adminLogin");
      if (adminButton) {
        adminLogin();
        return;
      }
    });

    $("serviceSearch")?.addEventListener("input", filterServices);

    $("customerName")?.addEventListener("keydown", event => {
      if (event.key === "Enter") customerLogin();
    });

    $("customerPhone")?.addEventListener("keydown", event => {
      if (event.key === "Enter") customerLogin();
    });

    $("partnerAgreement")?.addEventListener("change", () => {
      // Agreement checkbox is handled during registration.
    });
  }

  /* =========================================
     CUSTOMER LOGIN
     Name + mobile number only.
     ========================================= */

  async function customerLogin() {
    const button = $("customerContinue");

    try {
      const name = $("customerName")?.value.trim() || "";
      const phone = normalizePhone($("customerPhone")?.value);

      if (name.length < 2) {
        throw new Error("Enter your full name.");
      }

      if (!phoneValid(phone)) {
        throw new Error("Enter a valid 10 digit Indian mobile number.");
      }

      setButtonLoading(button, true, "Continue");

      const data = await request("/api/auth/customer-register", {
        name,
        phone
      });

      if (!data.token) {
        throw new Error("Customer login failed.");
      }

      await saveLogin(data);

    } catch (error) {
      message(error.message, true);
    } finally {
      setButtonLoading(button, false, "Continue");
    }
  }

  /* =========================================
     PARTNER AGREEMENT
     ========================================= */

  function showAgreement() {
    if (!$("agreementText")) return;

    $("agreementText").textContent =
`CAMERA BOOKING - DRAFT PARTNER AGREEMENT

Business Name: CAMERA BOOKING

Business Address:
Bhowraguri Satbil Pt-2,
Kokrajhar, Assam, India.

1. Partner agrees to provide approved photography, videography or creative services.

2. Partner must provide accurate personal, contact and skill details.

3. Every partner application requires admin approval.

4. Work assignments, dates, locations and payment must be agreed before each assignment.

5. Partners must respect customer privacy and obtain appropriate permissions.

6. No assignment or income is guaranteed.

7. Any cancellation or payment dispute should be reported to CAMERA BOOKING.

Partner Name: ______________________
Partner Mobile: ____________________
Partner City: _______________________
Partner Signature: __________________

Business Representative: _____________
Date: ______________________________

This is a draft, not a final legal contract.`;
  }

  async function partnerRegister() {
    const button = $("partnerRegister");

    try {
      const name = $("partnerName")?.value.trim() || "";
      const email = $("partnerEmail")?.value.trim().toLowerCase() || "";
      const phone = normalizePhone($("partnerPhone")?.value);
      const city = $("partnerCity")?.value.trim() || "";
      const skills = $("partnerSkills")?.value.trim() || "";

      if (name.length < 2) {
        throw new Error("Enter your full name.");
      }

      if (email && !validEmail(email)) {
        throw new Error("Enter a valid email address or leave it blank.");
      }

      if (!phoneValid(phone)) {
        throw new Error("Enter a valid 10 digit mobile number.");
      }

      if (city.length < 2) {
        throw new Error("Enter your city or district.");
      }

      if (skills.length < 2) {
        throw new Error("Enter your photography / videography skills.");
      }

      if (!$("partnerAgreement")?.checked) {
        throw new Error("Please accept the partner agreement.");
      }

      setButtonLoading(button, true, "Register");

      const data = await request("/api/auth/partner-register", {
        name,
        email,
        phone,
        city,
        skills
      });

      message(
        data.message ||
        "Application submitted. Please wait for admin approval."
      );

    } catch (error) {
      message(error.message, true);
    } finally {
      setButtonLoading(button, false, "Register");
    }
  }

  /* =========================================
     ADMIN LOGIN
     ========================================= */

  async function adminLogin() {
    const button = $("adminLogin");

    try {
      const email = $("adminEmail")?.value.trim() || "";
      const password = $("adminPassword")?.value || "";

      if (!email || !password) {
        throw new Error("Enter admin email and password.");
      }

      setButtonLoading(button, true, "Login");

      const data = await request("/api/auth/admin-login", {
        email,
        password
      });

      if (!data.token) {
        throw new Error("Admin login failed.");
      }

      await saveLogin(data);

    } catch (error) {
      message(error.message, true);
    } finally {
      setButtonLoading(button, false, "Login");
    }
  }

  /* =========================================
     LOGIN AND LOGOUT
     ========================================= */

  async function saveLogin(data) {
    token = data.token;
    localStorage.setItem("cb_token", token);

    me = data.user || null;

    closeModal();
    await dashboard();
  }

  function logout() {
    token = "";
    me = null;
    selectedService = null;

    localStorage.removeItem("cb_token");

    $("dashboard")?.classList.add("hidden");
    $("publicWebsite")?.classList.remove("hidden");

    closeModal();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    toast("Logged out successfully.");
  }

  /* =========================================
     SERVICE CATALOGUE
     ========================================= */

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
          <button type="button" class="btn"
            data-catalog-service="${service.id}">
            Select Service
          </button>
        </div>
      </article>
    `).join("") || "<p>No services found.</p>";
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

  function selectService(id) {
    selectedService =
      SERVICES.find(service => String(service.id) === String(id)) ||
      SERVICES.find(service =>
        service.name.toLowerCase() === String(id).toLowerCase()
      ) ||
      null;

    if (!selectedService) {
      toast("Service not found.");
      return;
    }

    if ($("selectedServiceName")) {
      $("selectedServiceName").textContent = selectedService.name;
    }

    if ($("selectedServiceDescription")) {
      $("selectedServiceDescription").textContent =
        selectedService.description;
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
      message("Please login before submitting your booking.");
      return;
    }

    $("bookingFormPanel")?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  /* =========================================
     DASHBOARD
     ========================================= */

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

    $("dashboard")?.scrollIntoView({
      behavior: "smooth"
    });
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

      $("dashboard")?.classList.add("hidden");
      $("publicWebsite")?.classList.remove("hidden");

      toast(error.message);
    }
  }

  /* =========================================
     CUSTOMER DASHBOARD
     ========================================= */

  async function customerDashboard() {
    showDashboard(
      "Customer Dashboard",
      "Welcome " + (me.name || "") + " · " + (me.phone || "")
    );

    $("customerDash")?.classList.remove("hidden");

    renderServices();

    if ($("bookingDate")) {
      const today = new Date();

             today.setHours(0, 0, 0, 0);
      $("bookingDate").min = today.toISOString().split("T")[0];
    }

    await loadCustomerBookings();
  }

  /* =========================================
     CUSTOMER BOOKINGS
     ========================================= */

  async function loadCustomerBookings() {
    try {
      const data = await request("/api/bookings/mine", null, "GET");
      const bookings = Array.isArray(data) ? data : (data.bookings || []);
      allBookings = bookings;
      renderBookingList("customerBookings", bookings);
    } catch (error) {
      console.error("Customer bookings:", error);
    }
  }

  function renderBookingList(elementId, bookings) {
    const container = $(elementId);
    if (!container) return;

    if (!bookings.length) {
      container.innerHTML = "<p>No bookings found yet.</p>";
      return;
    }

    container.innerHTML = bookings.map(booking => `
      <div class="card pad">
        <h3>${escapeHtml(booking.service || "Booking")}</h3>
        <p>Booking ID: ${escapeHtml(booking.id)}</p>
        <p>Date: ${escapeHtml(booking.event_date || "")}</p>
        <p>City: ${escapeHtml(booking.city || "")}</p>
        <p>Venue: ${escapeHtml(booking.venue || "")}</p>
        <p>Status: ${escapeHtml(booking.status || "pending")}</p>
      </div>
    `).join("");
  }

  /* =========================================
     CREATE BOOKING
     ========================================= */

  async function submitBooking() {
    const button = $("createBooking");

    try {
      if (!token) {
        showTab("customer");
        openModal();
        message("Please login before booking.");
        return;
      }

      if (!selectedService) {
        throw new Error("Please select a service first.");
      }

      const eventDate = $("bookingDate")?.value || "";
      const city = $("bookingCity")?.value.trim() || "";
      const venue = $("bookingVenue")?.value.trim() || "";
      const notes = $("bookingNotes")?.value.trim() || "";

      if (!eventDate) throw new Error("Please select event date.");
      if (city.length < 2) throw new Error("Enter your city.");
      if (venue.length < 2) throw new Error("Enter your event venue or address.");

      setButtonLoading(button, true, "Submit Booking");

      const data = await request("/api/bookings", {
        service: selectedService.name,
        event_date: eventDate,
        city,
        venue,
        customer_name: me?.name || "",
        customer_phone: me?.phone || "",
        notes
      });

      toast(data.message || "Booking submitted successfully.");

      if ($("bookingNotes")) $("bookingNotes").value = "";

      await loadCustomerBookings();

    } catch (error) {
      toast(error.message);
    } finally {
      setButtonLoading(button, false, "Submit Booking");
    }
  }

  /* =========================================
     PARTNER DASHBOARD
     ========================================= */

  async function partnerDashboard() {
    showDashboard(
      "Partner Dashboard",
      "Welcome " + (me.name || "") + " · " + (me.phone || "")
    );

    $("partnerDash")?.classList.remove("hidden");

    if ($("partnerProfile")) {
      $("partnerProfile").textContent =
        (me.name || "") + " · " + (me.city || "");
    }

    try {
      const data = await request("/api/partner/bookings", null, "GET");
      const bookings = Array.isArray(data) ? data : (data.bookings || []);
      renderBookingList("partnerBookings", bookings);
    } catch (error) {
      toast(error.message);
    }

    try {
      const data = await request("/api/partner/payments", null, "GET");
      const payments = Array.isArray(data) ? data : (data.payments || []);
      const container = $("partnerPayments");

      if (container) {
        container.innerHTML = payments.length
          ? payments.map(payment => `
              <div class="card pad">
                <p>Booking: ${escapeHtml(payment.booking_id)}</p>
                <p>Amount: ${money(payment.amount)}</p>
                <p>Date: ${escapeHtml(payment.paid_at || "")}</p>
              </div>
            `).join("")
          : "<p>No payment records found.</p>";
      }
    } catch (error) {
      console.error("Partner payments:", error);
    }
  }

  /* =========================================
     ADMIN DASHBOARD
     ========================================= */

  async function adminDashboard() {
    showDashboard(
      "Admin Dashboard",
      "Administrator · " + (me.email || "")
    );

    $("adminDash")?.classList.remove("hidden");

    try {
      const [bookingData, partnerData] = await Promise.all([
        request("/api/admin/bookings", null, "GET"),
        request("/api/admin/partners", null, "GET")
      ]);

      allBookings = Array.isArray(bookingData)
        ? bookingData
        : (bookingData.bookings || []);

      allPartners = Array.isArray(partnerData)
        ? partnerData
        : (partnerData.partners || []);

      updateAdminStats();
      renderAdminBookings();
      renderAdminPartners();

    } catch (error) {
      toast(error.message);
    }
  }

  function updateAdminStats() {
    const total = allBookings.length;
    const pending = allBookings.filter(
      booking => booking.status === "pending"
    ).length;

    const customers = new Set(
      allBookings.map(booking => booking.customer_id)
    ).size;

    if ($("adminTotalBookings")) $("adminTotalBookings").textContent = total;
    if ($("adminPendingBookings")) $("adminPendingBookings").textContent = pending;
    if ($("adminTotalCustomers")) $("adminTotalCustomers").textContent = customers;
    if ($("adminTotalPartners")) $("adminTotalPartners").textContent = allPartners.length;
    if ($("adminTotalRevenue")) $("adminTotalRevenue").textContent = "Not available";
    if ($("adminPendingPayments")) $("adminPendingPayments").textContent = "Not available";
  }

  function renderAdminBookings() {
    renderBookingList("adminBookings", allBookings);
  }

  function renderAdminPartners() {
    const container = $("adminPartners");
    if (!container) return;

    if (!allPartners.length) {
      container.innerHTML = "<p>No partner applications found.</p>";
      return;
    }

    container.innerHTML = allPartners.map(partner => `
      <div class="card pad">
        <h3>${escapeHtml(partner.name || "Partner")}</h3>
        <p>Mobile: ${escapeHtml(partner.phone || "")}</p>
        <p>Email: ${escapeHtml(partner.email || "")}</p>
        <p>City: ${escapeHtml(partner.city || "")}</p>
        <p>Status: ${escapeHtml(partner.status || "pending")}</p>

        <button class="btn"
          type="button"
          data-approve-partner="${escapeHtml(partner.id)}">
          Approve
        </button>

        <button class="btn outline"
          type="button"
          data-reject-partner="${escapeHtml(partner.id)}">
          Reject
        </button>
      </div>
    `).join("");
  }

  /* =========================================
     ADMIN ACTIONS
     ========================================= */

  async function updatePartnerStatus(id, status) {
    try {
      await request(
        "/api/admin/partners/" + encodeURIComponent(id),
        { status },
        "PATCH"
      );

      toast("Partner status updated.");
      await adminDashboard();

    } catch (error) {
      toast(error.message);
    }
  }

  async function updateBookingFromAdmin(id) {
    try {
      const select = $("assignPartner-" + id);
      const partnerId = select?.value || null;

      const body = {
        status: partnerId ? "assigned" : "confirmed"
      };

      if (partnerId) body.partner_id = partnerId;

      await request(
        "/api/admin/bookings/" + encodeURIComponent(id),
        body,
        "PATCH"
      );

      toast("Booking updated.");
      await adminDashboard();

    } catch (error) {
      toast(error.message);
    }
  }

  /* =========================================
     STARTUP CHECK
     ========================================= */

  console.log("CAMERA BOOKING frontend JavaScript loaded.");

})();
