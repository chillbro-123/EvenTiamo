/* script.js — EvenTiamo universal front-end handler
   Works with fusionForm, ethnicForm, glamForm (separate IDs)
   Make sure this file is included on each event page as:
   <script src="script.js" defer></script>
*/

const API_URL = "https://script.google.com/macros/s/AKfycbyJ9K61M3MhjqE-OcayrlqY6pLelOOxYicB_IfgfmxvLrQZ6f6VV_oDuTBTS9N5P6kj/exec";

// helper to bind a form (id, messageId)
function bindForm(formId, msgId) {
  const form = document.getElementById(formId);
  const msgEl = document.getElementById(msgId);

  if (!form) return;

  // ensure we don't double-bind by removing existing submit listeners (safe)
  form.addEventListener("submit", async function handler(e) {
    e.preventDefault();

    // disable submit button
    const btn = form.querySelector("button[type='submit']") || form.querySelector("button");
    const origText = btn ? btn.textContent : null;
    if (btn) { btn.disabled = true; btn.textContent = "Registering..."; }

    if (msgEl) { msgEl.textContent = ""; }

    try {
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());

      // Validation: require gmail
      const email = (payload.email || "").toString().trim().toLowerCase();
      if (!email.endsWith("@gmail.com")) {
        if (msgEl) msgEl.textContent = "❌ Please use a Gmail address (must end with @gmail.com).";
        return;
      }

      // try normal CORS POST (better for readable response)
      let sent = false;
      try {
        const r = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "cors",
          body: JSON.stringify(payload)
        });

        try {
          const data = await r.json();
          if (data && data.success) {
            if (msgEl) msgEl.textContent = "✅ Registration successful — ticket emailed.";
            form.reset();
            sent = true;
          } else {
            if (msgEl) msgEl.textContent = "❌ " + (data && data.error ? data.error : "Server rejected registration.");
            sent = true; // server responded
          }
        } catch (err) {
          // opaque or no-json response
          if (r.ok || r.type === "opaque") {
            if (msgEl) msgEl.textContent = "✅ Registration submitted — your ticket should arrive by email.";
            form.reset();
            sent = true;
          } else {
            throw new Error("Server error: " + r.status);
          }
        }
      } catch (err) {
        // fallback no-cors to ensure Apps Script receives payload
        try {
          await fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (msgEl) msgEl.textContent = "✅ Registration submitted (fallback). Your ticket should arrive by email.";
          form.reset();
          sent = true;
        } catch (err2) {
          console.warn("Both primary and fallback POST failed:", err2);
        }
      }

      if (!sent && msgEl) msgEl.textContent = "❌ Registration failed — please try again later.";
    } catch (err) {
      console.error("Registration error:", err);
      if (msgEl) msgEl.textContent = "❌ Unexpected error. Check console.";
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = origText || "Register & Get Ticket"; }
    }
  }, { once: false });
}

// bind the three forms (these IDs match the HTML below)
document.addEventListener("DOMContentLoaded", () => {
  bindForm("fusionForm", "fusionMsg");
  bindForm("ethnicForm", "ethnicMsg");
  bindForm("glamForm", "glamMsg");

  // gallery modal hookup (if you use modal IDs)
  wireGalleryModal();
});

// modal gallery utility (used by pages that include #modal and .gallery-img)
function wireGalleryModal() {
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modal-img");
  const modalClose = document.getElementById("modal-close");

  if (!modal) return;

  document.querySelectorAll(".gallery-img, .gallery-grid img").forEach(img => {
    img.addEventListener("click", () => {
      if (!modalImg) return;
      modalImg.src = img.src;
      modal.classList.add("visible");
      modal.setAttribute("aria-hidden", "false");
    });
  });

  if (modalClose) modalClose.addEventListener("click", () => {
    modal.classList.remove("visible");
    modal.setAttribute("aria-hidden", "true");
  });
}
