---
layout: project.njk
title: JUCE Noise Reducer
description: A real-time noise reduction engine that attenuates background hiss
  from live microphone input using spectral subtraction. The algorithm was first
  proven out in MATLAB, then rebuilt as a real-time C++ audio engine in JUCE,
  running as either a standalone desktop app or a VST3/AU plugin. A Voice
  Activity Detector tracks the room's noise profile continuously and pauses
  updates the moment speech is detected, so the ambient floor gets attenuated
  without cutting into the voice itself.
tech: C++, Python, MATLAB, JUCE
github: https://github.com/Delali-Adanuty/NoiseReductionJUCE
date: 2026-07-02T00:26:00.000-04:00
---
# **Real-Time Noise Reducer (Standalone App & Plugin)**

## **Why I Built This**

Conventional noise gates abruptly mute audio below a set threshold, which leaves continuous background hiss audible the moment someone starts talking. I wanted something smarter: a processor that estimates the actual room noise profile and subtracts it continuously, so the noise floor drops without chopping up the voice sitting on top of it.

## **The Approach**

I split the build into two phases. First, I proved the spectral subtraction math in MATLAB — estimate the noise floor from the first half-second of audio, subtract that magnitude from the rest of the signal, clamp with a spectral floor so heavily-subtracted bins don't hit absolute zero, then reconstruct with an inverse STFT.

Translating that into a real-time C++/JUCE engine wasn't a 1-to-1 port. A plugin has to process arbitrary, unpredictable DAW block sizes under strict audio-thread deadlines, so I built ring buffers to decouple the host's block size from my algorithm's fixed FFT size, an Overlap-Add reconstruction using a Hann window at 25% hop size, and — since the plugin can't just "look at the first 0.5 seconds" the way a MATLAB script can — a real-time Voice Activity Detector that learns the noise floor during silence and pauses updates the moment it detects speech.

## **What Tripped Me Up**

Three bugs stood out. The first was silent and nasty: I'd sized some buffers with runtime-length arrays, which MSVC quietly allows but doesn't actually support safely, so the audio thread was reading uninitialized memory and dropping out randomly. Swapping to std::array with compile-time sizes fixed it outright.

The second was a timing bug — the VAD finished its noise-learning phase in the first 0.2 seconds, before the microphone had actually powered on, so it locked the noise floor to exactly zero and the whole pipeline went silent. I added a digital silence threshold that holds the learning timer until real audio actually shows up.

The third taught me something about windowing I hadn't internalized from the math alone: a perfectly overlapping Hann window sums to a constant gain of 2.0, so my output was quietly doubled in level. The fix was simple once I found it — drop the extra FFT normalization and scale the OLA output by 0.5 — but tracking down *why* a "correct" pipeline was 6 dB too hot took real signal-flow debugging, not just re-reading the equations. I used an AI assistant as a pair-programmer through a lot of this, mainly to help trace memory states and rule out diagnostic theories faster than I could alone.

## **Results**

Against broadband fan noise, the algorithm delivers a consistent ~15 dB of attenuation, with the reduction tapering off below 3 kHz — which is exactly where it should, since that's the VAD actively protecting the fundamental frequencies of human speech rather than over-suppressing them.

## **Technical Deep-Dive**

For the full DSP verification, spectrograms, SNR benchmarking, and the tuning parameter reference, see the Behind the Scenes Documentation.
