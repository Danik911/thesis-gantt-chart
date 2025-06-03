import encryptionService from '../encryptionService';
import nacl from 'tweetnacl';
import { encodeUTF8, decodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';
import CryptoJS from 'crypto-js';

// Mock tweetnacl
jest.mock('tweetnacl', () => ({
  box: {
    keyPair: jest.fn(),
    nonceLength: 24,
  },
  randomBytes: jest.fn(),
  sign: {
    detached: jest.fn(),
  },
}));

// Mock tweetnacl-util
jest.mock('tweetnacl-util', () => ({
  encodeUTF8: jest.fn(),
  decodeUTF8: jest.fn(),
  encodeBase64: jest.fn(),
  decodeBase64: jest.fn(),
}));

// Mock crypto-js
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  SHA256: jest.fn(),
  enc: {
    Utf8: {},
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('EncryptionService', () => {
  const mockKeyPair = {
    publicKey: new Uint8Array([1, 2, 3, 4]),
    secretKey: new Uint8Array([5, 6, 7, 8]),
  };

  const mockEncrypted = new Uint8Array([9, 10, 11, 12]);
  const mockNonce = new Uint8Array([13, 14, 15, 16]);

  beforeEach(() => {
    jest.clearAllMocks();
    encryptionService.clearEncryptionData();

    // Setup default mocks
    nacl.box.keyPair.mockReturnValue(mockKeyPair);
    nacl.randomBytes.mockReturnValue(mockNonce);
    encodeBase64.mockImplementation(arr => `base64_${Array.from(arr).join(',')}`);
    decodeBase64.mockImplementation(str => new Uint8Array(str.replace('base64_', '').split(',').map(Number)));
    encodeUTF8.mockImplementation(str => new Uint8Array(str.split('').map(c => c.charCodeAt(0))));
    decodeUTF8.mockImplementation(arr => String.fromCharCode(...arr));
  });

  describe('Key Pair Management', () => {
    describe('generateNewKeyPair', () => {
      it('should generate a new key pair', () => {
        const keyPair = encryptionService.generateNewKeyPair();

        expect(nacl.box.keyPair).toHaveBeenCalled();
        expect(keyPair).toBe(mockKeyPair);
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'encryptionKeyPair',
          expect.stringContaining('base64_')
        );
      });
    });

    describe('getPublicKey', () => {
      it('should return encoded public key when key pair exists', () => {
        encryptionService.generateNewKeyPair();

        const publicKey = encryptionService.getPublicKey();

        expect(encodeBase64).toHaveBeenCalledWith(mockKeyPair.publicKey);
        expect(publicKey).toBe(`base64_${Array.from(mockKeyPair.publicKey).join(',')}`);
      });

      it('should return null when no key pair exists', () => {
        const publicKey = encryptionService.getPublicKey();

        expect(publicKey).toBe(null);
      });
    });

    describe('storeKeyPair', () => {
      it('should store key pair in localStorage', () => {
        encryptionService.storeKeyPair(mockKeyPair);

        expect(localStorage.setItem).toHaveBeenCalledWith(
          'encryptionKeyPair',
          expect.stringContaining('publicKey')
        );
      });

      it('should handle storage errors gracefully', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        localStorage.setItem.mockImplementation(() => {
          throw new Error('Storage error');
        });

        expect(() => encryptionService.storeKeyPair(mockKeyPair)).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to store key pair:', expect.any(Error));

        consoleSpy.mockRestore();
      });
    });

    describe('getStoredKeyPair', () => {
      it('should retrieve stored key pair', () => {
        const mockStoredData = JSON.stringify({
          publicKey: 'base64_public_key',
          secretKey: 'base64_secret_key'
        });
        localStorage.getItem.mockReturnValue(mockStoredData);

        const keyPair = encryptionService.getStoredKeyPair();

        expect(localStorage.getItem).toHaveBeenCalledWith('encryptionKeyPair');
        expect(decodeBase64).toHaveBeenCalledWith('base64_public_key');
        expect(decodeBase64).toHaveBeenCalledWith('base64_secret_key');
        expect(keyPair).toBeDefined();
      });

      it('should return null when no data stored', () => {
        localStorage.getItem.mockReturnValue(null);

        const keyPair = encryptionService.getStoredKeyPair();

        expect(keyPair).toBe(null);
      });

      it('should handle retrieval errors gracefully', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        localStorage.getItem.mockImplementation(() => {
          throw new Error('Retrieval error');
        });

        const keyPair = encryptionService.getStoredKeyPair();

        expect(keyPair).toBe(null);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to retrieve key pair:', expect.any(Error));

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Message Encryption/Decryption', () => {
    beforeEach(() => {
      encryptionService.generateNewKeyPair();
      nacl.box = jest.fn().mockReturnValue(mockEncrypted);
      nacl.box.open = jest.fn().mockReturnValue(new Uint8Array([72, 101, 108, 108, 111])); // "Hello"
    });

    describe('encryptMessage', () => {
      it('should encrypt message successfully', () => {
        const message = 'Hello World';
        const recipientPublicKey = 'base64_recipient_key';

        const result = encryptionService.encryptMessage(message, recipientPublicKey);

        expect(encodeUTF8).toHaveBeenCalledWith(message);
        expect(nacl.randomBytes).toHaveBeenCalledWith(nacl.box.nonceLength);
        expect(nacl.box).toHaveBeenCalled();
        expect(result).toEqual({
          encrypted: expect.stringContaining('base64_'),
          nonce: expect.stringContaining('base64_'),
          senderPublicKey: expect.stringContaining('base64_')
        });
      });

      it('should throw error when no key pair available', () => {
        encryptionService.clearEncryptionData();

        expect(() => encryptionService.encryptMessage('test', 'key')).toThrow('No key pair available for encryption');
      });

      it('should handle encryption errors', () => {
        nacl.box.mockImplementation(() => {
          throw new Error('Encryption failed');
        });

        expect(() => encryptionService.encryptMessage('test', 'key')).toThrow('Failed to encrypt message: Encryption failed');
      });
    });

    describe('decryptMessage', () => {
      it('should decrypt message successfully', () => {
        const encryptedData = {
          encrypted: 'base64_encrypted',
          nonce: 'base64_nonce'
        };
        const senderPublicKey = 'base64_sender_key';

        const result = encryptionService.decryptMessage(encryptedData, senderPublicKey);

        expect(decodeBase64).toHaveBeenCalledWith('base64_encrypted');
        expect(decodeBase64).toHaveBeenCalledWith('base64_nonce');
        expect(nacl.box.open).toHaveBeenCalled();
        expect(decodeUTF8).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should throw error when no key pair available', () => {
        encryptionService.clearEncryptionData();

        expect(() => encryptionService.decryptMessage({}, 'key')).toThrow('No key pair available for decryption');
      });

      it('should throw error when decryption fails', () => {
        nacl.box.open.mockReturnValue(null);

        expect(() => encryptionService.decryptMessage({ encrypted: 'test', nonce: 'test' }, 'key'))
          .toThrow('Failed to decrypt message - invalid signature or tampered data');
      });
    });
  });

  describe('Password-based Encryption', () => {
    describe('encryptWithPassword', () => {
      it('should encrypt data with password', () => {
        const data = { message: 'secret' };
        const password = 'password123';
        const encryptedString = 'encrypted_result';

        CryptoJS.AES.encrypt.mockReturnValue({ toString: () => encryptedString });

        const result = encryptionService.encryptWithPassword(data, password);

        expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(JSON.stringify(data), password);
        expect(result).toBe(encryptedString);
      });

      it('should handle encryption errors', () => {
        CryptoJS.AES.encrypt.mockImplementation(() => {
          throw new Error('Encryption failed');
        });

        expect(() => encryptionService.encryptWithPassword({}, 'password'))
          .toThrow('Failed to encrypt with password: Encryption failed');
      });
    });

    describe('decryptWithPassword', () => {
      it('should decrypt data with password', () => {
        const encryptedData = 'encrypted_data';
        const password = 'password123';
        const decryptedString = '{"message":"secret"}';

        CryptoJS.AES.decrypt.mockReturnValue({
          toString: () => decryptedString
        });

        const result = encryptionService.decryptWithPassword(encryptedData, password);

        expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(encryptedData, password);
        expect(result).toEqual({ message: 'secret' });
      });

      it('should handle decryption errors', () => {
        CryptoJS.AES.decrypt.mockImplementation(() => {
          throw new Error('Decryption failed');
        });

        expect(() => encryptionService.decryptWithPassword('data', 'password'))
          .toThrow('Failed to decrypt with password: Decryption failed');
      });
    });
  });

  describe('File Encryption/Decryption', () => {
    beforeEach(() => {
      encryptionService.generateNewKeyPair();
      nacl.box = jest.fn().mockReturnValue(mockEncrypted);
      nacl.box.open = jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4]));
    });

    describe('encryptFile', () => {
      it('should encrypt file content as string', () => {
        const fileContent = 'file content';
        const recipientPublicKey = 'base64_recipient_key';

        const result = encryptionService.encryptFile(fileContent, recipientPublicKey);

        expect(encodeUTF8).toHaveBeenCalledWith(fileContent);
        expect(nacl.box).toHaveBeenCalled();
        expect(result).toEqual({
          encrypted: expect.stringContaining('base64_'),
          nonce: expect.stringContaining('base64_'),
          senderPublicKey: expect.stringContaining('base64_')
        });
      });

      it('should encrypt file content as ArrayBuffer', () => {
        const fileContent = new ArrayBuffer(4);
        const recipientPublicKey = 'base64_recipient_key';

        const result = encryptionService.encryptFile(fileContent, recipientPublicKey);

        expect(nacl.box).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should encrypt file content as Uint8Array', () => {
        const fileContent = new Uint8Array([1, 2, 3, 4]);
        const recipientPublicKey = 'base64_recipient_key';

        const result = encryptionService.encryptFile(fileContent, recipientPublicKey);

        expect(nacl.box).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should throw error when no key pair available', () => {
        encryptionService.clearEncryptionData();

        expect(() => encryptionService.encryptFile('content', 'key'))
          .toThrow('No key pair available for file encryption');
      });
    });

    describe('decryptFile', () => {
      it('should decrypt file content successfully', () => {
        const encryptedFileData = {
          encrypted: 'base64_encrypted',
          nonce: 'base64_nonce'
        };
        const senderPublicKey = 'base64_sender_key';

        const result = encryptionService.decryptFile(encryptedFileData, senderPublicKey);

        expect(nacl.box.open).toHaveBeenCalled();
        expect(result).toEqual(new Uint8Array([1, 2, 3, 4]));
      });

      it('should throw error when no key pair available', () => {
        encryptionService.clearEncryptionData();

        expect(() => encryptionService.decryptFile({}, 'key'))
          .toThrow('No key pair available for file decryption');
      });

      it('should throw error when decryption fails', () => {
        nacl.box.open.mockReturnValue(null);

        expect(() => encryptionService.decryptFile({ encrypted: 'test', nonce: 'test' }, 'key'))
          .toThrow('Failed to decrypt file - invalid signature or tampered data');
      });
    });
  });

  describe('Utility Functions', () => {
    describe('generateSecureToken', () => {
      it('should generate token with default length', () => {
        const token = encryptionService.generateSecureToken();

        expect(nacl.randomBytes).toHaveBeenCalledWith(32);
        expect(encodeBase64).toHaveBeenCalled();
        expect(token).toBeDefined();
      });

      it('should generate token with custom length', () => {
        const customLength = 64;
        const token = encryptionService.generateSecureToken(customLength);

        expect(nacl.randomBytes).toHaveBeenCalledWith(customLength);
        expect(token).toBeDefined();
      });
    });

    describe('hashData', () => {
      it('should hash data using SHA256', () => {
        const data = { test: 'data' };
        const hashResult = { toString: () => 'hash_result' };
        CryptoJS.SHA256.mockReturnValue(hashResult);

        const result = encryptionService.hashData(data);

        expect(CryptoJS.SHA256).toHaveBeenCalledWith(JSON.stringify(data));
        expect(result).toBe('hash_result');
      });
    });

    describe('verifyDataIntegrity', () => {
      it('should verify data integrity correctly', () => {
        const data = { test: 'data' };
        const hash = 'correct_hash';
        CryptoJS.SHA256.mockReturnValue({ toString: () => hash });

        const result = encryptionService.verifyDataIntegrity(data, hash);

        expect(result).toBe(true);
      });

      it('should detect data tampering', () => {
        const data = { test: 'data' };
        const hash = 'incorrect_hash';
        CryptoJS.SHA256.mockReturnValue({ toString: () => 'different_hash' });

        const result = encryptionService.verifyDataIntegrity(data, hash);

        expect(result).toBe(false);
      });
    });
  });

  describe('Digital Signatures', () => {
    beforeEach(() => {
      encryptionService.generateNewKeyPair();
      nacl.sign.detached.mockReturnValue(new Uint8Array([1, 2, 3, 4]));
      nacl.sign.detached.verify = jest.fn().mockReturnValue(true);
    });

    describe('signData', () => {
      it('should sign data successfully', () => {
        const data = { message: 'test' };

        const result = encryptionService.signData(data);

        expect(encodeUTF8).toHaveBeenCalledWith(JSON.stringify(data));
        expect(nacl.sign.detached).toHaveBeenCalled();
        expect(result).toEqual({
          signature: expect.stringContaining('base64_'),
          publicKey: expect.stringContaining('base64_')
        });
      });

      it('should throw error when no key pair available', () => {
        encryptionService.clearEncryptionData();

        expect(() => encryptionService.signData({}))
          .toThrow('No key pair available for signing');
      });

      it('should handle signing errors', () => {
        nacl.sign.detached.mockImplementation(() => {
          throw new Error('Signing failed');
        });

        expect(() => encryptionService.signData({}))
          .toThrow('Failed to sign data: Signing failed');
      });
    });

    describe('verifySignature', () => {
      it('should verify signature successfully', () => {
        const data = { message: 'test' };
        const signature = 'base64_signature';
        const publicKey = 'base64_public_key';

        const result = encryptionService.verifySignature(data, signature, publicKey);

        expect(encodeUTF8).toHaveBeenCalledWith(JSON.stringify(data));
        expect(decodeBase64).toHaveBeenCalledWith(signature);
        expect(decodeBase64).toHaveBeenCalledWith(publicKey);
        expect(nacl.sign.detached.verify).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle verification errors gracefully', () => {
        nacl.sign.detached.verify.mockImplementation(() => {
          throw new Error('Verification failed');
        });

        const result = encryptionService.verifySignature({}, 'sig', 'key');

        expect(result).toBe(false);
      });

      it('should handle public key as Uint8Array', () => {
        const data = { message: 'test' };
        const signature = 'base64_signature';
        const publicKey = new Uint8Array([1, 2, 3, 4]);

        const result = encryptionService.verifySignature(data, signature, publicKey);

        expect(nacl.sign.detached.verify).toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });
  });

  describe('Service Management', () => {
    describe('clearEncryptionData', () => {
      it('should clear all encryption data', () => {
        encryptionService.generateNewKeyPair();
        encryptionService.sharedKeys.set('test', 'key');

        encryptionService.clearEncryptionData();

        expect(encryptionService.keyPair).toBe(null);
        expect(encryptionService.sharedKeys.size).toBe(0);
        expect(localStorage.removeItem).toHaveBeenCalledWith('encryptionKeyPair');
      });
    });

    describe('getEncryptionStatus', () => {
      it('should return encryption status with key pair', () => {
        encryptionService.generateNewKeyPair();

        const status = encryptionService.getEncryptionStatus();

        expect(status).toEqual({
          hasKeyPair: true,
          publicKey: expect.stringContaining('base64_'),
          sharedKeysCount: 0
        });
      });

      it('should return encryption status without key pair', () => {
        encryptionService.clearEncryptionData();

        const status = encryptionService.getEncryptionStatus();

        expect(status).toEqual({
          hasKeyPair: false,
          publicKey: null,
          sharedKeysCount: 0
        });
      });

      it('should count shared keys correctly', () => {
        encryptionService.generateNewKeyPair();
        encryptionService.sharedKeys.set('user1', 'key1');
        encryptionService.sharedKeys.set('user2', 'key2');

        const status = encryptionService.getEncryptionStatus();

        expect(status.sharedKeysCount).toBe(2);
      });
    });
  });

  describe('Initialization', () => {
    it('should initialize with stored key pair if available', () => {
      const mockStoredData = JSON.stringify({
        publicKey: 'base64_stored_public',
        secretKey: 'base64_stored_secret'
      });
      localStorage.getItem.mockReturnValue(mockStoredData);

      // Create new instance to trigger initialization
      const newService = new (encryptionService.constructor)();

      expect(localStorage.getItem).toHaveBeenCalledWith('encryptionKeyPair');
      expect(newService.keyPair).toBeDefined();
    });

    it('should generate new key pair if none stored', () => {
      localStorage.getItem.mockReturnValue(null);

      // Create new instance to trigger initialization
      new (encryptionService.constructor)();

      expect(nacl.box.keyPair).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in stored key pair', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      localStorage.getItem.mockReturnValue('invalid json');

      const keyPair = encryptionService.getStoredKeyPair();

      expect(keyPair).toBe(null);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle decodeBase64 errors in message decryption', () => {
      encryptionService.generateNewKeyPair();
      decodeBase64.mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      expect(() => encryptionService.decryptMessage({ encrypted: 'invalid', nonce: 'invalid' }, 'key'))
        .toThrow('Failed to decrypt message: Invalid base64');
    });

    it('should handle nacl.box errors in message encryption', () => {
      encryptionService.generateNewKeyPair();
      nacl.box.mockImplementation(() => {
        throw new Error('Box encryption failed');
      });

      expect(() => encryptionService.encryptMessage('test', 'key'))
        .toThrow('Failed to encrypt message: Box encryption failed');
    });
  });
}); 