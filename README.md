# Rekor/OS — Multi-Object Tracking in Video

> **Detect | Track | Analyse**

Rekor/OS is a browser-based Computer Vision workspace designed for multi-object detection and tracking in video streams. It allows users to upload video clips or use a live camera feed, analyse video frames, visualize detected objects, review results, and export processed data.

The project focuses on making video analysis accessible without requiring a complex local setup or dedicated GPU server.

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [Machine Learning Model](#machine-learning-model)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Workflow](#workflow)
- [Getting Started](#getting-started)
- [Requirements](#requirements)
- [Advantages](#advantages)
- [Applications](#applications)
- [Future Scope](#future-scope)
- [Limitations](#limitations)
- [Project Structure](#project-structure)
- [Privacy](#privacy)
- [Contributing](#contributing)
- [License](#license)
- [Project Team](#project-team)
- [Project Summary](#project-summary)

---

## Overview

Rekor/OS is a web-based Computer Vision application developed for detecting and tracking multiple objects in video streams.

Users can upload videos in supported formats or provide a live camera feed. The system processes the input, identifies objects using YOLOv10, and presents the detections through visual overlays such as bounding boxes, class labels, and confidence scores.

The application also provides a workspace for reviewing the original and annotated video, capturing still frames, recording annotated footage, and exporting detection results.

A key design goal of Rekor/OS is to keep video processing as close to the user's device as possible, reducing the need to transfer sensitive video footage to external processing services.

---

## Problem Statement

Traditional object detection and tracking systems can require powerful GPU infrastructure, complex software installation, or paid APIs. These requirements can make video analysis difficult for students, researchers, and users who do not have access to dedicated computing resources.

Privacy is another concern. When video footage is uploaded to cloud-based services for processing, sensitive recordings may leave the user's device. This can be especially important when dealing with surveillance footage, forensic material, or private recordings.

Rekor/OS addresses these challenges by providing a browser-based workspace for Computer Vision processing, reducing infrastructure requirements and supporting local browser-based processing where the implementation allows it.

---

## Objectives

The main objectives of Rekor/OS are:

- Support video uploads in **MP4, MOV, and WEBM** formats.
- Support **live camera input**.
- Detect **80+ common object classes** using YOLOv10.
- Display **bounding boxes, class labels, and confidence scores**.
- Provide a clear, step-by-step processing interface.
- Allow comparison of original and annotated video.
- Capture still frames from live video.
- Record annotated video.
- Export structured detection results.
- Keep processing as local as possible to improve privacy and reduce latency.

---

## Key Features

- Video upload and preview
- Live camera support
- YOLOv10-based object detection
- Multi-object tracking
- Bounding boxes and class labels
- Confidence score display
- Object counting
- Visual video analysis
- Original and annotated video review
- Still-frame capture
- Annotated video recording
- JSON result export
- WEBM video export
- Responsive interface
- Browser-based processing

---

## Machine Learning Model

### YOLOv10

Rekor/OS uses **YOLOv10** as its object detection model.

**Model:** YOLOv10  
**Task:** Object Detection and Multi-Object Tracking  
**Framework:** Ultralytics  
**Classes:** 80+ common object classes  
**Input:** Video and live camera  
**Output:** Bounding boxes, class labels, confidence scores, and tracking information

YOLOv10 processes video frames and identifies objects present in each frame. The resulting detections are then used by the application's tracking and visualization workflow to maintain continuity between frames.

The detection results are rendered over the video so that users can visually inspect the detected objects and their movement.

---

## Technology Stack

### Frontend

- React
- TanStack Start
- Vite

### Styling and UI

- Tailwind CSS
- shadcn/ui

### Routing

- TanStack Router

### Machine Learning / Computer Vision

- YOLOv10
- Ultralytics

### Video Processing

- Canvas API
- MediaRecorder API

### Browser APIs

- getUserMedia
- WebRTC
- Canvas API
- MediaRecorder API

### Deployment

- Lovable
- Lovable Cloud / Edge Runtime

---

## System Architecture

```text
┌─────────────────────────────────────────┐
│             User Interface              │
│   Landing · Upload · Live Camera · Track │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│            Browser Runtime              │
│      React · Router · Canvas · Video     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│             YOLOv10 Model               │
│        Object Detection / Tracking      │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│          Detection Results              │
│  Boxes · Labels · Confidence · Tracking │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│          Canvas / Video Rendering       │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│           Review & Export               │
│       JSON · Annotated Video            │
└─────────────────────────────────────────┘
