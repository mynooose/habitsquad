'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, Loader2 } from 'lucide-react';

// Returns a JPEG dataURL of the cropped square at the natural image resolution.
async function cropToDataUrl(imageSrc, croppedAreaPixels, outputSize = 512) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    img,
    croppedAreaPixels.x, croppedAreaPixels.y,
    croppedAreaPixels.width, croppedAreaPixels.height,
    0, 0, outputSize, outputSize
  );
  return canvas.toDataURL('image/jpeg', 0.9);
}

export default function ImageCropper({ src, title = 'Crop image', onCancel, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_, areaPx) => setCroppedAreaPixels(areaPx), []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const dataUrl = await cropToDataUrl(src, croppedAreaPixels);
      await onConfirm(dataUrl);
    } catch (err) {
      console.error('Crop failed:', err);
      alert('Could not process image. Try a smaller file.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg-solid)] border border-[var(--card-border)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--card-border)]">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative bg-black" style={{ height: '320px' }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="round"
            showGrid={false}
          />
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted font-semibold">Zoom</label>
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-brand-500 mt-1" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] font-medium">Cancel</button>
            <button type="button" onClick={handleConfirm} disabled={saving || !croppedAreaPixels}
              className="flex-1 py-2.5 rounded-xl gradient-brand text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
