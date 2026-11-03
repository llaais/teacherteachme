
"use strict";

/* =========================================
   ELEMENTOS DA PÁGINA
========================================= */

const menuToggle = document.getElementById("menuToggle");
const sideMenu = document.getElementById("sideMenu");
const menuBackdrop = document.getElementById("menuBackdrop");
const closeMenuButton = document.getElementById("closeMenu");

const yearElement =
  document.getElementById("year") ||
  document.getElementById("currentYear");


/* =========================================
   ANO AUTOMÁTICO
========================================= */

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}


/* =========================================
   MENU LATERAL
========================================= */

function setMenu(open) {
  if (!sideMenu || !menuBackdrop || !menuToggle) {
    return;
  }

  sideMenu.classList.toggle("open", open);

  menuBackdrop.hidden = !open;

  sideMenu.setAttribute(
    "aria-hidden",
    String(!open)
  );

  menuToggle.setAttribute(
    "aria-expanded",
    String(open)
  );

  document.body.classList.toggle(
    "menu-open",
    open
  );

  if (open) {
    closeMenuButton?.focus();
  } else {
    menuToggle.focus();
  }
}


/* =========================================
   ABRIR E FECHAR MENU
========================================= */

menuToggle?.addEventListener("click", () => {
  const isOpen = sideMenu?.classList.contains("open");

  setMenu(!isOpen);
});


closeMenuButton?.addEventListener("click", () => {
  setMenu(false);
});


menuBackdrop?.addEventListener("click", () => {
  setMenu(false);
});


/* =========================================
   FECHAR COM ESC
========================================= */

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenu(false);
  }
});


/* =========================================
   FECHAR AO CLICAR EM UM LINK
========================================= */

document.querySelectorAll(".side-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    setMenu(false);
  });
});


/* =========================================
   BOTÕES DE ACESSO
========================================= */

document.querySelectorAll("[data-open-auth]").forEach((button) => {
  button.addEventListener("click", () => {
    setMenu(false);

    window.location.href = "login.html";
  });
});


/* =========================================
   SELEÇÃO DE PLANOS
========================================= */

document.querySelectorAll(".choose-plan").forEach((button) => {
  button.addEventListener("click", () => {
    const plan = button.dataset.plan || "";

    const destination = new URL(
      "login.html",
      window.location.href
    );

    if (plan) {
      destination.searchParams.set("plan", plan);
    }

    window.location.href = destination.href;
  });
});


/* =========================================
   ESTADO INICIAL DO MENU
========================================= */

if (sideMenu && menuBackdrop && menuToggle) {
  const initiallyOpen = sideMenu.classList.contains("open");

  sideMenu.setAttribute(
    "aria-hidden",
    String(!initiallyOpen)
  );

  menuToggle.setAttribute(
    "aria-expanded",
    String(initiallyOpen)
  );

  menuBackdrop.hidden = !initiallyOpen;
}
