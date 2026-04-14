export function registerPwa({ installButton, onInstalled } = {}) {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const baseUrl = import.meta.env.BASE_URL;
  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;

    if (installButton) {
      installButton.hidden = false;
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;

    if (installButton) {
      installButton.hidden = true;
    }

    onInstalled?.();
  });

  if (installButton) {
    installButton.addEventListener("click", async () => {
      if (!deferredPrompt) {
        return;
      }

      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installButton.hidden = true;
    });
  }

  if (import.meta.env.DEV) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${baseUrl}sw.js`, {
      scope: baseUrl
    }).catch((error) => {
      console.error("Falha ao registrar service worker.", error);
    });
  });
}
