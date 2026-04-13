function getRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function createVoiceRecognition(callbacks = {}) {
  const SpeechRecognitionCtor = getRecognitionCtor();

  if (!SpeechRecognitionCtor) {
    return {
      isSupported: false,
      isListening: false,
      start() {},
      stop() {},
      toggle() {
        return false;
      }
    };
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = "pt-BR";
  recognition.continuous = true;
  recognition.interimResults = true;

  let shouldRestart = false;
  let isListening = false;

  recognition.onstart = () => {
    isListening = true;
    callbacks.onStart?.();
  };

  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;

      if (event.results[index].isFinal) {
        finalText += transcript;
      } else {
        interimText += transcript;
      }
    }

    if (interimText) {
      callbacks.onInterim?.(interimText.trim());
    }

    if (finalText) {
      callbacks.onResult?.(finalText.trim());
      callbacks.onInterim?.("");
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      shouldRestart = false;
    }

    callbacks.onError?.(event);
  };

  recognition.onend = () => {
    isListening = false;
    callbacks.onStop?.();

    if (shouldRestart) {
      try {
        recognition.start();
      } catch {
        window.setTimeout(() => {
          if (shouldRestart) {
            try {
              recognition.start();
            } catch {
              // Browser still not ready to restart.
            }
          }
        }, 250);
      }
    }
  };

  function start() {
    shouldRestart = true;

    if (isListening) {
      return true;
    }

    try {
      recognition.start();
      return true;
    } catch {
      return false;
    }
  }

  function stop() {
    shouldRestart = false;

    if (!isListening) {
      return;
    }

    recognition.stop();
  }

  function toggle() {
    if (shouldRestart || isListening) {
      stop();
      return false;
    }

    start();
    return true;
  }

  return {
    isSupported: true,
    get isListening() {
      return isListening;
    },
    start,
    stop,
    toggle
  };
}
