export function createEditor(textarea) {
  // Tracks where interim text begins and how long it is (legacy)
  let interimStart = null;
  let interimLength = 0;

  // Voice buffer: region of the textarea "owned" by voice dictation
  let bufferStart = null;
  let bufferLength = 0;
  let bufferText = "";
  // Region committed by user typing (waiting for Chrome's final result to correct it)
  let committedRegion = null;

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

  function appendVoice(text) {
    const addition = `${text.trim()} `;
    const savedStart = textarea.selectionStart;
    const savedEnd = textarea.selectionEnd;

    textarea.value += addition;

    textarea.selectionStart = savedStart;
    textarea.selectionEnd = savedEnd;
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

  // Show interim text inline at the end of committed content
  function setInterimBuffer(text) {
    const trimmed = text.trim();

    if (bufferStart === null) {
      bufferStart = textarea.value.length;
    }

    const before = textarea.value.slice(0, bufferStart);
    const after  = textarea.value.slice(bufferStart + bufferLength);

    textarea.value = before + trimmed + after;
    bufferLength = trimmed.length;
    bufferText = trimmed;

    const pos = bufferStart + bufferLength;
    textarea.selectionStart = pos;
    textarea.selectionEnd   = pos;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Replace buffer with the final recognized text (or fix a committed region)
  function commitFinalText(finalText) {
    const addition = `${finalText.trim()} `;

    if (bufferStart !== null) {
      // Normal case: active buffer exists
      const before = textarea.value.slice(0, bufferStart);
      const after  = textarea.value.slice(bufferStart + bufferLength);

      textarea.value = before + addition + after;

      const pos = before.length + addition.length;
      textarea.selectionStart = pos;
      textarea.selectionEnd   = pos;

      bufferStart = null;
      bufferLength = 0;
      bufferText = "";
    } else if (committedRegion !== null) {
      // User typed while interim was showing — committed region is still in textarea
      const { start, length, text } = committedRegion;

      if (textarea.value.slice(start, start + length) === text) {
        // Position still valid: replace with Chrome's corrected final text
        const before = textarea.value.slice(0, start);
        const after  = textarea.value.slice(start + length);
        textarea.value = before + addition + after;
      }
      // If user edited the committed region, skip (preserve user's edits)

      committedRegion = null;
    } else {
      // Fallback: no context, just append at end
      textarea.value += addition;
    }

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Called via beforeinput: user is typing, make interim permanent and stop tracking it
  function freezeBuffer() {
    if (bufferStart === null) return;

    committedRegion = { start: bufferStart, length: bufferLength, text: bufferText };
    bufferStart = null;
    bufferLength = 0;
    bufferText = "";
    // Interim text stays in textarea as permanent content
  }

  // Remove interim text from textarea (on stop or error)
  function clearBuffer() {
    if (bufferStart !== null) {
      const before = textarea.value.slice(0, bufferStart);
      const after  = textarea.value.slice(bufferStart + bufferLength);

      textarea.value = before + after;
      textarea.selectionStart = bufferStart;
      textarea.selectionEnd   = bufferStart;

      bufferStart = null;
      bufferLength = 0;
      bufferText = "";
    }

    committedRegion = null;
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
    appendVoice,
    setInterimBuffer,
    commitFinalText,
    freezeBuffer,
    clearBuffer,
    insertInterim,
    commitInterim,
    clearInterim,
    getValue,
    setValue
  };
}
