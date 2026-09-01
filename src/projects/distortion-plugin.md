---
layout: project.njk
title: Distortion Plugin
description: "A distortion plugin that tackles a core problem in digital
  waveshaping: non-linear distortion generates harmonics above Nyquist, which
  fold back into the audible range as inharmonic aliasing. Rather than accept
  that tradeoff, this project isolates the non-linear stage inside an 8×
  oversampled signal path — keeping the distortion harmonic instead of gritty
  and digital. Built in C++/JUCE with a modular ProcessorChain, ETW-profiled to
  stay under 10% CPU overhead in a live FL Studio session."
tech: C++, JUCE
github: https://github.com/Delali-Adanuty/Distortion
date: 2026-08-30T00:25:00.000-04:00
---
# **Multi-Rate Distortion Processor**

## **Why I Built This**

Distortion is one of the most-used effects in music production, but faithfully reproducing analog-style clipping in the digital domain is deceptively hard. A plugin can't run the host DAW at a higher sample rate, so a naive waveshaper generates harmonics that fold back into the audible range as harsh, inharmonic aliasing instead of the warm harmonic content you actually want. I wanted to understand that problem well enough to solve it properly — not just work around it.

## **The Approach**

I isolated the nonlinear waveshaping stage inside an 8x oversampled signal path, using 141st-order linear-phase FIR filters to interpolate and decimate cleanly around it — a multi-rate architecture based on the filter design rationale in a Stanford EE264 paper on guitar pedal DSP.

I diverged from that paper for the waveshaper itself. Its fixed-point hardware target required rational and polynomial approximations; without that constraint, I used an asymmetric tanh(x) soft clipper instead, which treats the positive and negative halves of the waveform differently to generate even-order harmonics and give the distortion a more analog character.

## **What Tripped Me Up**

An interesting problem I ran into was translating a single user-facing "Tone" knob into two filters moving in opposite directions (the pre-distortion high-pass opening up while the post-distortion low-pass closes down) without that abstraction leaking into the UI. Luckily JUCE::jmap handles that. It was a good lesson in the gap between "the math is correct" and "the plugin feels right to a musician turning a knob."

I also learned, the hard way, why every parameter needs smoothing: an instantaneous jump creates a literal discontinuity in the waveform, audible as a click, because no physical circuit could move that fast. Every control now runs through a ~20ms smoothing ramp before it reaches the audio thread.

## **Results**

I profiled the plugin with Visual Studio's ETW profiler against a live FL Studio session. The expensive part — the 8x oversampled nonlinear core — stayed under 10% total CPU overhead, and the multi-rate design held up without introducing numerical instability.

## **Technical Deep-Dive**

For the full three-stage signal chain, filter design math, and the complete limitations list, see the[ detailed write-up](https://delali-adanuty.github.io/Distortion/).
