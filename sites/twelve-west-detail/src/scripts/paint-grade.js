// Scroll-driven paint correction: only the car's red paint changes. Ahead of a bright polish
// line the paint is dull, hazy and gritty; behind it the paint is deep red with crisp
// reflections. The line sweeps across the frame as the visitor scrolls, like a buffer pass.
// Walls, doors and floor are left alone. Without WebGL the film just plays ungraded.
// The source can be the film or a still photo (the phone hero polishes the ending frame).

const VERT = `attribute vec2 p; varying vec2 uv; uniform vec2 sc; uniform vec2 off;
void main(){ uv = (p * 0.5 + 0.5) * sc + off; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv; uniform sampler2D tex; uniform float clean;
float grain(vec2 q){ return fract(sin(dot(floor(q), vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 c = texture2D(tex, uv).rgb;
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float sat = (mx - mn) / (mx + 0.0001);
  float red = smoothstep(0.14, 0.38, c.r - max(c.g, c.b)) * smoothstep(0.3, 0.55, sat);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 gray = vec3(lum);
  // Dull: faded, milky and flat, highlights knocked down, a little grit.
  vec3 dull = mix(c, gray, 0.42);
  dull = mix(dull, vec3(0.70, 0.58, 0.57), 0.16);
  dull = mix(vec3(0.36), dull, 0.76);
  dull += (grain(uv * vec2(900.0, 506.0)) - 0.5) * 0.06;
  // Shine: rich red, more contrast, reflections pushed brighter.
  vec3 shine = clamp(mix(gray, c, 1.32) * 1.03 + smoothstep(0.5, 0.95, lum) * 0.28, 0.0, 1.0);
  // The polish line runs on a slight diagonal and travels left to right.
  float x = uv.x + (uv.y - 0.5) * 0.22;
  float edge = mix(-0.18, 1.18, clean);
  float done = 1.0 - smoothstep(edge - 0.035, edge + 0.035, x);
  float glint = exp(-pow((x - edge) / 0.018, 2.0));
  vec3 car = mix(dull, shine, done) + vec3(1.0, 0.94, 0.9) * glint * 0.85;
  gl_FragColor = vec4(mix(c, clamp(car, 0.0, 1.0), red), 1.0);
}`;

export function createPaintGrade(canvas, video, pos = [0.5, 0.5]) {
  const still = !('videoWidth' in video);
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
    const vw = still ? video.naturalWidth : video.videoWidth, vh = still ? video.naturalHeight : video.videoHeight;
    const va = (vw || 16) / (vh || 9), ca = w / h;
    let sx = 1, sy = 1;
    if (ca > va) sy = va / ca; else sx = ca / va;
    gl.uniform2f(uSc, sx, sy); gl.uniform2f(uOff, (1 - sx) * pos[0], (1 - sy) * pos[1]);
  }
  let last = -1, lastClean = -1;
  function draw(clean, force) {
    if (still ? !video.complete || !video.naturalWidth : video.readyState < 2) return;
    const t = still ? 0 : video.currentTime;
    if (!force && t === last && Math.abs(clean - lastClean) < 0.004) return;
    // A still only needs uploading once.
    const upload = !still || last === -1;
    last = t; lastClean = clean;
    if (upload) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    gl.uniform1f(uClean, clean);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  return { resize, draw };
}
