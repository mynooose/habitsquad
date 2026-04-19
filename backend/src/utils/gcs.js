const { Storage } = require('@google-cloud/storage');
const path = require('path');
const crypto = require('crypto');

const BUCKET_NAME = process.env.GCS_BUCKET || 'demoimagesapp';

const storage = new Storage({
  keyFilename: process.env.GCS_KEY_FILE || path.join(__dirname, '../../gcs-key.json'),
  projectId: process.env.GCS_PROJECT_ID || 'alg-cv',
});

const bucket = storage.bucket(BUCKET_NAME);

async function uploadBuffer(buffer, mimeType = 'image/jpeg', prefix = 'uploads') {
  const ext = mimeType.split('/')[1] || 'jpg';
  const filename = `${prefix}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const file = bucket.file(filename);

  await file.save(buffer, {
    contentType: mimeType,
    metadata: { cacheControl: 'public, max-age=31536000' },
    resumable: false,
  });

  return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
}

// Accept data URL (base64) string, convert to buffer, upload
async function uploadDataUrl(dataUrl, prefix = 'uploads') {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Image too large (max 5MB)');
  }

  return uploadBuffer(buffer, mimeType, prefix);
}

module.exports = { uploadBuffer, uploadDataUrl, bucket };
