// Production - utilise l'origine actuelle (même domaine)
const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = typeof window !== 'undefined' ? window.location.host : '';

export const environment = {
  production: true,
  wsUrl: `${protocol}//${host}`,
};
