/***********************
 * ตั้งค่า
 ***********************/
const GAS_URL = "https://script.google.com/macros/s/AKfycbyRVmnVYlGOtK1rHI9iYERCtQJSfpv_D3HXhqYzTwqZhHvmRruoLDlt2e2xXhUXQYAt/exec"; // ต้องลงท้าย /exec
const ADMIN_PASSWORD = "Bhsp2025";

/***********************
 * ตัวแปรหลัก
 ***********************/
let currentSiteData = null;
let isLoading = false;

// ใช้เก็บรูปแบบ base64 ชั่วคราว (ตอนอัปโหลดรูปในผู้ดูแล)
window.tempImages = {
  logo: "",
  hero: "",
  service1: "",
  service2: "",
  service3: ""
};

/***********************
 * ติดต่อ Backend (Apps Script)
 ***********************/
async function fetchConfig() {
  const res = await fetch(GAS_URL, { cache: "no-store" });
  const data = await res.json();
  if (!data.ok) throw new Error("โหลด config ไม่สำเร็จ");
  return data.config;
}

// ใช้ text/plain เพื่อลดปัญหา preflight/CORS
async function saveConfig(config, password) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ password, config })
  });
  return await res.json();
}

/***********************
 * เครื่องมือสี
 ***********************/
function adjustColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

function hexToRgba(hex, alpha) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyColors() {
  if (!currentSiteData) return;

  const primary = currentSiteData.primary_color || "#7f0101";
  const accent = currentSiteData.accent_color || "#10b981";
  const primaryDark = adjustColor(primary, -20);
  const primaryLight = adjustColor(primary, 80);

  document.documentElement.style.setProperty("--primary-color", primary);
  document.documentElement.style.setProperty("--primary-dark", primaryDark);
  document.documentElement.style.setProperty("--primary-light", primaryLight);
  document.documentElement.style.setProperty(
    "--primary-gradient",
    `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`
  );
  document.documentElement.style.setProperty("--primary-shadow", hexToRgba(primary, 0.3));
  document.documentElement.style.setProperty("--accent-color", accent);
}

/***********************
 * เอาค่าที่โหลดมา “ไปใส่หน้าเว็บ”
 ***********************/
function applySavedData() {
  if (!currentSiteData) return;

  applyColors();

  // ข้อความหลัก
  setText("nav-school-name", currentSiteData.school_name);
  setText("nav-school-name-en", currentSiteData.school_name_en);
  setText("hero-title", currentSiteData.hero_title);
  setText("hero-subtitle", currentSiteData.hero_subtitle);

  // Services
  setText("service1-title", currentSiteData.service1_name);
  setText("service1-desc", currentSiteData.service1_desc);
  setHref("service1-link", currentSiteData.service1_link);

  setText("service2-title", currentSiteData.service2_name);
  setText("service2-desc", currentSiteData.service2_desc);
  setHref("service2-link", currentSiteData.service2_link);

  setText("service3-title", currentSiteData.service3_name);
  setText("service3-desc", currentSiteData.service3_desc);
  setHref("service3-link", currentSiteData.service3_link);

  // About
  setText("about-content", currentSiteData.about_content);

  // Contact
  setText("top-phone", currentSiteData.phone);
  setText("top-email", currentSiteData.email);

  setText("contact-phone", currentSiteData.phone);
  setText("contact-email", currentSiteData.email);
  setText("contact-address", currentSiteData.address);
  setText("footer-school-name", currentSiteData.school_name);

  // Social links
  if (currentSiteData.facebook_url) setHref("facebook-link", currentSiteData.facebook_url);
  if (currentSiteData.email) setHref("email-link", "mailto:" + currentSiteData.email);
  if (currentSiteData.phone) setHref("phone-link", "tel:" + String(currentSiteData.phone).replace(/[-\s]/g, ""));
  if (currentSiteData.map_url) setHref("map-link", currentSiteData.map_url);

  // Map embed
  if (currentSiteData.map_embed_url) {
    const mapEl = document.getElementById("google-map");
    if (mapEl) mapEl.src = currentSiteData.map_embed_url;
  }

  // รูป (Base64)
  if (currentSiteData.logo_image) {
    showImage("logo-img", currentSiteData.logo_image);
    hideEl("logo-default");
    showEl("logo-img");

    showImage("footer-logo-img", currentSiteData.logo_image);
    hideEl("footer-logo-default");
    showEl("footer-logo-img");
  }

  if (currentSiteData.hero_image) {
    const heroBg = document.getElementById("hero-bg");
    const heroDefault = document.getElementById("hero-default-bg");
    if (heroBg) heroBg.style.backgroundImage = `url(${currentSiteData.hero_image})`;
    if (heroDefault) heroDefault.style.display = "none";
  }

  if (currentSiteData.service1_image) {
    showImage("service1-img", currentSiteData.service1_image);
    hideEl("service1-default");
    showEl("service1-img");
  }
  if (currentSiteData.service2_image) {
    showImage("service2-img", currentSiteData.service2_image);
    hideEl("service2-default");
    showEl("service2-img");
  }
  if (currentSiteData.service3_image) {
    showImage("service3-img", currentSiteData.service3_image);
    hideEl("service3-default");
    showEl("service3-img");
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value !== undefined && value !== null) el.textContent = value;
}

