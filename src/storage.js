const STORAGE_KEY = "ditado-por-voz:content";

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createStorage() {
  const storage = getStorage();

  function load() {
    if (!storage) {
      return "";
    }

    try {
      return storage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  }

  function save(text) {
    if (!storage) {
      return;
    }

    try {
      storage.setItem(STORAGE_KEY, text);
    } catch {
      // Ignore persistence errors and keep the editor usable.
    }
  }

  function bindAutoSave(element, getText, delay = 1000) {
    let timeoutId = null;

    element.addEventListener("input", () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        save(getText());
      }, delay);
    });
  }

  return {
    load,
    save,
    bindAutoSave
  };
}
