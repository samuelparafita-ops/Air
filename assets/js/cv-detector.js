const MODEL_URL = 'assets/cv/models/yolov8n.onnx';
const ORT_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/ort.webgpu.min.js';
const ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';
const INPUT_SIZE = 640;
const MAX_CANDIDATES = 300;
const IOU_THRESHOLD = 0.45;

const COCO_LABELS = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard',
  'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase',
  'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

const section = document.getElementById('vision');
const statusEl = document.getElementById('cv-status');
const confidenceInput = document.getElementById('cv-confidence');
const confidenceValue = document.getElementById('cv-confidence-value');
const labelToggle = document.getElementById('cv-label-toggle');
const fileInput = document.getElementById('cv-file');
const clearUpload = document.getElementById('cv-clear-upload');
const uploadImage = document.querySelector('[data-cv-upload-image]');
const uploadCanvas = document.querySelector('[data-cv-upload-canvas]');
const uploadEmpty = document.querySelector('[data-cv-upload-empty]');
const uploadResult = document.querySelector('[data-cv-upload-result]');
const uploadTitle = document.getElementById('cv-upload-title');
const uploadFrame = document.getElementById('cv-upload-frame');
const searchForm = document.getElementById('cv-search-form');
const searchInput = document.getElementById('cv-search-input');
const searchPanel = document.getElementById('cv-search-panel');
const searchQueryEl = document.getElementById('cv-search-query');
const searchStatus = document.getElementById('cv-search-status');
const searchGrid = document.getElementById('cv-search-grid');
const searchClose = document.getElementById('cv-search-close');
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SEARCH_THUMB_LIMIT = 24;
const COMMONS_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';

let ortSession = null;
let activeProvider = 'wasm';
let modelPromise = null;
let uploadUrl = null;
let started = false;

const galleryItems = Array.from(document.querySelectorAll('[data-cv-item]')).map((card) => ({
  card,
  image: card.querySelector('[data-cv-image]'),
  canvas: card.querySelector('[data-cv-canvas]'),
  result: card.querySelector('[data-cv-result]'),
  rawOutput: null,
  meta: null,
  detections: []
}));

const uploadItem = {
  card: document.getElementById('cv-upload-card'),
  image: uploadImage,
  canvas: uploadCanvas,
  result: uploadResult,
  rawOutput: null,
  meta: null,
  detections: []
};

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('vision-error', isError);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      if (window.ort) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar onnxruntime-web.'));
    document.head.appendChild(script);
  });
}

async function loadModel() {
  if (ortSession) return ortSession;
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    setStatus('Cargando runtime y modelo...');
    await loadScript(ORT_URL);

    window.ort.env.wasm.wasmPaths = ORT_WASM_PATH;
    window.ort.env.wasm.numThreads = 1;

    const providers = navigator.gpu ? ['webgpu', 'wasm'] : ['wasm'];

    try {
      ortSession = await window.ort.InferenceSession.create(MODEL_URL, {
        executionProviders: providers,
        graphOptimizationLevel: 'all'
      });
      activeProvider = providers[0];
    } catch (error) {
      console.warn('WebGPU model load failed, falling back to WASM.', error);
      ortSession = await window.ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });
      activeProvider = 'wasm';
    }

    return ortSession;
  })();

  return modelPromise;
}

function waitForImage(image) {
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', () => reject(new Error('No se pudo cargar la imagen.')), { once: true });
  });
}

function preprocess(image) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const scale = Math.min(INPUT_SIZE / sourceWidth, INPUT_SIZE / sourceHeight);
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  const padX = Math.floor((INPUT_SIZE - width) / 2);
  const padY = Math.floor((INPUT_SIZE - height) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.fillStyle = 'rgb(114, 114, 114)';
  context.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  context.drawImage(image, padX, padY, width, height);

  const imageData = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const pixels = INPUT_SIZE * INPUT_SIZE;
  const tensorData = new Float32Array(3 * pixels);

  for (let i = 0; i < pixels; i += 1) {
    const pixelIndex = i * 4;
    tensorData[i] = imageData[pixelIndex] / 255;
    tensorData[i + pixels] = imageData[pixelIndex + 1] / 255;
    tensorData[i + pixels * 2] = imageData[pixelIndex + 2] / 255;
  }

  return {
    tensor: new window.ort.Tensor('float32', tensorData, [1, 3, INPUT_SIZE, INPUT_SIZE]),
    meta: { sourceWidth, sourceHeight, scale, padX, padY }
  };
}

