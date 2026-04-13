export function createEditor(textarea) {
  // Tracks where interim text begins and how long it is
  let interimStart = null;
  let interimLength = 0;

  function insertAtCursor(text) {
    const addition = `${text.trim()} `;
    const { selectionStart, selectionEnd, value } = textarea;
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);

    textarea.value = `${before}${addition}${after}`;

    const nextCursorPosition = before.length + addition.length;
    textarea.selectionStart = nextCursorPosition;
    textarea.selectionEnd = nextCursorPosition;
    textarea.focus();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Insert or replace interim (preview) text at the tracked position
  function insertInterim(text) {
    if (interimStart === null) {
      interimStart = textarea.selectionStart;
    }

    const before = textarea.value.slice(0, interimStart);
    const after  = textarea.value.slice(interimStart + interimLength);

    textarea.value = before + text + after;
    interimLength  = text.length;

    const pos = interimStart + text.length;
    textarea.selectionStart = pos;
    textarea.selectionEnd   = pos;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Replace interim text with the final recognised text
  function commitInterim(finalText) {
    const start  = interimStart ?? textarea.selectionStart;
    const length = interimStart !== null ? interimLength : 0;
    const addition = `${finalText.trim()} `;

    const before = textarea.value.slice(0, start);
    const after  = textarea.value.slice(start + length);

    textarea.value = before + addition + after;

    const pos = before.length + addition.length;
    textarea.selectionStart = pos;
    textarea.selectionEnd   = pos;

    interimStart  = null;
    interimLength = 0;

    textarea.focus();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Remove interim text without committing (e.g. on stop/error)
  function clearInterim() {
    if (interimStart === null) return;

    const before = textarea.value.slice(0, interimStart);
    const after  = textarea.value.slice(interimStart + interimLength);

    textarea.value = before + after;
    textarea.selectionStart = interimStart;
    textarea.selectionEnd   = interimStart;

    interimStart  = null;
    interimLength = 0;

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function getValue() {
    return textarea.value;
  }

  function setValue(text) {
    textarea.value = text;
  }

  return {
    insertAtCursor,
    insertInterim,
    commitInterim,
    clearInterim,
    getValue,
    setValue
  };
}
