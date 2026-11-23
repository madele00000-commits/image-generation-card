// Spatial palette: keep distinct regions rather than averaging every color
// into a single muddy tone. Transparent pixels must not introduce black.
export function samplePalette(pixels, width, height, columns = 3, rows = 3) {
  const totals = Array.from({ length: columns * rows }, () => [0, 0, 0, 0]);
  const overall = [0, 0, 0, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const alpha = pixels[index + 3] / 255;
      const cell = totals[Math.min(rows - 1, Math.floor(y * rows / height)) * columns
        + Math.min(columns - 1, Math.floor(x * columns / width))];
      for (let channel = 0; channel < 3; channel++) {
        cell[channel] += pixels[index + channel] * alpha;
        overall[channel] += pixels[index + channel] * alpha;
      }
      cell[3] += alpha;
      overall[3] += alpha;
    }
  }
  if (!overall[3]) return null;
  return totals.map(cell => {
    const total = cell[3] ? cell : overall;
    return total.slice(0, 3).map(channel => Math.round(channel / total[3]));
  });
}

export function createImageColorField(image) {
  const sample = document.createElement('canvas');
  sample.width = 24;
  sample.height = Math.max(3, Math.round(24 * image.clientHeight / image.clientWidth));
  const context = sample.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  const scale = Math.max(sample.width / image.naturalWidth, sample.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (sample.width - width) / 2, (sample.height - height) / 2, width, height);
  let colors;
  try {
    colors = samplePalette(context.getImageData(0, 0, sample.width, sample.height).data, sample.width, sample.height);
  } catch {
    // Some model image hosts don't allow pixel reads. The fog can still
    // crossfade into the blurred image directly without breaking its reveal.
    return null;
  }
  if (!colors) return null;
  const field = document.createElement('canvas');
  field.width = field.height = 3;
  const fieldContext = field.getContext('2d');
  if (!fieldContext) return null;
  const data = fieldContext.createImageData(3, 3);
  colors.forEach((color, index) => data.data.set([...color, 255], index * 4));
  fieldContext.putImageData(data, 0, 0);
  return field;
}
