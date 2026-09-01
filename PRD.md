# Rekor/OS — Project Requirements Document

## Multi-Object Tracking in Video

**Project Type:** Web Application (Computer Vision / AI / ML)  
**Platform:** Browser-first PWA-style interface  
**Deployment:** https://rekor-os.lovable.app  
**Version:** 1.0

---

## 1. Abstract

Rekor/OS is a browser-based computer vision workspace designed for multi-object detection and tracking in video streams. It brings together a state-of-the-art object detection model, a clean forensic-style interface, and real-time processing so that users can upload video clips or use a live camera feed, detect visible objects frame by frame, track them visually, and export structured results for analysis.

The system runs entirely in the browser using client-side inference. No video frames, detections, or recordings are sent to a backend server, which makes the workflow private, fast, and accessible from any modern device including phones and tablets.

---

## 2. Topic / Project Overview

The project topic is **Multi-Object Tracking in Video**. The goal is to identify and localise multiple objects in a video sequence and maintain consistent visual tracking across frames. Rekor/OS solves this by combining:

- **Object Detection:** Locating objects in each frame using bounding boxes and class labels.
- **Object Tracking:** Keeping visual continuity of the same object across consecutive frames.
- **Visual Review:** Letting the user compare the original and annotated outputs side-by-side.
- **Export:** Generating downloadable tracked videos and structured JSON/CSV data.

The application is built as a responsive web app that behaves like a native tool on mobile devices while offering a full desktop workspace experience.

---

## 3. Objectives

1. Enable video upload (MP4 / MOV / WEBM) and live camera input for object detection.
2. Detect 80+ common object classes in real time using a lightweight YOLO-based model.
3. Display bounding boxes, class labels, and confidence scores on the video canvas.
4. Provide a step-by-step processing UI with clear progress indicators.
5. Support side-by-side review of original and tracked video outputs.
6. Allow users to capture still frames and record annotated video from live feeds.
7. Export detection data as JSON and tracked video as WEBM.
8. Keep all processing local to the browser for privacy and low latency.

---

## 4. Technology Stack

| Layer | Technology |
|-------|-------------|
| Framework | TanStack Start (React 19, full-stack SSR/SSG) |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui design system |
| Routing | TanStack Router |
| State | React hooks + local in-memory store |
| ML Inference | Hugging Face Transformers.js |
| Detection Model | Xenova/yolos-tiny (YOLO-style object detector) |
| Recording | Browser MediaRecorder API |
| Camera | getUserMedia / WebRTC |
| Deployment | Lovable Cloud / Edge runtime |

---

## 5. Machine Learning & YOLO Model Details

### 5.1 What is YOLO?

**YOLO** stands for **You Only Look Once**. It is a family of deep-learning object detection architectures that process an entire image in a single forward pass of a neural network. Unlike older sliding-window approaches, YOLO divides the image into a grid and predicts bounding boxes, class probabilities, and confidence scores simultaneously. This makes it extremely fast and suitable for real-time video applications.

### 5.2 Model Used: Xenova/yolos-tiny

Rekor/OS uses the **`Xenova/yolos-tiny`** model through the Hugging Face Transformers.js library. It is a compact, browser-optimised variant of the YOLO architecture.

| Property | Value |
|----------|-------|
| Model family | YOLO-style object detector |
| Variant | yolos-tiny |
| Backbone | Vision Transformer (ViT) based |
| Input resolution | 384 × 384 (model-dependent) |
| Classes | 80 COCO classes |
| Optimisations | WebGPU FP16 / WASM q8 quantized fallback |
| Runtime | Browser-only, client-side inference |

### 5.3 Why This Model?

- **Lightweight:** Small enough to download and run inside a browser tab.
- **Fast:** Achieves near real-time inference on modern devices.
- **Accurate for general classes:** Trained on the COCO dataset, covering people, vehicles, animals, and everyday objects.
- **Privacy-first:** No frames leave the device because inference happens locally.
- **Fallback-friendly:** Automatically falls back from WebGPU to quantized WASM when hardware acceleration is unavailable.

### 5.4 Inference Pipeline

1. **Frame Sampling:** For uploaded videos, frames are sampled at regular intervals (≈0.4s) by seeking through a hidden `<video>` element.
2. **Preprocessing:** Each sampled frame is resized, normalised, and passed to the model.
3. **Detection:** The model returns bounding boxes, labels, and confidence scores.
4. **Postprocessing:** Detections are scaled back to the original video resolution and filtered by a confidence threshold (default 0.35–0.40).
5. **Rendering:** Boxes and labels are drawn onto a canvas overlay that is synchronised with the video playback.

### 5.5 Tracking Approach

While the current implementation focuses on per-frame detection with temporal consistency through frame sampling, the architecture is designed to evolve into a full multi-object tracking (MOT) pipeline. The visual tracking is achieved by:

- Sampling frames at a fixed time step.
- Rendering the nearest cached detection set to the current playback time.
- Using smooth interpolation and consistent label colouring to make object motion readable across frames.

