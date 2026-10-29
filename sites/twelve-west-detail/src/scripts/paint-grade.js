// Scroll-driven paint grade: only the car's red paint goes from dull and hazy at the top of the
// film to deep and glossy at the bottom. Walls, doors and floor are left alone. WebGL, drawn only
// when the frame or the scroll changes. Without WebGL the film just plays ungraded.

const VERT = `attribute vec2 p; varying vec2 uv; uniform vec2 sc; uniform vec2 off;
void main(){ uv = (p * 0.5 + 0.5) * sc + off; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `precision mediump float; varying vec2 uv; uniform sampler2D tex; uniform float clean;
void main(){
  vec3 c = texture2D(tex, uv).rgb;
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float sat = (mx - mn) / (mx + 0.0001);
  float red = smoothstep(0.18, 0.42, c.r - max(c.g, c.b)) * smoothstep(0.35, 0.6, sat);
  vec3 gray = vec3(dot(c, vec3(0.299, 0.587, 0.114)));
  vec3 dull = mix(c, gray, 0.5) * 0.8 + vec3(0.07, 0.065, 0.06);
  vec3 vivid = clamp(mix(gray, c, 1.18) * 1.05, 0.0, 1.0);
  gl_FragColor = vec4(mix(c, mix(dull, vivid, clean), red), 1.0);
}`;

export function createPaintGrade(canvas, video) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const uClean = gl.getUniformLocation(prog, 'clean'), uSc = gl.getUniformLocation(prog, 'sc'), uOff = gl.getUniformLocation(prog, 'off');

  // Size the canvas to the stage and crop the frame the way object-fit: cover does.
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    const va = (video.videoWidth || 16) / (video.videoHeight || 9), ca = w / h;
    let sx = 1, sy = 1;
    if (ca > va) sy = va / ca; else sx = ca / va;
    gl.uniform2f(uSc, sx, sy); gl.uniform2f(uOff, (1 - sx) / 2, (1 - sy) / 2);
  }
  let last = -1, lastClean = -1;
  function draw(clean, force) {
    if (video.readyState < 2) return;
    const t = video.currentTime;
    if (!force && t === last && Math.abs(clean - lastClean) < 0.004) return;
    last = t; lastClean = clean;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    gl.uniform1f(uClean, clean);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  return { resize, draw };
}
