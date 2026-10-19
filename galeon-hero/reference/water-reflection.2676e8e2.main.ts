// REFERENCE ONLY — not loaded by the page.
// Figma shader "Water reflection"
//   id:      9518f0c3-6790-4cc5-a56a-a9cd5e956920
//   version: 2676e8e22f119055c3aa51418de589d01ba4e84a  (the one used by node 48:1421)
// Source as exported from Figma (figma:shaders host, WGSL/WebGPU). The browser
// port lives in src/fx/hull-caustics-layer.js (WebGL2 / GLSL ES 3.00).
// Instance params in the frame: see src/config/fx-defaults.js → FIGMA_INSTANCE.

import { defineProperties } from "figma:shaders"

export default function Effect() {}

export function setup(device, frame) {
  var wgsl = `
diagnostic(off,derivative_uniformity);
struct Uniforms {
  frameData: vec4f,
  inputDimsData: vec4f,
  lightIntensity: vec4f,
  rippleSize: vec4f,
  rippleComplexity: vec4f,
  reflectionSoftness: vec4f,
  reflectionAngle: vec4f,
  loopDuration: vec4f,
  animationPhase: vec4f,
  lightColor: vec4f,
  reflectionOnly: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var inputTex: texture_2d<f32>;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) uv: vec2f,
};
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

fn sampleInput(p: vec2f) -> vec4f {
  return textureSampleLevel(inputTex, samp, clamp(p, vec2f(0.0), vec2f(1.0)), 0.0);
}

// Like sampleInput but returns transparent (premultiplied zero) outside the
// input rect instead of repeating the edge texel.
fn sampleInputOrZero(p: vec2f) -> vec4f {
  let inside = step(vec2f(0.0), p) * step(p, vec2f(1.0));
  return sampleInput(p) * (inside.x * inside.y);
}

fn waterHash(cell: vec2f) -> vec2f {

  return fract(sin(vec2f(dot(cell, vec2f(127.1, 311.7)), dot(cell, vec2f(269.5, 183.3)))) * 43758.5453);

}

// Moving cellular boundaries, bent by a smooth water-like domain warp.

// Every temporal term uses an integer harmonic of the same cycle.

fn causticGap(p: vec2f, cycle: f32, seed: vec2f) -> f32 {

  let warped = p + 0.23 * vec2f(

    sin(p.y * 1.8 + 0.62 * sin(cycle)) + 0.38 * sin(p.x * 2.7 + p.y + 0.42 * cos(cycle)),

    cos(p.x * 1.65 + 0.56 * cos(cycle)) + 0.34 * sin(p.y * 2.5 - p.x + 0.46 * sin(cycle))

  );

  let cell = floor(warped);

  let local = fract(warped);

  var first = 100.0;

  var second = 100.0;

  for (var j = -1; j <= 1; j = j + 1) {

    for (var i = -1; i <= 1; i = i + 1) {

      let offset = vec2f(f32(i), f32(j));

      let h = waterHash(cell + offset + seed);

      let phases = h * 6.28318530718;

      let site = vec2f(0.5) + 0.23 * sin(phases + vec2f(cycle, -cycle))

        + 0.055 * cos(phases.yx * 2.0 + vec2f(2.0 * cycle));

      let delta = offset + site - local;

      let distanceSquared = dot(delta, delta);

      if (distanceSquared < first) {

        second = first;

        first = distanceSquared;

      } else {

        second = min(second, distanceSquared);

      }

    }

  }

  return max(sqrt(second) - sqrt(first), 0.0);

}

fn causticLight(gap: f32, width: f32) -> f32 {

  let antialias = max(fwidth(gap), 0.0015);

  let ridge = 1.0 - smoothstep(width * 0.15, width + antialias, gap);

  let halo = exp(-gap / max(width * 2.8, 0.001));

  return ridge * 0.78 + halo * 0.22;

}

@vertex fn vs_main(in: VsIn) -> VsOut {
  var out: VsOut;
  out.position = vec4f(in.pos, 0.0, 1.0);
  out.uv = in.uv;
  return out;
}

@fragment fn fs_main(@location(0) outputUv_in: vec2f) -> @location(0) vec4f {
  let time = u.frameData.x;
  let outputUv = outputUv_in;
  let dims = max(u.frameData.yz, vec2f(1.0));
  let inputDims = max(u.inputDimsData.xy, vec2f(1.0));
  let inputTexel = vec2f(1.0) / inputDims;
  let uv = outputUv;
  // texel and aspect are input-relative to match uv. Zoom fills rescale texel
  // alongside their uv redefinition below (see zoomLocal).
  let texel = inputTexel;
  let aspect = inputDims.x / max(inputDims.y, 1.0);
  let lightIntensity = u.lightIntensity.x;
  let rippleSize = u.rippleSize.x;
  let rippleComplexity = u.rippleComplexity.x;
  let reflectionSoftness = u.reflectionSoftness.x;
  let reflectionAngle = u.reflectionAngle.x;
  let loopDuration = u.loopDuration.x;
  let animationPhase = u.animationPhase.x;
  let inputColor = sampleInput(uv);
  let cycle = 6.28318530718 * (time / max(loopDuration, 0.01) + animationPhase / 100.0);
  let angle = reflectionAngle * 0.0174532925199;
  let p = (uv - vec2f(0.5)) * dims / max(rippleSize, 1.0);
  let rotated = vec2f(cos(angle) * p.x - sin(angle) * p.y, sin(angle) * p.x + cos(angle) * p.y);
  // Hardcoded modest vertical wall projection stretch; no extra controls.
  let projected = rotated / vec2f(1.0, 1.32);
  let width = mix(0.025, 0.16, reflectionSoftness);
  let primary = causticLight(causticGap(projected, cycle, vec2f(7.0, 13.0)), width);
    var secondary = 0.0;
    var fine = 0.0;
    // These conditions are uniform: avoid paying for inactive detail layers.
    if (rippleComplexity > 1.0) {
      secondary = causticLight(causticGap(projected * 1.81 + vec2f(6.2, -3.7), cycle + 1.9, vec2f(31.0, 59.0)), width * 0.86);
    }
    if (rippleComplexity > 2.0) {
      fine = causticLight(causticGap(projected * 3.17 + vec2f(-2.4, 8.3), cycle + 4.1, vec2f(73.0, 101.0)), width * 0.75);
    }
  let secondaryWeight = clamp(rippleComplexity - 1.0, 0.0, 1.0) * 0.46;
  let fineWeight = clamp(rippleComplexity - 2.0, 0.0, 1.0) * 0.24;
  let illumination = (primary + secondary * secondaryWeight + fine * fineWeight) / (1.0 + secondaryWeight + fineWeight);
  let strength = 1.0 - exp(-lightIntensity * illumination * 1.45);
  // User-selected projected light, with warm ivory as the default.
  let lightColor = clamp(u.lightColor, vec4f(0.0), vec4f(1.0));
  if (u.reflectionOnly.x > 0.5) {
    // Generate coverage independently of source fill, including null input.
    // Trim negligible halo tails for truly transparent spaces between ridges.
    // Host rendering supplies the shape clip; no geometry mask is available here.
    let reflectionAlpha = clamp(strength * lightColor.a, 0.0, 1.0)
      * smoothstep(0.015, 0.06, illumination);
    return vec4f(lightColor.rgb * reflectionAlpha, reflectionAlpha);
  }
  // Original screened-light mode preserves source color detail and alpha.
  let lit = inputColor.rgb + (vec3f(inputColor.a) - inputColor.rgb) * lightColor.rgb * strength * lightColor.a;
  return vec4f(lit, inputColor.a);
}
`
  frame.state.module = device.createShaderModule({ code: wgsl })
  frame.state.pipeline = null
  frame.state.pipelineFormat = null

  frame.state.quad = device.createBuffer({
    size: 6 * 4 * 4,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  })
  new Float32Array(frame.state.quad.getMappedRange()).set([
    -1, -1,   0, 1,
     1, -1,   1, 1,
    -1,  1,   0, 0,
    -1,  1,   0, 0,
     1, -1,   1, 1,
     1,  1,   1, 0,
  ])
  frame.state.quad.unmap()

  frame.state.uniformBuf = device.createBuffer({
    size: 176,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  frame.state.sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  })

  frame.state.placeholder = device.createTexture({
    size: [1, 1, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  })
  device.queue.writeTexture(
    { texture: frame.state.placeholder },
    new Uint8Array([0, 0, 0, 0]),
    { bytesPerRow: 4 },
    { width: 1, height: 1, depthOrArrayLayers: 1 },
  )
}

export function render(device, frame) {
  var params = frame.params || {}
  function finiteNumber(value, fallback) {
    var num = Number(value)
    return Number.isFinite(num) ? num : fallback
  }
  function numberParam(name, fallback) {
    return finiteNumber(params[name], fallback)
  }
  function boolParam(name, fallback) {
    if (typeof params[name] === 'boolean') return params[name] ? 1 : 0
    return fallback ? 1 : 0
  }
  function selectParam(name, count, fallbackIndex) {
    // A select is a numeric dropdown: params[name] is the chosen option's index.
    var index = Math.round(Number(params[name]))
    return Number.isFinite(index) && index >= 0 && index < count ? index : fallbackIndex
  }
  function colorParam(name, fallback) {
    var value = params[name] || {}
    return [
      finiteNumber(value.r, fallback[0]),
      finiteNumber(value.g, fallback[1]),
      finiteNumber(value.b, fallback[2]),
      finiteNumber(value.a, fallback[3]),
    ]
  }
  function pointParam(name, fallback) {
    var value = params[name] || {}
    return [
      finiteNumber(value.x, fallback[0]),
      finiteNumber(value.y, fallback[1]),
    ]
  }
  function pointRadiusParam(name, fallback) {
    var value = params[name] || {}
    return [
      finiteNumber(value.x, fallback[0]),
      finiteNumber(value.y, fallback[1]),
      finiteNumber(value.radius, fallback[2]),
    ]
  }
  function pointPointLineParam(name, fallback) {
    var value = params[name] || {}
    return [
      finiteNumber(value.x, fallback[0]),
      finiteNumber(value.y, fallback[1]),
      finiteNumber(value.x2, fallback[2]),
      finiteNumber(value.y2, fallback[3]),
    ]
  }
  function pointAngleRadiusParam(name, fallback) {
    var value = params[name] || {}
    return [
      finiteNumber(value.x, fallback[0]),
      finiteNumber(value.y, fallback[1]),
      finiteNumber(value.radius, fallback[2]),
      finiteNumber(value.angle, fallback[3]),
    ]
  }
  function colorPointParam(name, fallback) {
    var value = params[name] || {}
    var color = value.color || {}
    return [
      finiteNumber(value.x, fallback[0]),
      finiteNumber(value.y, fallback[1]),
      0,
      0,
      finiteNumber(color.r, fallback[2]),
      finiteNumber(color.g, fallback[3]),
      finiteNumber(color.b, fallback[4]),
      finiteNumber(color.a, fallback[5]),
    ]
  }
  function gradientParam(name, fallback) {
    var value = params[name] || {}
    var stops = Array.isArray(value.stops) && value.stops.length > 0 ? value.stops : fallback
    // Layout: 8 stop colors (rgba), then 8 positions packed 4-per-vec4, then the live count.
    var out = new Array(44).fill(0)
    var count = Math.min(stops.length, 8)
    for (var i = 0; i < count; i++) {
      var stop = stops[i] || {}
      var color = stop.color || {}
      out[i * 4] = finiteNumber(color.r, 0)
      out[i * 4 + 1] = finiteNumber(color.g, 0)
      out[i * 4 + 2] = finiteNumber(color.b, 0)
      out[i * 4 + 3] = finiteNumber(color.a, 1)
      out[32 + i] = finiteNumber(stop.position, 0)
    }
    out[40] = count
    return out
  }

  var output = frame.output || {}
  var width = Math.max(1, finiteNumber(output.physicalWidth, finiteNumber(output.width, 1)))
  var height = Math.max(1, finiteNumber(output.physicalHeight, finiteNumber(output.height, 1)))
  var renderScale = Math.max(0.0001, finiteNumber(frame.renderScale, 1))
  var duration = Math.max(0.01, numberParam("loopDuration", 12))
  // Runtime time is milliseconds. Reduce in JS before float32 packing so
  // every loop follows the same periodic orbit, even after a long session.
  var seconds = finiteNumber(frame.time, 0) * 0.001
  var time = ((seconds % duration) + duration) % duration
  var inputWidth = width
  var inputHeight = height

  device.queue.writeBuffer(
    frame.state.uniformBuf,
    0,
    new Float32Array([
      time, width / renderScale, height / renderScale, 0,
      inputWidth, inputHeight, 0, 0,
      numberParam("lightIntensity", 0.65), 0, 0, 0,
      numberParam("rippleSize", 95), 0, 0, 0,
      numberParam("rippleComplexity", 2), 0, 0, 0,
      numberParam("reflectionSoftness", 0.4), 0, 0, 0,
      numberParam("reflectionAngle", -18), 0, 0, 0,
      duration, 0, 0, 0,
      numberParam("animationPhase", 0), 0, 0, 0,
      ...colorParam("lightColor", [1.0, 0.95, 0.82, 1.0]),
      boolParam("reflectionOnly", true), 0, 0, 0,
    ]),
  )

  var inputView = frame.input != null
    ? frame.input.createView()
    : frame.state.placeholder.createView()

  var outputFormat = frame.output.format
  if (frame.state.pipeline == null || frame.state.pipelineFormat !== outputFormat) {
    frame.state.pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: frame.state.module,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 16,
          attributes: [
            { shaderLocation: 0, format: 'float32x2', offset: 0 },
            { shaderLocation: 1, format: 'float32x2', offset: 8 },
          ],
        }],
      },
      fragment: {
        module: frame.state.module,
        entryPoint: 'fs_main',
        targets: [{ format: outputFormat }],
      },
      primitive: { topology: 'triangle-list' },
    })
    frame.state.pipelineFormat = outputFormat
  }

  var bindGroup = device.createBindGroup({
    layout: frame.state.pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: frame.state.uniformBuf } },
      { binding: 1, resource: frame.state.sampler },
      { binding: 2, resource: inputView },
    ],
  })

  var encoder = device.createCommandEncoder()
  var pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: frame.output.createView(),
      loadOp: 'clear',
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      storeOp: 'store',
    }],
  })
  pass.setPipeline(frame.state.pipeline)
  pass.setBindGroup(0, bindGroup)
  pass.setVertexBuffer(0, frame.state.quad)
  pass.draw(6)
  pass.end()
  device.queue.submit([encoder.finish()])
}

