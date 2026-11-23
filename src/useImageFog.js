import { useEffect, useRef } from 'react';
import { createImageColorField } from './imageColors.js';

export function smoothstep(value) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

// The halftone masks and image trails follow the same animated clouds.
export function useImageFog({ imageRef, canvasRef, cloudRef, progress, src, loaded, active,
  loadingColor, loadingAccent, colorTransition }) {
  const arrivedImage = useRef(null);

  useEffect(() => {
    arrivedImage.current = null;
    const image = imageRef.current;
    if (!src || !loaded || !image?.complete || !image.naturalWidth) return;
    arrivedImage.current = { image, field: createImageColorField(image), arrivedAt: performance.now() };
  }, [src, loaded, imageRef]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const cloud = cloudRef.current;
    if (!canvas || !cloud) return;
    const mask = document.createElement('canvas');
    const accent = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const maskContext = mask.getContext('2d');
    const accentContext = accent.getContext('2d');
    if (!context || !maskContext || !accentContext) return;
    let request;
    let previousTime;
    let previousProgress = 0;
    let fill = 0;
    context.clearRect(0, 0, canvas.width, canvas.height);

    const draw = time => {
      const shown = progress.get();
      if (shown >= 60) return; // Freeze beneath the wash and final picture.
      request = requestAnimationFrame(draw);
      if (!canvas.clientWidth) return;
      const width = 128;
      const height = Math.max(1, Math.round(width * canvas.clientHeight / canvas.clientWidth));
      if (canvas.width !== width || canvas.height !== height || mask.width !== width || mask.height !== height) {
        canvas.width = mask.width = accent.width = width;
        canvas.height = mask.height = accent.height = height;
      }
      if (shown < previousProgress) { maskContext.clearRect(0, 0, width, height); fill = 0; }
      previousProgress = shown;
      // Match accumulation on both 60Hz and high-refresh screens.
      const frames = previousTime ? Math.min(3, (time - previousTime) / (1000 / 60)) : 1;
      previousTime = time;
      maskContext.globalCompositeOperation = 'destination-out';
      maskContext.globalAlpha = 1 - (1 - 0.016 * (1 - shown / 60)) ** frames;
      maskContext.fillRect(0, 0, width, height);
      maskContext.globalCompositeOperation = 'source-over';
      maskContext.globalAlpha = 1;
      // Unlike the lingering cyan trails, this mask contains only the clouds'
      // current footprint, so they can reveal and leave the fixed brown patch.
      accentContext.clearRect(0, 0, width, height);
      const styles = getComputedStyle(cloud);
      const growth = Number(styles.getPropertyValue('--cloud-grow')) || 1;
      for (const name of ['a', 'b']) {
        const percent = key => parseFloat(styles.getPropertyValue(`--cloud-${name}-${key}`)) / 100;
        const cloudWidth = width * percent('w') * growth;
        const cloudHeight = height * percent('h') * growth;
        const x = (width - cloudWidth) * (0.5 + percent('x1') + percent('x2')) + cloudWidth / 2;
        const y = (height - cloudHeight) * (0.5 + percent('y1') + percent('y2')) + cloudHeight / 2;
        const radius = cloudWidth * 0.3;
        if (!Number.isFinite(x + y + radius + cloudHeight) || radius <= 0) continue;
        for (const [target, opacity] of [[maskContext, 1 - 0.96 ** frames], [accentContext, 1]]) {
          target.save();
          target.translate(x, y);
          target.scale(1, cloudHeight / cloudWidth);
          const gradient = target.createRadialGradient(0, 0, 0, 0, 0, radius);
          gradient.addColorStop(0, `rgb(0 0 0 / ${opacity})`);
          if (target === accentContext) gradient.addColorStop(0.45, 'rgb(0 0 0)');
          gradient.addColorStop(1, 'rgb(0 0 0 / 0)');
          target.fillStyle = gradient;
          target.fillRect(-radius, -radius, radius * 2, radius * 2);
          target.restore();
        }
      }
      fill += (smoothstep((shown - 30) / 24) - fill) * (1 - 0.94 ** frames);
      context.globalCompositeOperation = 'copy';
      context.globalAlpha = 1;
      context.drawImage(mask, 0, 0);
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = fill;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-in';
      context.globalAlpha = 1;
      context.fillStyle = loadingColor;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-atop';
      // A smaller stationary color field, not a spot attached to either cloud.
      const x = width * 0.36;
      const y = height * 0.44;
      const brown = accentContext.createRadialGradient(x, y, 0, x, y, width * 0.105);
      brown.addColorStop(0, loadingAccent);
      brown.addColorStop(0.25, loadingAccent);
      brown.addColorStop(1, 'transparent');
      accentContext.globalCompositeOperation = 'source-in';
      accentContext.fillStyle = brown;
      accentContext.fillRect(0, 0, width, height);
      accentContext.globalCompositeOperation = 'source-over';
      context.globalAlpha = 0.9;
      context.drawImage(accent, 0, 0);
      const arrived = arrivedImage.current;
      if (arrived) {
        const blend = smoothstep((time - arrived.arrivedAt) / Math.max(1, colorTransition * 1000));
        const { image, field } = arrived;
        const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
        const imageWidth = image.naturalWidth * scale;
        const imageHeight = image.naturalHeight * scale;
        context.globalCompositeOperation = 'source-atop';
        context.globalAlpha = blend;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        if (field) context.drawImage(field, 0, 0, width, height);
        else context.drawImage(image, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
        // Colors arrive first; only then do image details form in the fog.
        context.globalAlpha = blend * smoothstep((shown - 25) / 30);
        context.drawImage(image, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
      }
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
    };
    request = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(request);
  }, [active, loadingColor, loadingAccent, colorTransition, canvasRef, cloudRef, progress]);
}
