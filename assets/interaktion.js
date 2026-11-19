"use strict";

function activateInquiry() {
  const form = document.querySelector("[data-inquiry]");
  if (!form) return;

  const subject = form.elements.namedItem("thema");
  const name = form.elements.namedItem("name");
  const message = form.elements.namedItem("nachricht");
  const status = form.querySelector("[data-inquiry-status]");
  const requestedTopic = new URLSearchParams(window.location.search).get("thema");

  if (Array.from(subject.options).some(option => option.value === requestedTopic)) {
    subject.value = requestedTopic;
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!message.value.trim()) {
      message.setCustomValidity("Bitte beschreiben Sie kurz Ihr Anliegen.");
      message.reportValidity();
      return;
    }
    const signature = name.value.trim();
    const body = [message.value.trim(), signature].filter(Boolean).join("\r\n\r\n");
    const headline = "Nachlassgold – " + subject.selectedOptions[0].text;
    const mailto = "mailto:info@nachlassgold.de?subject=" + encodeURIComponent(headline) + "&body=" + encodeURIComponent(body);
    status.textContent = "Falls sich kein E-Mail-Programm öffnet, kopieren Sie Ihren Text und schreiben Sie an info@nachlassgold.de.";
    window.location.href = mailto;
  });
  message.addEventListener("input", () => message.setCustomValidity(""));
  document.querySelector("[data-email-fallback]").hidden = true;
  form.hidden = false;
}

function activateFaqSearch() {
  const list = document.querySelector("[data-faq-list]");
  if (!list) return;

  const search = list.querySelector("[data-faq-search]");
  const input = search.querySelector("input");
  const status = search.querySelector("[data-faq-status]");
  const normalize = value => value.toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss");
  const entries = Array.from(list.querySelectorAll("details"), element => ({
    element,
    text: normalize(element.textContent)
  }));

  input.addEventListener("input", () => {
    const words = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const entry of entries) {
      const matches = words.every(word => entry.text.includes(word));
      entry.element.hidden = !matches;
      if (matches) count += 1;
    }
    const result = count === 1 ? "1 passende Frage." : count + " passende Fragen.";
    status.textContent = words.length ? (count ? result : "Keine passenden Fragen. Versuchen Sie einen anderen Suchbegriff.") : "";
  });
  search.hidden = false;
}

activateInquiry();
activateFaqSearch();
