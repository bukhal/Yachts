// Run `fn` once when an exit animation ends, with a timer as the fallback.
// Exactly once: the listener and the timer cancel each other, so a dialog
// reopened right after closing isn't shut by a leftover timer.

/** @param {Element} el @param {number} ms fallback delay @param {() => void} fn */
export function afterAnimation(el, ms, fn) {
  let timer = 0;
  const run = () => {
    el.removeEventListener("animationend", run);
    clearTimeout(timer);
    fn();
  };
  el.addEventListener("animationend", run);
  timer = setTimeout(run, ms);
  return run;
}
