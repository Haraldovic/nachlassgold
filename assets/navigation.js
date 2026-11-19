(() => {
  const toggle = document.querySelector(".menu-button");
  const links = document.getElementById("haupt-navigation");
  if (!toggle || !links) return;
  document.documentElement.classList.add("has-menu");
  toggle.hidden = false;
  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    links.classList.toggle("is-open", open);
  }
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && links.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });
  window.matchMedia("(max-width:900px)").addEventListener("change", () => setOpen(false));
})();