Future versions will integrate a dedicated tracker such as ByteTrack or SORT for persistent ID assignment across frames.

---

## 6. System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                         │
│   (Landing page · Upload card · Live camera · Track page)    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      Browser Runtime                          │
│   React + TanStack Router + Canvas API + MediaRecorder       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Transformers.js (ONNX)                    │
│              Xenova/yolos-tiny object detector              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              WebGPU / WASM (ONNX Runtime)                   │
│              Hardware-accelerated inference                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page with upload card and project overview |
| `/track` | Processing workspace and side-by-side video review |
| `/live` | Real-time camera detection with capture and record |
| `/record` | Record live video, then send it to tracking |

---

## 7. Key Features

### 7.1 Video Upload & Session Chooser

- Drag-and-drop or click-to-select video upload.
- Preview the selected clip before processing.
- Choose between upload mode or live camera mode.

### 7.2 Step-by-Step Processing

The `/track` page shows four clear stages:

1. **Loading model** — downloads and initialises the detector.
2. **Analyzing frames** — runs inference on sampled frames.
3. **Framing detections** — prepares bounding-box overlays.
4. **Tracking successful** — review screen is unlocked.

Each stage is shown as a circular progress ring with Done / Running / Waiting status.

### 7.3 Side-by-Side Review

After processing, the user sees:

- Original video player.
- Tracked video player with a canvas overlay showing bounding boxes and labels.
- Per-class detection counts.
- FPS and object-count telemetry.

### 7.4 Live Camera Mode

- Starts the device camera.
- Runs inference continuously on a downscaled frame buffer.
- Displays live FPS and object count.
- Allows frame capture (PNG) and video recording (WEBM).

### 7.5 Export Options

- **Tracked video:** WEBM download with annotations baked in.
- **JSON report:** Frame-by-frame detections with bounding boxes and confidence scores.
- **CSV support:** Planned for future releases.

---

## 8. Advantages

| Advantage | Description |
|-----------|-------------|
| **Privacy-first** | All processing happens in the browser. No video or detection data is uploaded to any server. |
| **No installation** | Works as a web app on desktop and mobile without app-store installs. |
| **Real-time capable** | Optimised inference path with WebGPU and multi-threaded WASM fallback. |
| **Forensic-grade UI** | Clean, monospaced, analyst-focused interface with precise metrics and progress states. |
| **Cross-platform** | Runs on Windows, macOS, Linux, Android, and iOS through a modern browser. |
| **Lightweight model** | Tiny YOLO variant keeps memory and download size low. |
| **Exportable data** | Structured JSON output is ready for research, reports, and further analysis. |
| **Low cost** | No GPU server farm required because inference is client-side. |

---

## 9. Applications

Rekor/OS can be applied in any domain where visual object detection and tracking are useful:

1. **Traffic Monitoring:** Count and classify vehicles, pedestrians, and two-wheelers on roads.
2. **Retail Analytics:** Track customer movement, dwell time, and queue behaviour.
3. **Surveillance Review:** Quickly flag people or objects of interest in recorded footage.
4. **Sports Analysis:** Track players and equipment during matches.
5. **Wildlife Monitoring:** Detect and count animals in camera-trap videos.
6. **Industrial Safety:** Monitor shop floors for human-machine interaction and safety compliance.
7. **Education & Research:** Demonstrate computer vision concepts and collect annotated datasets.
8. **Crowd Management:** Estimate crowd density and flow in public spaces.

---

## 10. Future Scope

1. **Persistent ID Tracking:** Integrate ByteTrack / SORT / DeepSORT to assign stable IDs across all frames.
2. **Trajectory Visualisation:** Draw object paths, heatmaps, and dwell-time overlays.
3. **Custom Model Support:** Allow users to upload their own ONNX or Transformers.js models.
4. **Cloud Processing Option:** Offload heavy videos to a serverless GPU backend for faster batch analysis.
5. **CSV & MOT Format Export:** Export in MOTChallenge format for benchmarking.
6. **User Accounts & Project Library:** Save sessions, annotations, and results to a cloud database.
7. **Mobile Native Wrapper:** Package the web app as an installable PWA or Capacitor app.
8. **Advanced Analytics:** Speed estimation, direction vectors, anomaly detection, and scene summaries.
9. **Multi-Camera Support:** Combine feeds from several cameras into one tracking session.
10. **Annotation Editor:** Let users correct detections and export improved training data.

---

## 11. Conclusion

Rekor/OS demonstrates how modern browser technologies and lightweight deep-learning models can come together to create a powerful, privacy-respecting multi-object tracking workspace. By keeping inference local and the interface focused, the project delivers a practical tool for students, researchers, analysts, and developers who want to understand and visualise object behaviour in video without complex infrastructure.

The current release establishes a solid foundation in detection, review, and export. The planned future enhancements will evolve it into a full-featured multi-object tracking platform suitable for real-world deployment.

---

**Document Version:** 1.0  
**Last Updated:** September 2026  
**Project:** Rekor/OS — Multi-Object Tracking in Video
