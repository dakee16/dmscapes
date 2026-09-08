import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

// A real, locally rendered scene. No remote viewer, accounts or product data.
const C = {
  blue: 0x2b4eff,
  ink: 0x17172b,
  paper: 0xfafaf8,
  yellow: 0xffd84d,
  wood: 0xc79e6b,
};
function buildRoom() {
  const shapes = new Map();
  function geometry(w, h, d, r = 0.04) {
    const key = [w, h, d, r].join(",");
    if (!shapes.has(key))
      shapes.set(
        key,
        new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)),
      );
    return shapes.get(key);
  }
  const root = new THREE.Group();
  const mats = {};
  const mat = (name, color, extra = {}) =>
    mats[name] ??
    (mats[name] = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.78,
      ...extra,
    }));
  const white = mat("white", 0xfffdf7),
    wood = mat("wood", C.wood),
    woodDark = mat("woodDark", 0xa98152),
    ink = mat("ink", C.ink),
    blue = mat("blue", C.blue),
    wall = mat("wall", 0xf2f1ec),
    bedding = mat("bedding", C.blue),
    yellow = mat("yellow", C.yellow),
    green = mat("green", 0x426d46),
    leafLight = mat("leafLight", 0x71975b),
    metal = mat("metal", 0xd5d9df, { metalness: 0.55, roughness: 0.35 }),
    glass = mat("glass", 0xd5e6f0, {
      emissive: 0xb4d8ef,
      emissiveIntensity: 0.15,
    }),
    light = mat("light", 0xffefb1, {
      emissive: 0xffd472,
      emissiveIntensity: 0.7,
    });
  const categories = {
    base: new THREE.Group(),
    structure: new THREE.Group(),
    furniture: new THREE.Group(),
    details: new THREE.Group(),
  };
  for (const g of Object.values(categories)) root.add(g);
  const box = (parent, w, h, d, m, x, y, z, r = 0.025) => {
    const o = new THREE.Mesh(geometry(w, h, d, r), m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const sphere = (parent, r, m, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m);
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  const cylinder = (parent, r1, r2, h, m, x, y, z) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 24), m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const part = (category) => {
    const g = new THREE.Group();
    categories[category].add(g);
    return g;
  };
  const base = categories.base;
  box(base, 4.95, 0.23, 3.99, wood, 0, -0.14, 0, 0.1);
  // Individual wood boards, with restrained alternating tones.
  for (let i = 0; i < 13; i++)
    for (let j = 0; j < 3; j++) {
      const shade = new THREE.MeshStandardMaterial({
        color: new THREE.Color(C.wood).offsetHSL(
          0,
          0,
          (((i * 7 + j * 3) % 7) - 3) * 0.009,
        ),
        roughness: 0.86,
      });
      box(
        base,
        0.373,
        0.024,
        1.3,
        shade,
        -2.235 + i * 0.373,
        0.0,
        -1.32 + j * 1.32,
        0.003,
      );
    }
  const walls = part("structure");
  box(walls, 4.94, 2.85, 0.12, white, 0, 1.41, -1.94, 0.018);
  box(walls, 0.12, 2.85, 3.85, wall, -2.41, 1.41, -0.025, 0.018);
  box(walls, 4.78, 0.09, 0.045, wood, 0, 0.055, -1.857, 0.005);
  box(walls, 0.045, 0.09, 3.8, wood, -2.329, 0.055, -0.01, 0.005);
  const window = part("structure");
  box(window, 1.77, 1.3, 0.035, glass, 1.06, 1.92, -1.863, 0.001);
  for (const x of [0.145, 1.06, 1.975])
    box(window, 0.052, 1.43, 0.1, wood, x, 1.92, -1.81, 0.005);
  for (const y of [1.205, 1.92, 2.635])
    box(window, 1.88, 0.045, 0.1, wood, 1.06, y, -1.81, 0.005);
  box(window, 2.02, 0.07, 0.23, wood, 1.06, 1.18, -1.77, 0.015);
  box(window, 1.89, 0.12, 0.12, white, 1.06, 2.66, -1.75, 0.03);
  const bed = part("furniture");
  box(bed, 1.12, 0.33, 2.14, wood, -1.55, 0.25, 0.29, 0.045);
  for (const x of [-1.98, -1.12])
    for (const z of [-0.65, 1.22])
      box(bed, 0.11, 0.24, 0.11, woodDark, x, 0.09, z, 0.013);
  box(bed, 1.07, 0.18, 2.1, white, -1.55, 0.495, 0.29, 0.075);
  box(bed, 1.045, 0.23, 1.39, bedding, -1.55, 0.65, 0.67, 0.11);
  box(bed, 1.05, 0.1, 0.25, bedding, -1.55, 0.79, 0.045, 0.047);
  box(bed, 1.17, 0.72, 0.12, wood, -1.55, 0.54, -0.83, 0.04);
  box(bed, 0.8, 0.18, 0.38, white, -1.55, 0.69, -0.485, 0.085);
  const pillow = box(bed, 0.37, 0.2, 0.29, yellow, -1.35, 0.825, -0.23, 0.08);
  pillow.rotation.z = -0.12;
  pillow.rotation.x = 0.2;
  for (const x of [-1.85, -1.55, -1.25])
    box(bed, 0.011, 0.01, 1.19, blue, x, 0.772, 0.7, 0.003);
  const desk = part("furniture");
  box(desk, 1.77, 0.105, 0.72, wood, 1.01, 0.96, -1.275, 0.025);
  for (const x of [0.25, 1.73])
    for (const z of [-1.56, -1])
      box(desk, 0.074, 0.94, 0.074, woodDark, x, 0.46, z, 0.012);
  box(desk, 0.42, 0.62, 0.63, wood, 1.52, 0.61, -1.29, 0.025);
  for (const y of [0.37, 0.58, 0.79]) {
    box(desk, 0.365, 0.016, 0.012, woodDark, 1.52, y, -0.969, 0.003);
    box(desk, 0.13, 0.026, 0.034, woodDark, 1.52, y + 0.065, -0.947, 0.006);
  }
  const chair = part("furniture");
  box(chair, 0.52, 0.13, 0.5, blue, 0.77, 0.54, -0.55, 0.08);
  const chairback = box(
    chair,
    0.55,
    0.52,
    0.095,
    blue,
    0.77,
    0.83,
    -0.296,
    0.065,
  );
  chairback.rotation.x = -0.1;
  for (const x of [0.57, 0.97])
    for (const z of [-0.74, -0.38])
      box(chair, 0.05, 0.46, 0.05, woodDark, x, 0.24, z, 0.012);
  const shelf = part("furniture");
  for (const x of [-0.67, -0.02])
    box(shelf, 0.08, 2.18, 0.48, wood, x, 1.12, -1.615, 0.012);
  box(shelf, 0.7, 2.18, 0.055, woodDark, -0.345, 1.12, -1.832, 0.009);
  for (const y of [0.08, 0.59, 1.1, 1.61, 2.18])
    box(shelf, 0.72, 0.065, 0.49, wood, -0.345, y, -1.61, 0.012);
  const night = part("furniture");
  box(night, 0.43, 0.51, 0.47, wood, -2.045, 0.28, -1.33, 0.027);
  box(night, 0.37, 0.17, 0.012, woodDark, -2.045, 0.28, -1.088, 0.01);
  box(night, 0.075, 0.025, 0.03, woodDark, -2.045, 0.44, -1.08, 0.008);
  const rug = part("furniture");
  cylinder(rug, 0.88, 0.88, 0.025, mat("rug", 0xe6dfce), 0.4, 0.044, 0.78);
  const rugEdge = new THREE.Mesh(
    new THREE.TorusGeometry(0.81, 0.01, 6, 96),
    mat("rugBorder", 0xc3b798),
  );
  rugEdge.rotation.x = Math.PI / 2;
  rugEdge.position.set(0.4, 0.062, 0.78);
  rug.add(rugEdge);
  const laptop = part("details");
  box(laptop, 0.52, 0.025, 0.36, metal, 0.82, 1.029, -1.25, 0.009);
  const lid = box(laptop, 0.5, 0.32, 0.022, ink, 0.82, 1.19, -1.39, 0.015);
  lid.rotation.x = -0.15;
  const screen = box(
    laptop,
    0.445,
    0.259,
    0.005,
    mat("screen", 0x536bdf, { emissive: 0x3452ff, emissiveIntensity: 0.17 }),
    0.82,
    1.19,
    -1.37,
    0.004,
  );
  screen.rotation.x = -0.15;
  box(laptop, 0.365, 0.004, 0.13, ink, 0.82, 1.045, -1.3, 0.006);
  box(laptop, 0.16, 0.004, 0.078, metal, 0.82, 1.047, -1.167, 0.004);
  const books = part("details");
  const bookColors = [
    white,
    blue,
    yellow,
    mat("bookRed", 0xb77164),
    mat("bookGreen", 0x5b7866),
    ink,
  ];
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 4; i++) {
      const h = 0.24 + ((row * 5 + i * 7) % 5) * 0.023,
        x = -0.575 + i * 0.116;
      const b = box(
        books,
        0.086,
        h,
        0.285,
        bookColors[(row + i) % 6],
        x,
        0.158 + row * 0.51 + h / 2,
        -1.515,
        0.009,
      );
      if (i === 3) b.rotation.z = -0.1;
      box(
        books,
        0.057,
        0.014,
        0.006,
        white,
        x,
        b.position.y + h * 0.2,
        -1.368,
        0.002,
      );
    }
  }
  for (let i = 0; i < 3; i++)
    box(
      books,
      0.25,
      0.043,
      0.35,
      bookColors[i],
      1.54,
      1.04 + i * 0.046,
      -1.24,
      0.007,
    );
  const lamp = part("details");
  cylinder(lamp, 0.09, 0.1, 0.03, woodDark, -2.04, 0.565, -1.33);
  cylinder(lamp, 0.022, 0.028, 0.26, woodDark, -2.04, 0.708, -1.33);
  cylinder(lamp, 0.09, 0.145, 0.15, light, -2.04, 0.88, -1.33);
  const lampGlow = new THREE.PointLight(0xffcd79, 0.4, 2);
  lampGlow.position.set(-2, 0.95, -1.1);
  lamp.add(lampGlow);
  const plants = part("details");
  function plant(x, y, z, size) {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    p.scale.setScalar(size);
    plants.add(p);
    cylinder(p, 0.19, 0.14, 0.35, white, 0, 0.175, 0);
    cylinder(p, 0.168, 0.168, 0.018, mat("soil", 0x4c4033), 0, 0.345, 0);
    for (let j = 0; j < 7; j++) {
      const a = j * 2.3999,
        height = 0.45 + (j % 4) * 0.135;
      const stem = cylinder(
        p,
        0.008,
        0.01,
        height,
        green,
        Math.cos(a) * 0.06,
        0.35 + height * 0.46,
        Math.sin(a) * 0.06,
      );
      stem.rotation.z = Math.sin(a) * 0.22;
      const leaf = sphere(
        p,
        0.19,
        j % 2 ? leafLight : green,
        Math.cos(a) * 0.18,
        0.4 + height,
        Math.sin(a) * 0.18,
        0.48,
        1.35,
        0.18,
      );
      leaf.rotation.set(0.25 * Math.cos(a), a, -0.55 * Math.sin(a));
    }
  }
  plant(1.98, 0.02, -0.63, 1.2);
  plant(0.15, 1.018, -1.36, 0.39);
  const mug = part("details");
  cylinder(mug, 0.053, 0.05, 0.1, white, 1.13, 1.07, -1.09);
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.033, 0.009, 6, 16),
    white,
  );
  handle.position.set(1.181, 1.07, -1.09);
  mug.add(handle);
  const posters = part("details");
  for (let i = 0; i < 2; i++) {
    const z = i === 0 ? -0.18 : 0.66,
      y = i === 0 ? 1.75 : 1.92;
    box(posters, 0.045, 0.75, 0.57, wood, -2.318, y, z, 0.008);
    box(posters, 0.008, 0.65, 0.47, white, -2.29, y, z, 0.002);
    const art = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 32),
      i === 0 ? blue : yellow,
    );
    art.rotation.y = Math.PI / 2;
    art.position.set(-2.281, y, z);
    posters.add(art);
  }
  const lights = part("details");
  const curve = new THREE.CatmullRomCurve3(
    Array.from(
      { length: 9 },
      (_, i) =>
        new THREE.Vector3(
          -2.15 + i * 0.47,
          2.65 - Math.sin((i / 8) * Math.PI) * 0.22,
          -1.8,
        ),
    ),
  );
  const wire = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 30, 0.007, 5, false),
    woodDark,
  );
  lights.add(wire);
  for (let i = 0; i < 13; i++) {
    const p = curve.getPoint(i / 12);
    sphere(lights, 0.025, light, p.x, p.y - 0.025, p.z);
  }
  // Linework remains exact geometry, tied to the same room footprint.
  const measurement = new THREE.Group();
  base.add(measurement);
  const lineMat = new THREE.LineBasicMaterial({
    color: C.blue,
    transparent: true,
    opacity: 0.65,
  });
  const path = (points) =>
    measurement.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          points.map((p) => new THREE.Vector3(...p)),
        ),
        lineMat,
      ),
    );
  path([
    [-2.35, 0.005, 2.19],
    [2.35, 0.005, 2.19],
  ]);
  path([
    [-2.35, 0.005, 2.1],
    [-2.35, 0.005, 2.28],
  ]);
  path([
    [2.35, 0.005, 2.1],
    [2.35, 0.005, 2.28],
  ]);
  path([
    [2.68, 0.005, -1.83],
    [2.68, 0.005, 1.84],
  ]);
  path([
    [2.6, 0.005, -1.83],
    [2.77, 0.005, -1.83],
  ]);
  path([
    [2.6, 0.005, 1.84],
    [2.77, 0.005, 1.84],
  ]);
  const items = [];
  for (const [category, group] of Object.entries(categories)) {
    if (category === "base") continue;
    group.children.forEach((child, i) =>
      items.push({
        object: child,
        category,
        index: i,
        base: child.position.clone(),
      }),
    );
  }
  return { root, mats, items, box };
}

