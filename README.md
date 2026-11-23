# image-generation-card
Image generation card with halftone dots, fog, color adaptation and zoom reveal

A reusable React + Motion card with irregular halftone clouds, cyan fog and a
small fixed brown patch, image-derived color blending, and the original UsePlanes
spectral glow and top-to-bottom reveal, with the image settling beneath it.
Only the English status header and image are shown. The header disappears after
the image settles, without moving the frame.

## Run the demo

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

For a production preview:

```sh
npm run build
npm run preview
```

The demo waits **8 seconds** before supplying the local stingray image as a mock
model response. It does not call an AI service. Refresh to replay.

## Use the component in your React app

Install Motion:

```sh
npm install motion@12.43.0
```

Copy these four files into the same folder in your app:

- `src/ImageGeneration.jsx`
- `src/ImageGeneration.css`
- `src/useImageFog.js`
- `src/imageColors.js`

The component imports its own scoped stylesheet; the demo's black page background
and layout are separate in `src/styles.css` and are not needed when embedding.
The header is styled for a dark background.

```jsx
import { ImageGeneration } from './components/ImageGeneration.jsx';

export function GeneratedImage({ imageUrl = null, generationId }) {
  return (
    <ImageGeneration
      key={generationId}
      src={imageUrl}
      alt="Generated scene"
      duration={6.4}
      loadingColor="#7dc2c7"
      loadingAccent="#8f6b50"
      colorTransition={1.8}
      onComplete={() => console.log('Image reveal complete')}
    />
  );
}
```

Keep `imageUrl` as `null` while your model generates the image. Supply its URL
when ready: the dots keep moving until the image actually loads, and only then
does the fog transition toward its colors. Change `generationId` for a new
generation to reset the component. The 8-second mock wait is demo-only, not
built into this component.

For a known image, pass `src="/images/your-image.webp"` directly. If using the
default stingray image, also copy `public/images/stingrays.webp` into your app.

### Props

| Prop | Default | Purpose |
| --- | --- | --- |
| `src` | `/images/stingrays.webp` | Image URL; use `null` while waiting. |
| `alt` | Stingray description | Accessible image description. |
| `duration` | `6.4` | Post-arrival reveal animation, in seconds. |
| `autoPlay` | `true` | Set `false` to show the loaded image without the reveal. |
| `aspectRatio` | `2 / 3` | CSS aspect ratio for the fixed frame. |
| `loadingColor` | `#7dc2c7` | Initial cyan fog color. |
| `loadingAccent` | `#8f6b50` | Small fixed brown patch color. |
| `colorTransition` | `1.8` | Image-palette blending time, in seconds. |
| `onComplete` | — | Called after the final image settles. |

Reduced-motion preferences skip the reveal once the image is available.

## How it works

- Three halftone sizes share two independently moving elliptical cloud masks.
- Fog uses a 128px-wide canvas and follows the same irregular cloud positions.
- A small stationary brown field appears only when a cloud passes across it.
- After arrival, a 3×3 spatial palette preserves the image's different colors
  instead of flattening them to one average. The loading color blends into it
  over 1.8 seconds, then image details form in the fog.
- If a remote image blocks pixel sampling, its blurred pixels provide the
  color transition directly, without blocking the final reveal.
- Between 30% and 54% of post-arrival progress, fog fills the frame and dots fade.
- After the image arrives, the original rotating pink/violet/blue conic glow
  appears behind the reveal. At 60%, it fades while a 1.35× blurred wash appears
  and the sharp picture begins revealing at 1.15× scale.
- From 60% to 100%, the original curved radial mask moves downward from above
  the frame, revealing sharp details from top to bottom. A matching spectral
  rim follows that edge; the mask sits outside the image's zoom so both edges
  stay aligned. There is no center-out expansion. Glow and rim are absent while
  awaiting the image and after completion, and skipped with reduced motion or
  `autoPlay={false}`.
- The picture holds its 1.15× enlargement until 80% progress, when about half
  is visible, then smoothly shrinks to 1× over the remaining reveal (1.28s at
  the default duration). The zoom-out is visible instead of finishing behind
  the mask, and the outer frame stays fixed.
- The labels advance from `Generating scene` to `Coloring` to `Loading`, then
  fade after completion. Their layout space remains reserved.

## Checks

```sh
npm test
npm run build
```

Tests cover spatial warm/cool colors, transparent pixels, and tiny images.
Dependencies are pinned in `package-lock.json`; installed dependencies and
generated build output are not committed.

## References

The demo image and layout reference is [UsePlanes](https://useplanes.com/components/image-generation).
The halftone, fog and zoom behavior reference is [Kobra](https://kobra.systems/components/image-generation).
The stingray image is saved locally, so the demo makes no runtime request to
either reference site. Replace it with your own image when integrating.