defineProperties(Effect, {
  "reflectionOnly": {
    type: "boolean",
    label: "Reflections only",
    defaultValue: true,
  },
  "lightColor": {
    type: "color",
    label: "Light color",
    defaultValue: { r: 1.0, g: 0.95, b: 0.82, a: 1.0 },
  },
  "lightIntensity": {
    type: "number",
    label: "Light intensity",
    defaultValue: 0.65,
    control: "slider",
    min: 0,
    max: 2,
    step: 0.01,
  },
  "rippleSize": {
    type: "number",
    label: "Ripple size",
    defaultValue: 95,
    control: "slider",
    min: 16,
    max: 300,
    step: 1,
    unit: "px",
  },
  "rippleComplexity": {
    type: "number",
    label: "Ripple complexity",
    defaultValue: 2,
    control: "slider",
    min: 1,
    max: 3,
    step: 0.01,
  },
  "reflectionSoftness": {
    type: "number",
    label: "Reflection softness",
    defaultValue: 0.4,
    control: "slider",
    min: 0,
    max: 1,
    step: 0.01,
  },
  "reflectionAngle": {
    type: "number",
    label: "Reflection angle",
    defaultValue: -18,
    control: "slider",
    min: -180,
    max: 180,
    step: 1,
    unit: "°",
  },
  "loopDuration": {
    type: "number",
    label: "Loop duration",
    defaultValue: 12,
    control: "slider",
    min: 2,
    max: 60,
    step: 0.1,
    unit: "s",
  },
  "animationPhase": {
    type: "number",
    label: "Animation phase",
    defaultValue: 0,
    control: "slider",
    min: 0,
    max: 100,
    step: 0.1,
    unit: "%",
  },
})
