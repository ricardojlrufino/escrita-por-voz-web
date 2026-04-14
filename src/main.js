import "./style.css";
import { createEditor } from "./editor.js";
import { createVoiceRecognition } from "./voice.js";
import { createStorage } from "./storage.js";
import { download } from "./download.js";
import { registerPwa } from "./pwa.js";

const app = document.querySelector("#app");

app.innerHTML = `
  <main class="shell">
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
        <button type="button" class="action-button" data-save aria-label="Salvar documento">
          <i class="fa-regular fa-floppy-disk" aria-hidden="true"></i>
          <span data-save-label>Salvar</span>
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

    <section class="editor-panel">
      <div class="editor-toolbar">
        <label class="editor-label" for="editor">
          <i class="fa-regular fa-file-lines" aria-hidden="true"></i>
          <span>Documento</span>
        </label>
        <p class="char-count" data-char-count>0 chars</p>
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
const saveLabel = document.querySelector("[data-save-label]");
const downloadButton = document.querySelector("[data-download]");
const voiceButton = document.querySelector("[data-toggle-voice]");
const voiceLabel = document.querySelector("[data-voice-label]");
const voiceIcon = document.querySelector("[data-voice-icon]");
const voicePanel = document.querySelector("[data-voice-panel]");
const interimElement = document.querySelector("[data-interim]");
const statusElement = document.querySelector("[data-status]");
const charCountElement = document.querySelector("[data-char-count]");

const editor = createEditor(textarea);
const storage = createStorage();

editor.setValue(storage.load());
storage.bindAutoSave(textarea, () => editor.getValue(), 1000);

function setSaveFeedback(message, timeout = 1400) {
  const previousLabel = saveLabel.textContent;
  saveLabel.textContent = message;
  saveButton.disabled = true;

  window.setTimeout(() => {
    saveLabel.textContent = previousLabel === message ? "Salvar" : previousLabel;
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
    setVoiceUI({
      listening: true,
      status: "Ouvindo em pt-BR"
    });
  },
  onResult(text) {
    editor.commitInterim(text);
  },
  onInterim(text) {
    if (text) {
      editor.insertInterim(text);
    } else {
      editor.clearInterim();
    }
  },
  onStop() {
    editor.clearInterim();
    if (!voice.isListening) {
      setVoiceUI({
        listening: false,
        status: "Pronto para ditado · pt-BR"
      });
    }
  },
  onError(event) {
    editor.clearInterim();
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

textarea.addEventListener("input", updateCharCount);
updateCharCount();

saveButton.addEventListener("click", () => {
  storage.save(editor.getValue());
  setSaveFeedback("Salvo!");
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

registerPwa({
  installButton,
  onInstalled() {
    installButton.hidden = true;
  }
});
