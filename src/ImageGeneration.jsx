import React, { useEffect, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { smoothstep, useImageFog } from './useImageFog.js';
import './ImageGeneration.css';

const easeOut = [0.23, 1, 0.32, 1];
const entrance = { duration: 0.28, ease: easeOut };
const stages = ['Generating scene', 'Coloring', 'Loading'];
const dotLayers = [{ radius: 0.9, falloff: 70 }, { radius: 1.4, falloff: 50 }, { radius: 1.9, falloff: 30 }];

function cloudMask(falloff) {
  return `radial-gradient(ellipse at center, #000 ${falloff * 0.3}%,
    rgb(0 0 0 / 0.84) ${falloff * 0.45}%, rgb(0 0 0 / 0.5) ${falloff * 0.6}%,
    rgb(0 0 0 / 0.16) ${falloff * 0.75}%, transparent ${falloff * 0.9}%)`;
}

export function ImageGeneration({
  src = '/images/stingrays.webp', alt = 'Stingrays gliding through clear turquoise water',
  duration = 6.4, autoPlay = true, aspectRatio = '2 / 3', onComplete,
  loadingColor = '#7dc2c7', loadingAccent = '#8f6b50', colorTransition = 1.8,
}) {
  const reducedMotion = useReducedMotion();
  const instant = !!reducedMotion || !autoPlay;
  const [complete, setComplete] = useState(false);
  const [phase, setPhase] = useState('forming');
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [stage, setStage] = useState(0);
  const ready = !!src && complete && loaded && !failed;
  const statusHidden = !failed && ((instant && loaded && !!src) || ready);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const cloudRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const progress = useMotionValue(instant ? 100 : 0);
  const filled = useTransform(progress, value => smoothstep((value - 30) / 24));
  const dotOpacity = useTransform(filled, value => 1 - value);
  const cloudGrow = useTransform(progress, [0, 100], [0.72, 1]);
  const refine = useTransform(progress, [60, 100], [1, 0]);
  // The original spectral glow travels outward with the zoom, never down the frame.
  const spectrumOpacity = useTransform(progress, [60, 61, 72, 82], [0, 1, 1, 0]);
  const spectrumScale = useTransform(progress, [60, 82], [0.04, 2.4]);
  const spectrumRotation = useTransform(progress, [60, 82], [-40, 80]);

  useImageFog({ imageRef, canvasRef, cloudRef, progress, src, loaded, loadingColor, loadingAccent, colorTransition,
    active: !failed && !instant && phase === 'forming' });
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => {
    if (!loaded || instant || failed || ready) return;
    const timer = setInterval(() => setStage(value => Math.min(value + 1, stages.length - 1)), 2000);
    return () => clearInterval(timer);
  }, [loaded, instant, failed, ready, src]);
  useEffect(() => {
    if (!src) { setLoaded(false); setFailed(false); return; }
    const image = imageRef.current;
    setLoaded(!!image?.complete && image.naturalWidth > 0);
    setFailed(!!image?.complete && image.naturalWidth === 0);
  }, [src]);

  useEffect(() => {
    if (failed) return;
    if (!src || !loaded) {
      progress.set(0);
      setPhase('forming');
      setComplete(false);
      setStage(0);
      return;
    }
    if (instant) {
      progress.set(100);
      setPhase('done');
      setComplete(true);
      return;
    }
    let disposed = false;
    let settleTimer;
    setComplete(false);
    setPhase('forming');
    setStage(0);
    progress.set(0);
    const generation = animate(progress, 100, {
      duration: Math.max(0, duration), ease: 'linear',
      onUpdate: value => { if (!disposed && value >= 60) setPhase('refining'); },
    });
    generation.then(() => {
      if (disposed) return;
      // Hide the header only after the final CSS blur transition settles.
      settleTimer = setTimeout(() => {
        if (!disposed) { setPhase('done'); setComplete(true); }
      }, 900);
    }).catch(() => {});
    return () => {
      disposed = true;
      clearTimeout(settleTimer);
      generation.stop();
    };
  }, [loaded, failed, instant, duration, progress, src]);

  useEffect(() => { if (ready) onCompleteRef.current?.(); }, [ready]);

  return (
    <section className="generation-card" aria-label="Image generation card">
      <motion.p className="status" role="status" aria-live="polite" aria-hidden={statusHidden}
        initial={instant ? false : { opacity: 0, y: 4, filter: 'blur(4px)' }}
        animate={{ opacity: statusHidden ? 0 : 1, y: 0, filter: 'blur(0px)' }}
        transition={instant ? { duration: 0 } : entrance}>
        <span className="status-stack">
          <AnimatePresence initial={false}>
            <motion.span key={failed ? 'error' : stage} dir="ltr" className="status-label"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: instant ? 0 : 0.6, ease: easeOut }}>
              {failed ? 'Image could not be loaded'
                : <span className={statusHidden ? '' : 'shimmer'}>{stages[stage]}</span>}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.p>
      <motion.div className="image-wrapper" style={{ aspectRatio }}
        initial={instant ? false : { opacity: 0, y: 4, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ ...entrance, delay: instant ? 0 : 0.08 }}>
        <motion.div className="image-frame" role="img" aria-label={alt} aria-busy={!ready && !failed}
          data-phase={src && loaded ? phase : 'forming'} data-error={failed || undefined}
          data-instant={instant && loaded || undefined}
          style={{ '--cloud-grow': cloudGrow, '--image-filled': filled, '--image-refine': refine }}>
          {(!instant || !loaded) && <>
            <canvas ref={canvasRef} className="image-layer image-trails" aria-hidden="true" />
            <motion.div className="dot-field" aria-hidden="true" style={{ opacity: dotOpacity }}>
              <span className="dot-grid" />
              {dotLayers.map(({ radius, falloff }, index) => {
                const mask = cloudMask(falloff);
                return <span key={radius} ref={index === 0 ? cloudRef : undefined} className="dot-cloud"
                  style={{ backgroundImage: `radial-gradient(circle, #27272a ${radius}px, transparent ${radius + 0.5}px)`,
                    maskImage: `${mask}, ${mask}`, WebkitMaskImage: `${mask}, ${mask}` }} />;
              })}
            </motion.div>
            {src && <img className="image-layer image-wash" src={src} alt="" aria-hidden="true" draggable="false" />}
          </>}
          <img ref={imageRef} className="image-layer image-picture" src={src || undefined} alt="" aria-hidden="true" draggable="false"
            onLoad={() => { setFailed(false); setLoaded(true); }}
            onError={() => { setFailed(true); setLoaded(false); }} />
          {!instant && <motion.div className="image-layer image-spectrum" aria-hidden="true"
            style={{ opacity: spectrumOpacity, scale: spectrumScale }}>
            <motion.div className="spectrum-colors" style={{ rotate: spectrumRotation }} />
          </motion.div>}
        </motion.div>
      </motion.div>
    </section>
  );
}
