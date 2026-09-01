---
layout: project.njk
title: Room Correction Filter
description: A conventional graphic EQ can't fix the phase and magnitude damage
  a room does to sound. This Python toolchain measures a room's actual acoustic
  signature, calculates a stable inverse filter using Kirkeby regularization,
  and formats it for real-time convolution in a C++/JUCE plugin. Verified
  against physical Room EQ Wizard sweeps, not just simulated plots, it delivers
  a measured ~15 dB reduction in the room's worst modal null.
tech: Python, C++, JUCE
github: https://github.com/Delali-Adanuty/RoomEq
date: 2026-08-30T00:23:00.000-04:00
---
# **Room Correction DSP Pipeline**

## **Why I Built This**

A room does more damage to sound than any speaker ever will — deep modal nulls, reflections, comb filtering across the whole spectrum. A graphic EQ can't fix any of that because it only touches magnitude, not phase. I wanted to build the real fix: measure the room's actual acoustic signature and compute the exact mathematical inverse of it, running in real time inside a plugin.

## **The Approach**

The pipeline starts with a physical measurement — a logarithmic sine sweep played through the room and captured with a measurement mic in Room EQ Wizard. From there, a Python toolchain takes over: it deconvolves the raw capture into a clean impulse response, anchoring the direct-sound peak to index 0 and circularly wrapping the tail so the FFT doesn't blow up or leak phase across the spectrum.

The actual correction comes from Kirkeby regularization. A naive inverse filter (1/H_room) fails immediately in the real world — any frequency near a deep null demands infinite gain to "fix" it. Kirkeby solves this with a regularization term, and instead of one flat constant everywhere, I used a frequency-dependent beta array: conservative at the sub-bass and treble extremes where nulls are physically uncorrectable, tight through the midrange where the room's behavior is well-defined. A hard +12 dB ceiling sits underneath as a failsafe no matter what the math upstream allows. Deliberately, none of this touches tone — no target curve, no bass shelf. This corrects physics only; tonal shaping stays downstream in the mix, same as a normal workflow.

The last stage is just as important as the math: formatting the filter so JUCE's convolution engine can actually use it. That means truncating to a strict 8192-sample, power-of-two block, applying an asymmetric Hanning window to kill pre-ringing without chopping off the room's natural reverb tail, and reshaping the mono result into the stereo matrix the C++ engine expects.

## **What Tripped Me Up**

The first real obstacle was learning Room EQ Wizard itself. Before I could trust any DSP fix, I had to learn what each measurement tab was actually telling me about the room versus the speakers: SPL for raw frequency response, group delay for phase behavior, the spectrogram and waterfall for how energy decays over time, RT60 for reverberation. Getting used to how to actually set up to record the room was also a fun sidecourse.

Once I could read the measurements confidently, the nastiest code bug was invisible in Python and only showed up after the filter hit C++: the low end was being gutted. The pre-transient window was originally 44 samples — but a 40 Hz wave takes about 25 milliseconds to complete one cycle, so that window was unintentionally acting as a hard high-pass filter, chopping off exactly the correction tails the sub-bass modes needed. Widening it to 1024 samples fixed it, but getting there meant not trusting the Python-side plots alone — they looked perfect right up until the C++ export silently threw the low end away.

That fix introduced its own constraint: the total filter length had to land exactly on an 8192-sample power-of-two boundary for the convolution engine's SIMD alignment, which is what set the final 1024/7168 pre/post split.

There was also a plain export bug — the convolver was silently ignoring the filter entirely because the Python script was exporting a mono array against a stereo-only C++ contract. And an epsilon value in the deconvolution step, initially set far too small, caused numerical instability wherever the measurement sweep had little real acoustic energy to work with.

## **Results**

Verification came from physical REW sweeps, not simulated diagnostics — a baseline trace with the plugin bypassed, compared directly against a corrected trace with it active. That comparison shows roughly 15 dB of null-fill at the room's worst modal problem, a sharp null at 50 Hz.

## **What I Learned**

Coming from a classroom DSP background, system inversion was a clean equation: H_inv = 1/H. Running that literally against a real room and watching it demand infinite gain at an acoustic null forced a real reckoning between the math and the physics. It’s always fun to learn why the perfect mathematical equations don’t work in the real world and learning about the shortfalls that we have to accommodate or workaround to get as much accuracy as we can is one of the things that make engineering exciting(at least for me). 

Kirkeby regularization, and later the move from a flat beta constant to a frequency-dependent array, is what actually closed that gap.

## **Technical Deep-Dive**

For the full measurement methodology, filter response plots, and formatting constraints, see the[ detailed write-up](https://delali-adanuty.github.io/RoomEq/).
