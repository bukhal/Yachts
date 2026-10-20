// Tiny anchored popover used by the sort menu and the location quick filters.
// Closes on Escape, click outside, or when focus leaves; returns focus to the
// trigger; positions below the trigger, aligned to the side that keeps it on screen.

/**
 * @param {HTMLElement} trigger
 * @param {HTMLElement} panel  appended next to the trigger (positioned absolutely)
 * @param {{ onOpen?: () => void, onClose?: () => void, align?: "start" | "end" }} [o]
 */
export function createPopover(trigger, panel, { onOpen, onClose, align = "start" } = {}) {
  panel.hidden = true;
  panel.classList.add("popover");
  trigger.setAttribute("aria-expanded", "false");
  const host = trigger.parentElement;
  host.style.position ||= "relative";
  host.append(panel);

  const isOpen = () => !panel.hidden;

  // Preferred alignment first; switch sides if that would cross a screen edge
  // (e.g. the sort menu is end-aligned, but on phones its button sits on the left).
  function place() {
    const vw = document.documentElement.clientWidth;
    panel.classList.remove("popover--end", "popover--flip");
    if (align === "end") {
      panel.classList.add("popover--end");
      if (panel.getBoundingClientRect().left < 12) panel.classList.remove("popover--end");
    } else if (panel.getBoundingClientRect().right > vw - 12) {
      panel.classList.add("popover--flip");
    }
  }

  function open() {
    if (isOpen()) return;
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    place();
    panel.classList.remove("is-in");
    void panel.offsetWidth;
    panel.classList.add("is-in");
    document.addEventListener("pointerdown", onOutside, true);
    onOpen?.();
  }

  function close({ focus = true } = {}) {
    if (!isOpen()) return;
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", onOutside, true);
    if (focus) trigger.focus();
    onClose?.();
  }

  function onOutside(e) {
    if (!panel.contains(e.target) && !trigger.contains(e.target)) close({ focus: false });
  }

  trigger.addEventListener("click", () => (isOpen() ? close() : open()));
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  });
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close();
  });
  // Tabbing away closes it. Focus moving to an ancestor (clicking a label inside
  // lands focus on the nearest focusable container) doesn't count as leaving.
  panel.addEventListener("focusout", (e) => {
    const to = e.relatedTarget;
    if (!isOpen() || !to || panel.contains(to) || to === trigger || to.contains(panel)) return;
    close({ focus: false });
  });

  return { open, close, isOpen };
}
