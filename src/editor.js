export function createEditor(textarea) {
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

  function getValue() {
    return textarea.value;
  }

  function setValue(text) {
    textarea.value = text;
  }

  return {
    insertAtCursor,
    getValue,
    setValue
  };
}
