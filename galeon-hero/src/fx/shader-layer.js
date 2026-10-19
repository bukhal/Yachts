import { createGL, createProgram, createQuad, createImageTexture, placeCanvas, disposeGL } from "./gl.js";

/**
 * One canvas, one WebGL2 context, one fragment shader. GPU resources are
 * created once; resize only changes the backing store, sliders only change
 * uniforms.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ fs: string, textures?: Record<string, TexImageSource|null>, onLost?: () => void }} opts
 */
export function createShaderLayer(canvas, { fs, textures = {}, onLost }) {
  const gl = createGL(canvas);
  const { prog, uniforms } = createProgram(gl, fs);
  const quad = createQuad(gl);
  const texList = [];
  const texUnits = {};
  Object.entries(textures).forEach(([name, img], i) => {
    if (!img) return;
    texList.push(createImageTexture(gl, img));
    texUnits[name] = { unit: i, tex: texList[texList.length - 1] };
  });

  let dpr = 1;
  let lost = false;
  const handleLost = (e) => {
    e.preventDefault();
    lost = true;
    onLost?.();
  };
  canvas.addEventListener("webglcontextlost", handleLost);

  return {
    canvas,
    uniforms,
    get lost() {
      return lost;
    },
    place(box, dprCap) {
      dpr = placeCanvas(canvas, box, dprCap);
    },
    /** @param {(gl: WebGL2RenderingContext, u: Record<string, WebGLUniformLocation>, dpr: number) => void} setUniforms */
    draw(setUniforms) {
      if (lost) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      for (const [name, { unit, tex }] of Object.entries(texUnits)) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (uniforms[name]) gl.uniform1i(uniforms[name], unit);
      }
      setUniforms(gl, uniforms, dpr);
      gl.bindVertexArray(quad.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    },
    clear() {
      if (lost) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", handleLost);
      disposeGL(gl, { prog, quad, textures: texList });
    },
  };
}
