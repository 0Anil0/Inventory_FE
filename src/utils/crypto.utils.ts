import CryptoJS from 'crypto-js';

/**
 * Encrypts/hashes plain text password on the frontend before sending payload.
 * Prevents raw plaintext passwords from appearing in network payloads.
 */
export const encryptPasswordPayload = (plainPassword: string): string => {
  if (!plainPassword) return '';
  return CryptoJS.SHA256(plainPassword).toString(CryptoJS.enc.Hex);
};
