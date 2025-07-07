// src/types/security.ts

export interface SecurityHeaders {
  'x-request-id': string;
  'x-request-timestamp': number;
  'x-device-fingerprint': string;
  'x-request-signature': string;
}

export interface SecurityContext extends SecurityHeaders {
  requestId: string;
  timestamp: number;
  fingerprint: string;
}
