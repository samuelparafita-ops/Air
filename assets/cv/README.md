# Computer Vision model note

Default model: YOLOv8n ONNX, 640px input, stored at `assets/cv/models/yolov8n.onnx`.

Rationale: YOLOv8n is a practical browser default because the nano checkpoint keeps model size and latency modest while retaining stronger general object-detection quality than older MobileNet SSD baselines. The page runs it with `onnxruntime-web` in the browser, trying WebGPU first when available and falling back to WASM, so no backend or upload service is required.

Post-processing is implemented in `assets/js/cv-detector.js`: image letterboxing, tensor normalization, confidence filtering, class-aware non-max suppression, and responsive canvas overlays.

Fallback option: SSD MobileNetV1 INT8 from the ONNX Model Zoo remains a good smaller baseline if the YOLO export or NMS path needs to be replaced later.
