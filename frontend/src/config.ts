import { Capacitor } from '@capacitor/core';

/**
 * App configuration.
 * VITE_API_BASE should be set for Capacitor builds (e.g. https://your-server.com or http://<LAN_IP>:8080).
 * On native mobile, defaults to your PC's LAN IP if VITE_API_BASE is not explicitly configured.
 * On web dev it defaults to '' (empty) so the Vite proxy handles /api routes.
 */
export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (Capacitor.isNativePlatform() ? 'http://10.60.45.202:8080' : '');
