import * as crypto from 'crypto';
import { EMAIL_BLIND_INDEX_SECRET, EMAIL_ENCRYPTION_KEY } from '@constants';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(EMAIL_ENCRYPTION_KEY, 'hex'),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decrypt = (text: string): string => {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) {
      // Not an encrypted value, return as is.
      // This can happen for data that existed before encryption was implemented
      return text;
    }
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(EMAIL_ENCRYPTION_KEY, 'hex'),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (_error) {
    return text;
  }
};

export const createBlindIndex = (text: string): string => {
  return crypto
    .createHmac('sha256', EMAIL_BLIND_INDEX_SECRET)
    .update(text)
    .digest('hex');
};
