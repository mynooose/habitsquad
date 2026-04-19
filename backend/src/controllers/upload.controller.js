const { uploadDataUrl } = require('../utils/gcs');

async function uploadImage(req, res, next) {
  try {
    const { dataUrl, prefix } = req.body;
    if (!dataUrl) return res.status(400).json({ error: 'dataUrl is required' });

    const validPrefixes = ['avatars', 'proofs'];
    const safePrefix = validPrefixes.includes(prefix) ? prefix : 'uploads';

    const url = await uploadDataUrl(dataUrl, safePrefix);
    res.json({ url });
  } catch (error) {
    if (error.message?.includes('too large')) {
      return res.status(413).json({ error: error.message });
    }
    if (error.message?.includes('Invalid data URL')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = { uploadImage };
