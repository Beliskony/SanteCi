// app/frontend/lib/paiementpro.ts
// Singleton — charge le SDK PaiementPro une seule fois quelle que soit
// la page qui l'appelle (PaymentPage, SubscriptionSection, etc.)

// app/frontend/lib/paiementpro.ts — ajouter en haut

declare global {
  interface Window {
    PaiementPro: new (merchantId: string) => {
      amount:              number;
      description:         string;
      channel:             string;
      countryCurrencyCode: string;
      referenceNumber:     string;
      customerEmail:       string;
      customerFirstName:   string;
      customerLastname:    string;
      customerPhoneNumber: string;
      notificationURL:     string;
      returnURL:           string;
      returnContext:       string;
      url:                 string;
      success:             boolean;
      getUrlPayment:       () => Promise<void>;
    };
  }
}


let sdkPromise: Promise<void> | null = null;

export function loadPaiementProSDK(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('SSR'));
  }

  // Déjà chargé et prêt
  if (window.PaiementPro && typeof window.PaiementPro === 'function') {
    return Promise.resolve();
  }

  // Déjà en cours de chargement → retourner la même promesse
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    // Script déjà dans le DOM (HMR, double render, etc.)
    const existing = document.querySelector('script[src*="paiementpro"]');
    if (existing) {
      // Attendre que le constructeur soit disponible
      waitForConstructor(resolve, reject);
      return;
    }

    const script  = document.createElement('script');
    script.src    = 'https://www.paiementpro.net/webservice/onlinepayment/js/paiementpro.v1.0.1.js';
    script.async  = true;
    script.onload = () => waitForConstructor(resolve, reject);
    script.onerror = () => {
      sdkPromise = null; // permettre une nouvelle tentative
      reject(new Error('Impossible de charger le SDK PaiementPro.'));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

function waitForConstructor(
  resolve: () => void,
  reject:  (err: Error) => void
): void {
  let attempts = 0;
  const check = setInterval(() => {
    attempts++;

    // Log pour voir ce qui est disponible sur window
    if (attempts === 1) {
      console.log('[PaiementPro] window.PaiementPro =', window.PaiementPro);
      console.log('[PaiementPro] typeof =', typeof window.PaiementPro);
      // Lister les clés exposées par le SDK
      console.log('[PaiementPro] keys window =',
        Object.keys(window).filter(k => k.toLowerCase().includes('paiement'))
      );
    }
    
    if (window.PaiementPro && typeof window.PaiementPro === 'function') {
      clearInterval(check);
      resolve();
    } else if (attempts > 30) { // timeout 3s
      clearInterval(check);
      sdkPromise = null;
      reject(new Error('PaiementPro SDK non initialisé après chargement.'));
    }
  }, 100);
}