function readOutput(rawOutput) {
  const output = rawOutput[Object.keys(rawOutput)[0]];
  const dims = output.dims;
  const data = output.data;

  if (dims.length === 3 && dims[1] === 84) {
    return { data, boxes: dims[2], stride: dims[2], transposed: true };
  }

  if (dims.length === 3 && dims[2] === 84) {
    return { data, boxes: dims[1], stride: 84, transposed: false };
  }

  throw new Error(`Formato de salida no soportado: ${dims.join('x')}`);
}

function getValue(output, boxIndex, valueIndex) {
  return output.transposed
    ? output.data[valueIndex * output.stride + boxIndex]
    : output.data[boxIndex * output.stride + valueIndex];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseDetections(rawOutput, meta, threshold) {
  const output = readOutput(rawOutput);
  const candidates = [];

  for (let i = 0; i < output.boxes; i += 1) {
    let bestScore = 0;
    let classIndex = -1;

    for (let labelIndex = 0; labelIndex < COCO_LABELS.length; labelIndex += 1) {
      const score = getValue(output, i, 4 + labelIndex);
      if (score > bestScore) {
        bestScore = score;
        classIndex = labelIndex;
      }
    }

    if (bestScore < threshold) continue;

    const cx = getValue(output, i, 0);
    const cy = getValue(output, i, 1);
    const width = getValue(output, i, 2);
    const height = getValue(output, i, 3);

    const x1 = clamp((cx - width / 2 - meta.padX) / meta.scale, 0, meta.sourceWidth);
    const y1 = clamp((cy - height / 2 - meta.padY) / meta.scale, 0, meta.sourceHeight);
    const x2 = clamp((cx + width / 2 - meta.padX) / meta.scale, 0, meta.sourceWidth);
    const y2 = clamp((cy + height / 2 - meta.padY) / meta.scale, 0, meta.sourceHeight);

    if (x2 <= x1 || y2 <= y1) continue;

    candidates.push({
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
      score: bestScore,
      classIndex,
      label: COCO_LABELS[classIndex]
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return nonMaxSuppression(candidates.slice(0, MAX_CANDIDATES));
}

function intersectionOverUnion(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const width = Math.max(0, x2 - x1);
  const height = Math.max(0, y2 - y1);
  const intersection = width * height;
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  return intersection / (areaA + areaB - intersection);
}

function nonMaxSuppression(candidates) {
  const selected = [];

  candidates.forEach((candidate) => {
    const overlaps = selected.some((current) => (
      current.classIndex === candidate.classIndex
      && intersectionOverUnion(current, candidate) > IOU_THRESHOLD
    ));

    if (!overlaps) selected.push(candidate);
  });

  return selected;
}

function displayedImageRect(image, canvas) {
  const canvasRect = canvas.getBoundingClientRect();
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = canvasRect.width / canvasRect.height;

  if (canvasRatio > imageRatio) {
    const height = canvasRect.height;
    const width = height * imageRatio;
    return { x: (canvasRect.width - width) / 2, y: 0, width, height };
  }

  const width = canvasRect.width;
  const height = width / imageRatio;
  return { x: 0, y: (canvasRect.height - height) / 2, width, height };
}

function drawDetections(item) {
  const { image, canvas, detections } = item;
  if (!image || !canvas || !image.naturalWidth) return;

  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));

  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);

  if (!detections.length) return;

  const imageRect = displayedImageRect(image, canvas);
  const scaleX = imageRect.width / image.naturalWidth;
  const scaleY = imageRect.height / image.naturalHeight;
  const showLabels = labelToggle.checked;

  detections.forEach((detection, index) => {
    const x = imageRect.x + detection.x * scaleX;
    const y = imageRect.y + detection.y * scaleY;
    const width = detection.width * scaleX;
    const height = detection.height * scaleY;
    const hue = (142 + index * 43) % 360;
    const stroke = `hsl(${hue}, 76%, 62%)`;

    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.45)';
    context.shadowBlur = 12;
    context.lineWidth = Math.max(2, Math.min(4, rect.width / 190));
    context.strokeStyle = stroke;
    context.strokeRect(x, y, width, height);
    context.restore();

    if (!showLabels) return;

    const label = `${detection.label} ${Math.round(detection.score * 100)}%`;
    context.font = '700 12px Inter, system-ui, sans-serif';
    const labelWidth = Math.ceil(context.measureText(label).width) + 16;
    const labelHeight = 26;
    const labelX = clamp(x, 6, rect.width - labelWidth - 6);
    const labelY = y > labelHeight + 8 ? y - labelHeight - 5 : y + 5;

    context.fillStyle = 'rgba(10, 10, 10, 0.88)';
    context.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    context.lineWidth = 1;
    roundRect(context, labelX, labelY, labelWidth, labelHeight, 9);
    context.fill();
    context.stroke();

    context.fillStyle = stroke;
    context.fillText(label, labelX + 8, labelY + 17);
  });
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function updateItemFromCache(item) {
  if (!item.rawOutput || !item.meta) return;
  const threshold = Number(confidenceInput.value) / 100;
  item.detections = parseDetections(item.rawOutput, item.meta, threshold);
  item.result.textContent = `${item.detections.length} objetos`;
  drawDetections(item);
}

async function detectItem(item) {
  await waitForImage(item.image);
  item.result.textContent = 'Detectando...';
  const session = await loadModel();
  const { tensor, meta } = preprocess(item.image);
  const startedAt = performance.now();
  const output = await session.run({ [session.inputNames[0]]: tensor });
  const elapsed = Math.round(performance.now() - startedAt);

  item.rawOutput = output;
  item.meta = meta;
  updateItemFromCache(item);
  return elapsed;
}

async function runGallery() {
  try {
    const session = await loadModel();
    const provider = activeProvider === 'webgpu' ? 'WebGPU' : 'WASM';
    let totalMs = 0;

    for (const item of galleryItems) {
      totalMs += await detectItem(item);
    }

    setStatus(`${provider} activo. Galer\u00eda analizada en ${totalMs} ms con ${session.inputNames[0]}.`);
  } catch (error) {
    console.error(error);
    setStatus('No se pudo cargar el modelo de detecci\u00f3n. Revisa la conexi\u00f3n o usa localhost.', true);
    galleryItems.forEach((item) => {
      item.result.textContent = 'Error';
    });
  }
}

async function detectUpload() {
  try {
    const elapsed = await detectItem(uploadItem);
    const provider = activeProvider === 'webgpu' ? 'WebGPU' : 'WASM';
    setStatus(`${provider} activo. Imagen local analizada en ${elapsed} ms.`);
  } catch (error) {
    console.error(error);
    uploadResult.textContent = 'Error';
    setStatus('No se pudo analizar la imagen seleccionada.', true);
  }
}

function rerenderAll() {
  confidenceValue.textContent = `${confidenceInput.value}%`;
  galleryItems.forEach(updateItemFromCache);
  updateItemFromCache(uploadItem);
}

function setEmptyVisible(visible) {
  uploadEmpty.classList.toggle('is-hidden', !visible);
}

function clearUploadPreview() {
  if (uploadUrl) URL.revokeObjectURL(uploadUrl);
  uploadUrl = null;
  fileInput.value = '';
  uploadImage.hidden = true;
  uploadImage.removeAttribute('src');
  uploadImage.alt = '';
  setEmptyVisible(true);
  uploadResult.textContent = 'Sin imagen';
  uploadTitle.textContent = 'Imagen local';
  uploadItem.rawOutput = null;
  uploadItem.meta = null;
  uploadItem.detections = [];
  const context = uploadCanvas.getContext('2d');
  context.clearRect(0, 0, uploadCanvas.width, uploadCanvas.height);
}

async function loadBlobIntoUpload(blob, displayName) {
  if (!blob) return;
  if (!ACCEPTED_TYPES.includes(blob.type)) {
    setStatus('Formato no soportado. Usa JPG, PNG o WebP.', true);
    return;
  }

  if (uploadUrl) URL.revokeObjectURL(uploadUrl);
  uploadUrl = URL.createObjectURL(blob);
  uploadImage.src = uploadUrl;
  uploadImage.alt = displayName || 'Imagen';
  uploadImage.hidden = false;
  setEmptyVisible(false);
  uploadTitle.textContent = displayName || 'Imagen';
  uploadResult.textContent = 'Cargando...';

  await detectUpload();
}

function extractImageFromDataTransfer(dataTransfer) {
  if (!dataTransfer) return null;
  const files = dataTransfer.files;
  if (files && files.length) {
    for (const file of files) {
      if (ACCEPTED_TYPES.includes(file.type)) return { blob: file, name: file.name };
    }
  }
  if (dataTransfer.items) {
    for (const item of dataTransfer.items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && ACCEPTED_TYPES.includes(file.type)) return { blob: file, name: file.name };
      }
    }
  }
  return null;
}

