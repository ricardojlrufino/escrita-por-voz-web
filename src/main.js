import "./style.css";
import { createEditor } from "./editor.js";
import { createVoiceRecognition } from "./voice.js";
import { createStorage } from "./storage.js";
import { download } from "./download.js";
import { registerPwa } from "./pwa.js";

const app = document.querySelector("#app");

app.innerHTML = `
  <main class="shell${import.meta.env.DEV ? " shell--debug" : ""}">
    <header class="topbar">
      <div class="title-block">
        <p class="eyebrow">Markdown por voz</p>
        <h1>Ditado por Voz</h1>
      </div>
      <div class="actions">
        <button type="button" class="action-button install-button" data-install hidden aria-label="Instalar aplicativo">
          <i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>
          <span>Instalar</span>
        </button>
        <button type="button" class="action-button primary" data-download aria-label="Baixar documento">
          <i class="fa-solid fa-download" aria-hidden="true"></i>
          <span>Download</span>
        </button>
      </div>
    </header>

    <aside class="voice-panel" data-voice-panel>
      <div class="voice-panel-main">
        <div class="voice-waveform" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="voice-copy">
          <p class="voice-status" data-status>Pronto para ditado · pt-BR</p>
          <p class="voice-preview" data-interim></p>
        </div>
      </div>
      <button type="button" class="voice-button" data-toggle-voice aria-label="Iniciar ditado">
        <i class="fa-solid fa-microphone" data-voice-icon aria-hidden="true"></i>
        <span data-voice-label>Iniciar ditado</span>
      </button>
    </aside>

    ${import.meta.env.DEV ? `
    <div class="debug-bar" data-debug-bar>
      <span class="debug-label">debug</span>
      <ol class="debug-log" data-debug-log reversed></ol>
    </div>` : ""}

    <section class="editor-panel">
      <div class="editor-toolbar">
        <label class="editor-label" for="editor">
          <i class="fa-regular fa-file-lines" aria-hidden="true"></i>
          <span>Documento</span>
        </label>
        <div class="toolbar-actions">
          <p class="char-count" data-char-count>0 chars</p>
          <button type="button" class="toolbar-button" data-clear aria-label="Limpar documento">
            <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
          </button>
          <button type="button" class="toolbar-button" data-save aria-label="Copiar texto">
            <i class="fa-regular fa-copy" data-save-icon aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <textarea
        id="editor"
        class="editor"
        spellcheck="false"
        placeholder="# Titulo&#10;&#10;Comece a escrever ou dite seu texto em portugues."
      ></textarea>
    </section>
  </main>
`;

const textarea = document.querySelector("#editor");
const installButton = document.querySelector("[data-install]");
const saveButton = document.querySelector("[data-save]");
const saveIcon = document.querySelector("[data-save-icon]");
const clearButton = document.querySelector("[data-clear]");
const downloadButton = document.querySelector("[data-download]");
const voiceButton = document.querySelector("[data-toggle-voice]");
const voiceLabel = document.querySelector("[data-voice-label]");
const voiceIcon = document.querySelector("[data-voice-icon]");
const voicePanel = document.querySelector("[data-voice-panel]");
const interimElement = document.querySelector("[data-interim]");
const statusElement = document.querySelector("[data-status]");
const charCountElement = document.querySelector("[data-char-count]");

const debugLog = import.meta.env.DEV ? document.querySelector("[data-debug-log]") : null;
const MAX_DEBUG_ENTRIES = 40;

function logDebug(type, text = "") {
  if (!debugLog) return;
  const entry = document.createElement("li");
  entry.className = "debug-entry";

  if (text) {
    entry.title = text;
  }

  const tag = document.createElement("span");
  tag.className = `debug-tag debug-tag--${type}`;
  tag.textContent = type;

  entry.appendChild(tag);

  if (text) {
    const content = document.createElement("span");
    content.className = "debug-text";
    const preview = text.length > 40
      ? `"${text.slice(0, 20)}…${text.slice(-20)}"`
      : `"${text}"`;
    content.textContent = `${preview} · ${text.length}c`;
    entry.appendChild(content);
  }

  debugLog.prepend(entry);

  while (debugLog.children.length > MAX_DEBUG_ENTRIES) {
    debugLog.removeChild(debugLog.lastChild);
  }
}