export function createRoomView(
  container,
  { assembly = false, reduced = false } = {},
) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4.4, 4.4, 3.5, -3.5, 0.1, 80);
  camera.position.set(7.5, 6.7, 8.8);
  camera.lookAt(0, 1.3, 0);
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.34;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);
  scene.add(new THREE.AmbientLight(0xffffff, 1.45));
  scene.add(new THREE.HemisphereLight(0xeef3ff, 0xa5a0a2, 1.4));
  const sun = new THREE.DirectionalLight(0xfff4dd, 3.6);
  sun.position.set(2, 7, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -5,
    right: 5,
    top: 5,
    bottom: -5,
    near: 1,
    far: 20,
  });
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdce4ff, 1.25);
  fill.position.set(-5, 3, 3);
  scene.add(fill);
  const model = buildRoom();
  scene.add(model.root);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.13 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.275;
  ground.receiveShadow = true;
  scene.add(ground);
  const state = {
    visible: false,
    paused: reduced,
    dragging: false,
    angle: 0,
    targetAngle: 0,
    pointerX: 0,
    pointerY: 0,
    scroll: 0,
    assembly: assembly ? 0 : 1,
    vibe: "cozy",
    dirty: true,
  };
  let raf = 0,
    last = 0,
    entranceStart = performance.now(),
    destroyed = false,
    contextLost = false;
  const observer = new IntersectionObserver(
    (entries) => {
      state.visible = entries[0].isIntersecting;
      if (state.visible) request();
    },
    { rootMargin: "150px" },
  );
  observer.observe(container);
  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    const aspect = width / height;
    const vertical = Math.max(6.3, 7 / aspect);
    camera.left = (-vertical * aspect) / 2;
    camera.right = (vertical * aspect) / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    state.dirty = true;
    request();
  };
  const resizer = new ResizeObserver(resize);
  resizer.observe(container);
  function render(time) {
    raf = 0;
    if (destroyed || contextLost || document.hidden || !state.visible) return;
    // Bound ambient rendering to 30 fps. Scrolling and drag request updates too.
    if (time - last < 30 && !state.dirty) {
      request();
      return;
    }
    last = time;
    state.dirty = false;
    state.angle += (state.targetAngle - state.angle) * 0.09;
    const elapsed = (time - entranceStart) / 1000;
    const drift = state.paused ? 0 : Math.sin(time * 0.00023) * 0.045;
    model.root.rotation.y =
      state.angle +
      drift +
      (assembly ? state.assembly * 0.28 : state.scroll * 0.15);
    model.root.rotation.x = state.paused ? 0 : state.pointerY * 0.012;
    model.root.position.y =
      state.paused || assembly ? 0 : Math.sin(time * 0.00085) * 0.035;
    if (!assembly) {
      const intro = state.paused ? 1 : Math.min(1, elapsed / 1.9);
      model.items.forEach((it, i) => {
        const p = Math.max(0, Math.min(1, intro * 1.5 - i * 0.018));
        const e = 1 - Math.pow(1 - p, 3);
        it.object.position.y =
          it.base.y + (1 - e) * (it.category === "structure" ? 0.5 : 1.8);
        it.object.scale.setScalar(Math.max(0.001, e));
      });
      camera.zoom = 1 - state.scroll * 0.07;
    } else {
      const p = state.assembly;
      model.items.forEach((it, i) => {
        const start =
          it.category === "structure"
            ? -0.1
            : it.category === "furniture"
              ? 0.12 + (i % 4) * 0.025
              : 0.55 + (i % 4) * 0.024;
        const span = it.category === "structure" ? 0.2 : 0.3;
        const local = Math.max(0, Math.min(1, (p - start) / span));
        const e = 1 - Math.pow(1 - local, 3);
        it.object.visible = local > 0.001;
        it.object.position.y = it.base.y + (1 - e) * 2.2;
        it.object.scale.setScalar(Math.max(0.001, e));
      });
      camera.position.set(7.5 - 1.3 * p, 7.4 - 0.7 * p, 8.8);
      camera.lookAt(0, 1.3, 0);
      camera.zoom = 0.96 + 0.04 * p;
    }
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    container.classList.add("has-webgl");
    if (
      (!state.paused && !assembly) ||
      Math.abs(state.angle - state.targetAngle) > 0.002 ||
      (!assembly && elapsed < 2.5)
    )
      request();
  }
  function request() {
    if (!raf && !destroyed && !contextLost) raf = requestAnimationFrame(render);
  }
  const onVisibility = () => {
    if (!document.hidden) request();
  };
  document.addEventListener("visibilitychange", onVisibility);
  let dragStart = 0,
    dragAngle = 0;
  const down = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    state.dragging = true;
    dragStart = e.clientX;
    dragAngle = state.targetAngle;
    container.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    const rect = container.getBoundingClientRect();
    state.pointerY = (e.clientY - rect.top) / rect.height - 0.5;
    if (state.dragging) {
      state.targetAngle = THREE.MathUtils.clamp(
        dragAngle + (e.clientX - dragStart) * 0.005,
        -0.85,
        0.7,
      );
      state.dirty = true;
      request();
    }
  };
  const up = () => {
    state.dragging = false;
  };
  const key = (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      state.targetAngle = THREE.MathUtils.clamp(
        state.targetAngle + (e.key === "ArrowLeft" ? -0.15 : 0.15),
        -0.85,
        0.7,
      );
      state.dirty = true;
      request();
    }
  };
  if (!assembly) {
    container.addEventListener("pointerdown", down);
    container.addEventListener("pointermove", move);
    container.addEventListener("pointerup", up);
    container.addEventListener("pointercancel", up);
    container.addEventListener("keydown", key);
  }
  const lost = (e) => {
    e.preventDefault();
    contextLost = true;
    container.classList.remove("has-webgl");
    container.removeAttribute("tabindex");
    container.setAttribute(
      "aria-label",
      "Illustrative dorm room with blue bedding and warm wood furniture",
    );
    cancelAnimationFrame(raf);
    raf = 0;
  };
  canvas.addEventListener("webglcontextlost", lost);
  const palettes = {
    cozy: { bed: C.blue, wall: 0xf2f1ec, rug: 0xe6dfce },
    minimalist: { bed: 0xd8d8d3, wall: 0xf1f2f2, rug: 0xe8e8e4 },
    preppy: { bed: 0x263d9b, wall: 0xe8edf7, rug: 0xe8d9d5 },
    academia: { bed: 0x655744, wall: 0xded7c9, rug: 0xb8a68a },
    dark_academia: { bed: 0x655744, wall: 0xded7c9, rug: 0xb8a68a },
    y2k: { bed: 0x9eacee, wall: 0xe8e6f2, rug: 0xc7ccea },
    gamer: { bed: 0x464399, wall: 0x858aab, rug: 0x5a5e81 },
    team_spirit: { bed: 0x2b4eff, wall: 0xf1eee1, rug: 0xffd84d },
    retro: { bed: 0xd38442, wall: 0xeee0cc, rug: 0xa5a66b },
    pastel: { bed: 0xb8b0df, wall: 0xf2e7eb, rug: 0xddc6cd },
  };
  resize();
  request();
  return {
    setVibe(name) {
      const p = palettes[name];
      if (!p) return;
      state.vibe = name;
      model.mats.bedding.color.setHex(p.bed);
      model.mats.wall.color.setHex(p.wall);
      model.mats.rug.color.setHex(p.rug);
      state.dirty = true;
      request();
    },
    setProgress(p) {
      state.assembly = THREE.MathUtils.clamp(p, 0, 1);
      state.dirty = true;
      request();
    },
    setScroll(p) {
      state.scroll = THREE.MathUtils.clamp(p, 0, 1);
      state.dirty = true;
      request();
    },
    setPaused(value) {
      state.paused = value;
      state.dirty = true;
      request();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      resizer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      for (const [event, handler] of [
        ["pointerdown", down],
        ["pointermove", move],
        ["pointerup", up],
        ["pointercancel", up],
        ["keydown", key],
      ])
        container.removeEventListener(event, handler);
      canvas.removeEventListener("webglcontextlost", lost);
      const geometries = new Set(),
        materials = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material) {
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      container.classList.remove("has-webgl");
    },
  };
}