function setHref(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value) el.href = value;
}

function showImage(id, src) {
  const el = document.getElementById(id);
  if (!el) return;
  el.src = src;
}

function showEl(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
}

function hideEl(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("hidden");
}

/***********************
 * เมนูมือถือ + scroll reveal (เหมือนเดิม)
 ***********************/
function initUiEffects() {
  const mobileBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));
    document.querySelectorAll("#mobile-menu a").forEach((link) => {
      link.addEventListener("click", () => mobileMenu.classList.add("hidden"));
    });
  }

  function revealOnScroll() {
    document.querySelectorAll(".scroll-reveal").forEach((el) => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top <= windowHeight - 100) el.classList.add("revealed");
    });
  }
  window.addEventListener("scroll", revealOnScroll);
  window.addEventListener("load", revealOnScroll);

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });

      document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
      if (this.classList.contains("nav-link")) this.classList.add("active");
    });
  });
}

/***********************
 * ระบบอัปโหลดรูป (Base64) ให้ผู้ดูแล
 ***********************/
function handleImageUpload(inputId, previewId, removeId, imageKey) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const removeBtn = document.getElementById(removeId);
  if (!input || !preview || !removeBtn) return;

  input.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      preview.src = dataUrl;
      preview.classList.remove("hidden");
      removeBtn.classList.remove("hidden");
      window.tempImages[imageKey] = dataUrl;
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener("click", () => {
    preview.src = "";
    preview.classList.add("hidden");
    removeBtn.classList.add("hidden");
    input.value = "";
    window.tempImages[imageKey] = "";
  });
}

/***********************
 * สี (ช่องสี + ช่องข้อความ) ให้ตรงกัน
 ***********************/
function syncColorPickers() {
  const primaryColor = document.getElementById("edit-primary-color");
  const primaryColorText = document.getElementById("edit-primary-color-text");
  const accentColor = document.getElementById("edit-accent-color");
  const accentColorText = document.getElementById("edit-accent-color-text");

  if (!primaryColor || !primaryColorText || !accentColor || !accentColorText) return;

  primaryColor.addEventListener("input", (e) => (primaryColorText.value = e.target.value));
  primaryColorText.addEventListener("input", (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) primaryColor.value = e.target.value;
  });

  accentColor.addEventListener("input", (e) => (accentColorText.value = e.target.value));
  accentColorText.addEventListener("input", (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) accentColor.value = e.target.value;
  });
}

/***********************
 * เปิด/ปิด Modal ผู้ดูแล + โหลดฟอร์ม + บันทึก
 ***********************/
