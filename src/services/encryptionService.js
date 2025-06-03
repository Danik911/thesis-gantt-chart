import nacl from 'tweetnacl';
import { encodeUTF8, decodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';
import CryptoJS from 'crypto-js';

class EncryptionService {
  constructor() {
    this.keyPair = null;
    this.sharedKeys = new Map(); // Store shared keys for different recipients
    this.initializeKeyPair();
  }

  // Initialize or load user's key pair
  initializeKeyPair() {
    const storedKeyPair = this.getStoredKeyPair();
    if (storedKeyPair) {
      this.keyPair = storedKeyPair;
    } else {
      this.generateNewKeyPair();
    }
  }

  // Generate a new key pair for the user
  generateNewKeyPair() {
    this.keyPair = nacl.box.keyPair();
    this.storeKeyPair(this.keyPair);
    return this.keyPair;
  }

  // Get the public key for sharing
  getPublicKey() {
    return this.keyPair ? encodeBase64(this.keyPair.publicKey) : null;
  }

  // Store key pair securely in localStorage (in production, use more secure storage)
  storeKeyPair(keyPair) {
    try {
      const keyData = {
        publicKey: encodeBase64(keyPair.publicKey),
        secretKey: encodeBase64(keyPair.secretKey)
      };
      localStorage.setItem('encryptionKeyPair', JSON.stringify(keyData));
    } catch (error) {
      console.error('Failed to store key pair:', error);
    }
  }

  // Retrieve stored key pair
  getStoredKeyPair() {
    try {
      const keyData = localStorage.getItem('encryptionKeyPair');
      if (keyData) {
        const parsed = JSON.parse(keyData);
        return {
          publicKey: decodeBase64(parsed.publicKey),
          secretKey: decodeBase64(parsed.secretKey)
        };
      }
    } catch (error) {
      console.error('Failed to retrieve key pair:', error);
    }
    return null;
  }

  // Encrypt a message for a specific recipient
  encryptMessage(message, recipientPublicKey) {
    try {
      if (!this.keyPair) {
        throw new Error('No key pair available for encryption');
      }

      const recipientKey = typeof recipientPublicKey === 'string' 
        ? decodeBase64(recipientPublicKey) 
        : recipientPublicKey;

      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      const messageUint8 = encodeUTF8(message);
      
      const encrypted = nacl.box(messageUint8, nonce, recipientKey, this.keyPair.secretKey);
      
      return {
        encrypted: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
        senderPublicKey: encodeBase64(this.keyPair.publicKey)
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error(`Failed to encrypt message: ${error.message}`);
    }
  }

  // Decrypt a message from a sender
  decryptMessage(encryptedData, senderPublicKey) {
    try {
      if (!this.keyPair) {
        throw new Error('No key pair available for decryption');
      }

      const senderKey = typeof senderPublicKey === 'string' 
        ? decodeBase64(senderPublicKey) 
        : senderPublicKey;

      const encrypted = decodeBase64(encryptedData.encrypted);
      const nonce = decodeBase64(encryptedData.nonce);
      
      const decrypted = nacl.box.open(encrypted, nonce, senderKey, this.keyPair.secretKey);
      
      if (!decrypted) {
        throw new Error('Failed to decrypt message - invalid signature or tampered data');
      }
      
      return decodeUTF8(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error(`Failed to decrypt message: ${error.message}`);
    }
  }

  // Encrypt data symmetrically with a password
  encryptWithPassword(data, password) {
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), password).toString();
      return encrypted;
    } catch (error) {
      console.error('Password encryption failed:', error);
      throw new Error(`Failed to encrypt with password: ${error.message}`);
    }
  }

  // Decrypt data symmetrically with a password
  decryptWithPassword(encryptedData, password) {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Password decryption failed:', error);
      throw new Error(`Failed to decrypt with password: ${error.message}`);
    }
  }

  // Encrypt file content
  encryptFile(fileContent, recipientPublicKey) {
    try {
      if (!this.keyPair) {
        throw new Error('No key pair available for file encryption');
      }

      const recipientKey = typeof recipientPublicKey === 'string' 
        ? decodeBase64(recipientPublicKey) 
        : recipientPublicKey;

      // Convert file content to Uint8Array if it's not already
      let fileBytes;
      if (fileContent instanceof ArrayBuffer) {
        fileBytes = new Uint8Array(fileContent);
      } else if (typeof fileContent === 'string') {
        fileBytes = encodeUTF8(fileContent);
      } else {
        fileBytes = fileContent;
      }

      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      const encrypted = nacl.box(fileBytes, nonce, recipientKey, this.keyPair.secretKey);
      
      return {
        encrypted: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
        senderPublicKey: encodeBase64(this.keyPair.publicKey)
      };
    } catch (error) {
      console.error('File encryption failed:', error);
      throw new Error(`Failed to encrypt file: ${error.message}`);
    }
  }

  // Decrypt file content
  decryptFile(encryptedFileData, senderPublicKey) {
    try {
      if (!this.keyPair) {
        throw new Error('No key pair available for file decryption');
      }

      const senderKey = typeof senderPublicKey === 'string' 
        ? decodeBase64(senderPublicKey) 
        : senderPublicKey;

      const encrypted = decodeBase64(encryptedFileData.encrypted);
      const nonce = decodeBase64(encryptedFileData.nonce);
      
      const decrypted = nacl.box.open(encrypted, nonce, senderKey, this.keyPair.secretKey);
      
      if (!decrypted) {
        throw new Error('Failed to decrypt file - invalid signature or tampered data');
      }
      
      return decrypted;
    } catch (error) {
      console.error('File decryption failed:', error);
      throw new Error(`Failed to decrypt file: ${error.message}`);
    }
  }

  // Generate a secure random token
  generateSecureToken(length = 32) {
    const bytes = nacl.randomBytes(length);
    return encodeBase64(bytes);
  }

  // Hash data using CryptoJS
  hashData(data) {
    return CryptoJS.SHA256(JSON.stringify(data)).toString();
  }

  // Verify data integrity
  verifyDataIntegrity(data, hash) {
    const computedHash = this.hashData(data);
    return computedHash === hash;
  }

  // Sign data with private key
  signData(data) {
    try {
      if (!this.keyPair) {
        throw new Error('No key pair available for signing');
      }

      const dataUint8 = encodeUTF8(JSON.stringify(data));
      const signature = nacl.sign.detached(dataUint8, this.keyPair.secretKey);
      
      return {
        signature: encodeBase64(signature),
        publicKey: encodeBase64(this.keyPair.publicKey)
      };
    } catch (error) {
      console.error('Data signing failed:', error);
      throw new Error(`Failed to sign data: ${error.message}`);
    }
  }

  // Verify data signature
  verifySignature(data, signature, publicKey) {
    try {
      const dataUint8 = encodeUTF8(JSON.stringify(data));
      const signatureUint8 = decodeBase64(signature);
      const publicKeyUint8 = typeof publicKey === 'string' ? decodeBase64(publicKey) : publicKey;
      
      return nacl.sign.detached.verify(dataUint8, signatureUint8, publicKeyUint8);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  // Clear stored encryption data (for logout)
  clearEncryptionData() {
    this.keyPair = null;
    this.sharedKeys.clear();
    localStorage.removeItem('encryptionKeyPair');
  }

  // Get encryption status
  getEncryptionStatus() {
    return {
      hasKeyPair: !!this.keyPair,
      publicKey: this.getPublicKey(),
      sharedKeysCount: this.sharedKeys.size
    };
  }
}

// Create a singleton instance
const encryptionService = new EncryptionService();

export default encryptionService; 