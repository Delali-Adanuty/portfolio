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
# Multi-Rate Distortion Processor

## Why I Built This
Distortion is one of the most-used effects in music production. In the digital domain, it is hard to do well. A nonlinear waveshaper adds harmonics, and harmonics above the Nyquist frequency fold back into the audible range as harsh, inharmonic aliasing. A plugin cannot run the host DAW at a higher sample rate. So I wanted to understand the problem well enough to solve it, not just hide it.

## The Approach
I put the waveshaper inside an 8× oversampled signal path. The JUCE `dsp::Oversampling` class raises the sample rate in three 2× stages of half-band, linear-phase FIR filters, then lowers it again after the waveshaper. The filter orders are 118, 50 and 46 on the way up, and 78, 34 and 30 on the way down. The linear filters stay at the host rate, where they cost less CPU.

The multi-rate structure comes from *DSPFuzz: A Guitar Distortion Pedal Using The Stanford DSP Shield* (W. Herman, Stanford EE264). Herman designed one 141st-order FIR filter in MATLAB. I used JUCE's cascaded half-band stages instead.

I also changed the waveshaper. Herman's fixed-point hardware needed rational and polynomial approximations. My plugin runs in floating point, so I use the exact tanh(x) function. tanh is symmetric, so it adds only odd harmonics. An asymmetric curve, for even harmonics and a more "tube-like" character, is a next step.

## What Tripped Me Up
**One knob, two filters.** The user sees one Tone control. Inside, that one value moves two filters. The high-pass before the waveshaper goes down from 600 Hz to 40 Hz, and the low-pass after it goes up from 1 kHz to 15 kHz. So turning Tone up opens the sound at both ends. `juce::jmap` does the mapping. The lesson was the gap between "the math is correct" and "the knob feels right to a musician."

**Parameter smoothing.** An instant parameter jump makes a step in the waveform, and you hear the step as a click. I added smoothers for every control. Trim and Mix now change smoothly, through JUCE's built-in gain and mixer ramps. But two smoothers do not work yet. The drive smoother never advances, so drive changes only apply when the host prepares the plugin again. The tone smoother is bypassed, so tone changes still jump. Both are known fixes on my list.

## Results
- **Aliasing:** With a 5 kHz sine at 44.1 kHz and 20 dB of drive, the inharmonic power is −100.4 dB with oversampling. Without it, the same chain gives −20.5 dB. That is an **80 dB decrease**.
- **Harmonics:** At 750 Hz, the 3rd harmonic is −10.7 dB and the 5th is −17.3 dB. The even harmonics are below −139 dB, as expected from a symmetric curve.
- **Latency:** 64.25 samples, or 1.46 ms at 44.1 kHz.
- **CPU:** I profiled the plugin with Visual Studio's ETW profiler in a live FL Studio session. The full plugin, including the 8× FIR stages, stayed under 10% of total CPU.

## Technical Deep-Dive
For the full signal chain, filter orders, test conditions and known issues, see the [detailed write-up](https://delali-adanuty.github.io/Distortion/).
