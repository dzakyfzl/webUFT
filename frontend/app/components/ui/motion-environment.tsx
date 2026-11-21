"use client";

import { useEffect } from "react";
import { shakeInvalidField } from "../../lib/motion-preference";

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isField(target: EventTarget | null): target is Field {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

export default function MotionEnvironment() {
  useEffect(() => {
    const root = document.documentElement;
    const theme = window.matchMedia("(prefers-color-scheme: dark)");
    let frame = 0;
    function syncTheme() {
      cancelAnimationFrame(frame);
      root.classList.add("theme-switching");
      root.dataset.theme = theme.matches ? "dark" : "light";
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => root.classList.remove("theme-switching"));
      });
    }
    syncTheme();
    theme.addEventListener("change", syncTheme);
    return () => {
      cancelAnimationFrame(frame);
      theme.removeEventListener("change", syncTheme);
      root.classList.remove("theme-switching");
      delete root.dataset.theme;
    };
  }, []);

  useEffect(() => {
    let errorId = 0;
    const errors = new WeakMap<Field, { message: HTMLElement; animation?: Animation }>();

    function clear(field: Field) {
      const entry = errors.get(field);
      if (!entry) return;
      const descriptions = (field.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(id => id && id !== entry.message.id);
      if (descriptions.length) field.setAttribute("aria-describedby", descriptions.join(" "));
      else field.removeAttribute("aria-describedby");
      field.removeAttribute("aria-invalid");
      entry.animation?.cancel();
      entry.message.remove();
      errors.delete(field);
    }

    function invalid(event: Event) {
      const field = event.target;
      if (!isField(field) || !field.form || field.hasAttribute("data-validation-managed")) return;
      if (field instanceof HTMLInputElement && field.type === "radio") {
        const first = Array.from(field.form.elements).find(element => element instanceof HTMLInputElement &&
          element.type === "radio" && element.name === field.name && element.willValidate);
        if (first !== field) return;
      }
      clear(field);
      const message = document.createElement("span");
      message.id = `field-validation-${++errorId}`;
      message.className = "motion-field-error";
      message.textContent = field.validationMessage;
      const label = field.closest("label");
      if (label && !(field instanceof HTMLInputElement && ["radio", "checkbox"].includes(field.type))) {
        field.after(message);
      } else {
        (field.closest("[data-validation-anchor]") ?? label ?? field).after(message);
      }
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", [field.getAttribute("aria-describedby"), message.id].filter(Boolean).join(" "));
      const animation = shakeInvalidField(field);
      errors.set(field, { message, animation });
    }

    function update(event: Event) {
      const field = event.target;
      if (!isField(field)) return;
      queueMicrotask(() => {
        if (field instanceof HTMLInputElement && ["radio", "checkbox"].includes(field.type) && field.name && field.form) {
          for (const element of field.form.elements) {
            if (element instanceof HTMLInputElement && element.type === field.type &&
              element.name === field.name && element.validity.valid) clear(element);
          }
        } else if (field.validity.valid) clear(field);
      });
    }

    function reset(event: Event) {
      if (!(event.target instanceof HTMLFormElement)) return;
      for (const element of event.target.elements) if (isField(element)) clear(element);
    }

    document.addEventListener("invalid", invalid, true);
    document.addEventListener("input", update);
    document.addEventListener("change", update);
    document.addEventListener("reset", reset);
    return () => {
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("input", update);
      document.removeEventListener("change", update);
      document.removeEventListener("reset", reset);
    };
  }, []);

  return null;
}
