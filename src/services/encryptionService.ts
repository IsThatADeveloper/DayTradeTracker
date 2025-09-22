// src/services/encryptionService.ts
import CryptoJS from 'crypto-js';
import { getEnvironmentConfig } from '../contexts/environment';

class EncryptionService {
  private getEncryptionKey(): string {
    const config = getEnvironmentConfig();
    return config.encryption.key;
  }

  encryptSensitiveData(data: any): string {
    try {
      const key = this.getEncryptionKey();
      const jsonString = JSON.stringify(data);
      return CryptoJS.AES.encrypt(jsonString, key).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  decryptSensitiveData(encryptedData: string): any {
    try {
      const key = this.getEncryptionKey();
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Invalid encrypted data or wrong key');
      }
      
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  hashIdentifier(identifier: string): string {
    return CryptoJS.SHA256(identifier).toString();
  }

  // Generate secure random string for IDs
  generateSecureId(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length/2).toString();
  }
}

export const encryptionService = new EncryptionService();