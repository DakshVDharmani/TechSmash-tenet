import CryptoJS from 'crypto-js';

// Encrypt message with AES key
export const encryptMessage = (message, key) => {
  return CryptoJS.AES.encrypt(message, key).toString();
};

// Decrypt message with AES key
export const decryptMessage = (ciphertext, key) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '🔒 Unable to decrypt';
  }
};

// Generate random AES key per chat
export const generateAESKey = () => {
  return CryptoJS.lib.WordArray.random(32).toString(); // 256-bit key
};