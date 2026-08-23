// frontend/src/utils/authEvents.js

export const AUTH_EVENTS = {
  LOGIN: 'ebid:login',
  LOGOUT: 'ebid:logout',
  TOKEN_EXPIRED: 'ebid:token-expired',
};

export const emitAuthEvent = (eventName, detail = {}) => {
  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail,
    })
  );
};

export const emitLoginEvent = (user = {}) => {
  emitAuthEvent(AUTH_EVENTS.LOGIN, { user });
};

export const emitLogoutEvent = () => {
  emitAuthEvent(AUTH_EVENTS.LOGOUT);
};

export const emitTokenExpiredEvent = () => {
  emitAuthEvent(AUTH_EVENTS.TOKEN_EXPIRED);
};

export const onAuthEvent = (eventName, callback) => {
  window.addEventListener(eventName, callback);

  // Return cleanup function
  return () => {
    window.removeEventListener(eventName, callback);
  };
};