function setupUpload() {
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    await loadBlobIntoUpload(file, file.name);
    fileInput.value = '';
  });

  clearUpload.addEventListener('click', clearUploadPreview);
}

function setupPaste() {
  window.addEventListener('paste', async (event) => {
    const tag = (event.target && event.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const found = extractImageFromDataTransfer(event.clipboardData);
    if (!found) return;
    event.preventDefault();
    await loadBlobIntoUpload(found.blob, found.name || 'Imagen pegada');
  });
}

function setupDragDrop() {
  ['dragenter', 'dragover'].forEach((type) => {
    uploadFrame.addEventListener(type, (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      event.preventDefault();
      uploadFrame.classList.add('is-dragover');
    });
  });
  ['dragleave', 'dragend', 'drop'].forEach((type) => {
    uploadFrame.addEventListener(type, () => uploadFrame.classList.remove('is-dragover'));
  });
  uploadFrame.addEventListener('drop', async (event) => {
    event.preventDefault();
    const found = extractImageFromDataTransfer(event.dataTransfer);
    if (!found) {
      setStatus('Formato no soportado. Usa JPG, PNG o WebP.', true);
      return;
    }
    await loadBlobIntoUpload(found.blob, found.name || 'Imagen');
  });
}

function showSearchPanel() {
  searchPanel.classList.remove('is-hidden');
}

function hideSearchPanel() {
  searchPanel.classList.add('is-hidden');
  searchGrid.innerHTML = '';
  searchStatus.textContent = '';
  searchStatus.classList.remove('is-error');
}

function setSearchStatus(message, isError = false) {
  searchStatus.textContent = message;
  searchStatus.classList.toggle('is-error', isError);
}

async function fetchCommonsImages(query) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: `${query} filetype:bitmap|drawing`,
    gsrlimit: String(SEARCH_THUMB_LIMIT),
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '400',
    format: 'json',
    origin: '*'
  });
  const response = await fetch(`${COMMONS_ENDPOINT}?${params.toString()}`);
  if (!response.ok) throw new Error(`API responded ${response.status}`);
  const json = await response.json();
  const pages = json && json.query && json.query.pages;
  if (!pages) return [];
  return Object.values(pages)
    .map((page) => {
      const info = page.imageinfo && page.imageinfo[0];
      if (!info) return null;
      const mime = info.mime || '';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) return null;
      const stripQuery = (url) => url.split('?')[0];
      return {
        thumb: stripQuery(info.thumburl || info.url),
        inference: stripQuery(info.url),
        title: page.title.replace(/^File:/, '')
      };
    })
    .filter(Boolean)
    .slice(0, SEARCH_THUMB_LIMIT);
}

