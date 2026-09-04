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

Workflow
1. Upload / Camera Selection

The user can upload a supported video file or start the live camera mode.

Supported video formats include:

MP4
MOV
WEBM
2. Model Loading

The YOLOv10 model is initialized before the detection process begins.

3. Frame Processing

The input video is processed frame by frame so that individual frames can be analysed by the detection model.

4. Preprocessing

Frames are prepared according to the requirements of the detection pipeline before being passed to YOLOv10.

5. YOLOv10 Detection

YOLOv10 identifies objects within each processed frame and produces bounding boxes, class labels, and confidence scores.

6. Object Tracking

Detected objects are associated across consecutive frames to provide visual continuity during video playback.

7. Rendering

Detection and tracking information is displayed over the video using the browser's rendering capabilities.

8. Review

Users can review the processed output and compare the original footage with the annotated result.

9. Export

Processed results can be exported for further analysis, including structured detection data and annotated video.

Advantages
Privacy-First

The application is designed around browser-based processing, reducing the need to send video footage to an external processing server.

No Complex Installation

Users can access the application through a web browser without installing a traditional desktop application.

Real-Time Capable

YOLOv10 provides fast object detection suitable for video-processing workflows, while performance depends on the user's hardware and browser environment.

Lightweight Approach

The project focuses on practical video analysis without requiring a large server-side infrastructure.

Cross-Platform

The web-based interface can be accessed from modern browsers across desktop and mobile platforms.

Clean Forensic-Style Interface

The interface is designed around a focused workspace that makes video review and detection results easy to inspect.

Exportable Results

Detection information and processed video can be exported for documentation, research, and further analysis.

Low Infrastructure Cost

Browser-based processing can reduce the requirement for dedicated GPU servers for supported workloads.

Applications
Traffic Monitoring

Detect and classify vehicles, pedestrians, and two-wheelers in road videos.

Retail Analytics

Analyse customer movement, dwell time, and queue behaviour.

Surveillance Review

Assist in reviewing recorded footage by identifying people and objects of interest.

Sports Analysis

Track players and sports equipment during matches and training sessions.

Wildlife Monitoring

Detect and count animals in camera-trap and other wildlife videos.

Industrial Safety

Monitor human-machine interaction and support safety-related video analysis.

Education and Research

Demonstrate Computer Vision and object detection concepts and support research activities.

Crowd Management

Analyse crowd density and movement patterns in public spaces.

Future Scope

The project can be extended with several advanced capabilities.

Persistent ID Tracking

Integrate dedicated tracking algorithms such as ByteTrack, SORT, or DeepSORT to provide more consistent object identities across frames.

Trajectory Visualisation

Display object movement paths, trajectories, and heatmaps for deeper video analysis.

Custom Model Support

Allow users to load compatible custom machine-learning models for domain-specific object detection.

Cloud Processing

Provide an optional cloud-based processing mode for videos that are too computationally demanding for local processing.

CSV and MOT Export

Add support for CSV and MOTChallenge formats for research and benchmarking workflows.

User Accounts and Project Library

Allow users to save and manage completed tracking sessions and project data.

Mobile Application

Package the web application as a PWA or native-style mobile application using a suitable wrapper.

Advanced Analytics

Add features such as speed estimation, direction vectors, dwell-time analysis, and anomaly detection.

Multi-Camera Support

Allow multiple camera feeds to be analysed together for broader tracking scenarios.

Annotation Editor

Provide tools for users to correct detections and export annotations for future model training.

Limitations

The current performance of the application depends on the user's hardware, browser capabilities, video resolution, and number of objects present in a scene.

Browser-based machine-learning inference may perform differently across devices, particularly when hardware acceleration is unavailable.

Tracking quality can also vary when objects become heavily occluded, move rapidly, leave the camera view, or appear very close to one another.