function initAdmin() {
  const adminBtn = document.getElementById("admin-btn");
  const adminModal = document.getElementById("admin-modal");
  const backdrop = document.getElementById("modal-backdrop");

  const loginView = document.getElementById("login-view");
  const editView = document.getElementById("edit-view");

  const loginCancel = document.getElementById("login-cancel");
  const loginSubmit = document.getElementById("login-submit");
  const passInput = document.getElementById("admin-password");
  const loginError = document.getElementById("login-error");

  const editClose = document.getElementById("edit-close");
  const saveCancel = document.getElementById("save-cancel");
  const saveBtn = document.getElementById("save-changes");

  if (!adminBtn || !adminModal || !loginView || !editView) return;

  function openModal() {
    adminModal.classList.remove("hidden");
    adminModal.classList.add("flex");
    loginView.classList.remove("hidden");
    editView.classList.add("hidden");
    if (passInput) passInput.value = "";
    if (loginError) loginError.classList.add("hidden");
  }

  function closeModal() {
    adminModal.classList.add("hidden");
    adminModal.classList.remove("flex");
  }

  adminBtn.addEventListener("click", openModal);
  if (backdrop) backdrop.addEventListener("click", () => { if (!isLoading) closeModal(); });
  if (loginCancel) loginCancel.addEventListener("click", closeModal);
  if (editClose) editClose.addEventListener("click", () => { if (!isLoading) closeModal(); });
  if (saveCancel) saveCancel.addEventListener("click", () => { if (!isLoading) closeModal(); });

  if (loginSubmit) {
    loginSubmit.addEventListener("click", () => {
      const password = passInput ? passInput.value : "";
      if (password === ADMIN_PASSWORD) {
        loginView.classList.add("hidden");
        editView.classList.remove("hidden");
        loadEditForm(); // โหลดข้อมูลลงฟอร์ม
      } else {
        if (loginError) loginError.classList.remove("hidden");
      }
    });
  }

  if (passInput) {
    passInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") loginSubmit && loginSubmit.click();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (isLoading) return;
      isLoading = true;

      // UI loading
      saveBtn.disabled = true;
      const saveText = document.getElementById("save-text");
      const saveLoading = document.getElementById("save-loading");
      if (saveText) saveText.classList.add("hidden");
      if (saveLoading) saveLoading.classList.remove("hidden");

      try {
        const newData = collectFormData();
        const result = await saveConfig(newData, ADMIN_PASSWORD);

        if (!result.ok) {
          alert("บันทึกไม่สำเร็จ: " + (result.error || "error"));
        } else {
          // โหลดใหม่เพื่อให้ค่าที่โชว์บนหน้าเว็บเป็นค่าล่าสุดจริง
          currentSiteData = await fetchConfig();
          applySavedData();
          closeModal();
          showToastSuccess();
        }
      } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }

      // UI stop loading
      isLoading = false;
      saveBtn.disabled = false;
      const saveText = document.getElementById("save-text");
      const saveLoading = document.getElementById("save-loading");
      if (saveText) saveText.classList.remove("hidden");
      if (saveLoading) saveLoading.classList.add("hidden");
    });
  }
}

function showToastSuccess() {
  const toast = document.getElementById("success-toast");
  if (!toast) {
    alert("บันทึกเรียบร้อย ✅");
    return;
  }
  toast.classList.remove("hidden");
  toast.classList.add("flex");
  setTimeout(() => {
    toast.classList.add("hidden");
    toast.classList.remove("flex");
  }, 2500);
}