function renderSearchResults(results, query) {
  searchGrid.innerHTML = '';
  results.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vision-search-thumb';
    button.title = item.title || `Resultado ${index + 1}`;
    const img = document.createElement('img');
    img.src = item.thumb;
    img.loading = 'lazy';
    img.crossOrigin = 'anonymous';
    img.alt = item.title || `${query} ${index + 1}`;
    button.appendChild(img);
    button.addEventListener('click', async () => {
      setSearchStatus('Cargando imagen seleccionada...');
      try {
        const blob = await (await fetch(item.inference)).blob();
        await loadBlobIntoUpload(blob, item.title || `Wikimedia: ${query}`);
        hideSearchPanel();
      } catch (error) {
        console.error(error);
        setSearchStatus('No se pudo cargar la imagen seleccionada.', true);
      }
    });
    searchGrid.appendChild(button);
  });
}

function setupSearch() {
  searchClose.addEventListener('click', hideSearchPanel);

  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) {
      searchInput.focus();
      return;
    }

    searchQueryEl.textContent = `"${query}"`;
    showSearchPanel();
    searchGrid.innerHTML = '';
    setSearchStatus('Buscando en Wikimedia Commons...');

    try {
      const results = await fetchCommonsImages(query);
      if (!results.length) {
        setSearchStatus('Sin resultados. Prueba otra consulta.', true);
        return;
      }
      setSearchStatus(`${results.length} resultados. Haz clic en una imagen para analizarla.`);
      renderSearchResults(results, query);
    } catch (error) {
      console.error(error);
      setSearchStatus('No se pudo completar la búsqueda. Reintenta o pega la imagen con Ctrl+V.', true);
    }
  });
}

function setupResize() {
  const observer = new ResizeObserver(() => {
    galleryItems.forEach(drawDetections);
    drawDetections(uploadItem);
  });

  galleryItems.forEach((item) => observer.observe(item.card));
  observer.observe(uploadItem.card);
}

function start() {
  if (started) return;
  started = true;
  runGallery();
}

confidenceInput.addEventListener('input', rerenderAll);
labelToggle.addEventListener('change', rerenderAll);
setupUpload();
setupPaste();
setupDragDrop();
setupSearch();
setupResize();
rerenderAll();

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      start();
    }
  }, { rootMargin: '180px 0px' });
  observer.observe(section);
} else {
  start();
}