const editor = createEditor(textarea);
const storage = createStorage();

editor.setValue(storage.load());
storage.bindAutoSave(textarea, () => editor.getValue(), 1000);

function setSaveFeedback(timeout = 1400) {
  saveIcon.className = "fa-solid fa-check";
  saveButton.disabled = true;

  window.setTimeout(() => {
    saveIcon.className = "fa-regular fa-copy";
    saveButton.disabled = false;
  }, timeout);
}

function setInterimText(text) {
  interimElement.textContent = text;
  interimElement.classList.toggle("is-visible", Boolean(text));
}

function setVoiceUI({ listening, status, unsupported = false, error = false }) {
  statusElement.textContent = status;
  voiceButton.disabled = unsupported;
  voiceLabel.textContent = listening ? "Parar ditado" : "Iniciar ditado";
  voiceIcon.className = listening ? "fa-solid fa-stop" : "fa-solid fa-microphone";
  voiceButton.setAttribute("aria-label", listening ? "Parar ditado" : "Iniciar ditado");
  voicePanel.classList.toggle("is-listening", listening);
  voicePanel.classList.toggle("is-error", error);
  voiceButton.classList.toggle("is-active", listening);
  voiceButton.classList.toggle("is-listening", listening);
  voiceButton.classList.toggle("is-error", error);
  statusElement.classList.toggle("is-error", error);
}

function updateCharCount() {
  const total = textarea.value.length;
  charCountElement.textContent = `${total} chars`;
}

const voice = createVoiceRecognition({
  onStart() {
    debugLog.innerHTML = "";
    setVoiceUI({
      listening: true,
      status: "Ouvindo em pt-BR"
    });
  },
  onResult(text) {
    logDebug("final", text);
    editor.commitFinalText(text);
  },
  onInterim(text) {
    if (text) {
      logDebug("interim", text);
      editor.setInterimBuffer(text);
    } else {
      logDebug("clear");
      editor.clearBuffer();
    }
  },
  onStop({ restarting } = {}) {
    if (restarting) {
      return;
    }

    logDebug("clear");
    editor.clearBuffer();
    setVoiceUI({
      listening: false,
      status: "Pronto para ditado · pt-BR"
    });
  },
  onError(event) {
    editor.clearBuffer();
    const messages = {
      "audio-capture": "Nenhum microfone disponivel.",
      "network": "Falha de rede no reconhecimento.",
      "not-allowed": "Permissao de microfone negada.",
      "service-not-allowed": "Reconhecimento de voz bloqueado pelo browser."
    };

    setVoiceUI({
      listening: false,
      status: messages[event.error] ?? "Falha ao iniciar ditado.",
      error: true
    });
  }
});

if (!voice.isSupported) {
  setVoiceUI({
    listening: false,
    status: "Seu browser nao suporta reconhecimento de voz. Use Chrome ou Edge.",
    unsupported: true
  });
}

textarea.addEventListener("beforeinput", () => {
  logDebug("freeze");
  editor.freezeBuffer();
});

textarea.addEventListener("input", () => {
  updateCharCount();
  textarea.scrollTop = textarea.scrollHeight;
});
updateCharCount();

saveButton.addEventListener("click", () => {
  navigator.clipboard.writeText(editor.getValue()).then(() => {
    setSaveFeedback();
  });
});

clearButton.addEventListener("click", () => {
  if (!editor.getValue()) return;
  if (!window.confirm("Limpar todo o texto?")) return;
  editor.setValue("");
  storage.save("");
  updateCharCount();
});

downloadButton.addEventListener("click", () => {
  download(editor.getValue());
});

voiceButton.addEventListener("click", () => {
  if (!voice.isSupported) {
    return;
  }

  const started = voice.toggle();

  if (started) {
    setVoiceUI({
      listening: true,
      status: "Ativando microfone..."
    });
    return;
  }

  setVoiceUI({
    listening: false,
    status: "Encerrando ditado..."
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "F2") {
    event.preventDefault();
    voiceButton.click();
  }
});

registerPwa({
  installButton,
  onInstalled() {
    installButton.hidden = true;
  }
});