function loadEditForm() {
  const d = currentSiteData || {};

  setValue("edit-primary-color", d.primary_color || "#7f0101");
  setValue("edit-primary-color-text", d.primary_color || "#7f0101");
  setValue("edit-accent-color", d.accent_color || "#10b981");
  setValue("edit-accent-color-text", d.accent_color || "#10b981");

  setValue("edit-school-name", d.school_name || "");
  setValue("edit-school-name-en", d.school_name_en || "");
  setValue("edit-hero-title", d.hero_title || "");
  setValue("edit-hero-subtitle", d.hero_subtitle || "");

  setValue("edit-service1-name", d.service1_name || "");
  setValue("edit-service1-desc", d.service1_desc || "");
  setValue("edit-service1-link", d.service1_link || "");

  setValue("edit-service2-name", d.service2_name || "");
  setValue("edit-service2-desc", d.service2_desc || "");
  setValue("edit-service2-link", d.service2_link || "");

  setValue("edit-service3-name", d.service3_name || "");
  setValue("edit-service3-desc", d.service3_desc || "");
  setValue("edit-service3-link", d.service3_link || "");

  setValue("edit-about-content", d.about_content || "");

  setValue("edit-phone", d.phone || "");
  setValue("edit-email", d.email || "");
  setValue("edit-address", d.address || "");
  setValue("edit-facebook-url", d.facebook_url || "");
  setValue("edit-map-embed-url", d.map_embed_url || "");
  setValue("edit-map-url", d.map_url || "");

  // รูป: ตั้งค่า tempImages + preview
  window.tempImages.logo = d.logo_image || "";
  window.tempImages.hero = d.hero_image || "";
  window.tempImages.service1 = d.service1_image || "";
  window.tempImages.service2 = d.service2_image || "";
  window.tempImages.service3 = d.service3_image || "";

  setPreview("logo-preview", "logo-remove", window.tempImages.logo);
  setPreview("hero-preview", "hero-remove", window.tempImages.hero);
  setPreview("service1-preview", "service1-remove", window.tempImages.service1);
  setPreview("service2-preview", "service2-remove", window.tempImages.service2);
  setPreview("service3-preview", "service3-remove", window.tempImages.service3);
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function setPreview(previewId, removeId, src) {
  const p = document.getElementById(previewId);
  const r = document.getElementById(removeId);
  if (!p || !r) return;
  if (src) {
    p.src = src;
    p.classList.remove("hidden");
    r.classList.remove("hidden");
  } else {
    p.src = "";
    p.classList.add("hidden");
    r.classList.add("hidden");
  }
}

function collectFormData() {
  // เก็บข้อมูลจากฟอร์มทั้งหมด + รูปจาก tempImages
  return {
    primary_color: getValue("edit-primary-color"),
    accent_color: getValue("edit-accent-color"),
    school_name: getValue("edit-school-name"),
    school_name_en: getValue("edit-school-name-en"),
    hero_title: getValue("edit-hero-title"),
    hero_subtitle: getValue("edit-hero-subtitle"),

    service1_name: getValue("edit-service1-name"),
    service1_desc: getValue("edit-service1-desc"),
    service1_link: getValue("edit-service1-link"),

    service2_name: getValue("edit-service2-name"),
    service2_desc: getValue("edit-service2-desc"),
    service2_link: getValue("edit-service2-link"),

    service3_name: getValue("edit-service3-name"),
    service3_desc: getValue("edit-service3-desc"),
    service3_link: getValue("edit-service3-link"),

    about_content: getValue("edit-about-content"),

    phone: getValue("edit-phone"),
    email: getValue("edit-email"),
    address: getValue("edit-address"),
    facebook_url: getValue("edit-facebook-url"),
    map_embed_url: getValue("edit-map-embed-url"),
    map_url: getValue("edit-map-url"),

    logo_image: window.tempImages.logo || "",
    hero_image: window.tempImages.hero || "",
    service1_image: window.tempImages.service1 || "",
    service2_image: window.tempImages.service2 || "",
    service3_image: window.tempImages.service3 || ""
  };
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

/***********************
 * เริ่มทำงานเมื่อเว็บโหลดเสร็จ
 ***********************/
window.addEventListener("load", async () => {
  if (!GAS_URL || GAS_URL.includes("ใส่ลิงก์")) {
    alert("กรุณาใส่ลิงก์ GAS_URL ในไฟล์ app.js ก่อน");
    return;
  }

  initUiEffects();

  // ผูกระบบอัปโหลดรูป (ต้องมี id ตาม HTML ของภูมิ)
  handleImageUpload("logo-upload", "logo-preview", "logo-remove", "logo");
  handleImageUpload("hero-upload", "hero-preview", "hero-remove", "hero");
  handleImageUpload("service1-upload", "service1-preview", "service1-remove", "service1");
  handleImageUpload("service2-upload", "service2-preview", "service2-remove", "service2");
  handleImageUpload("service3-upload", "service3-preview", "service3-remove", "service3");

  syncColorPickers();
  initAdmin();

  // โหลดค่าจริงจาก Backend
  try {
    currentSiteData = await fetchConfig();
    applySavedData();
  } catch (e) {
    console.error(e);
    alert("โหลดข้อมูลไม่สำเร็จ: ตรวจ GAS_URL และการ Deploy Apps Script");
  }
});
