import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { clampScores, setClock, setToast, state } from './state';
import { runSelfTests as runTestsImpl } from './tests';

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let world: THREE.Group;
let player: THREE.Object3D;
let mate: THREE.Object3D;
let feeder: THREE.Object3D;
let picnic: THREE.Object3D;
let trash: any;
const foods: THREE.Object3D[] = [];

let raf = 0;
let last = performance.now();
let paused = false;

const keys = new Set<string>();
const keyMap = { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'] } as const;

const velocity = new THREE.Vector3();
const FRICTION = 14;

const wander = { dir: new THREE.Vector2(1, 0), t: 0 };
let startTime = performance.now();

export function setActionKeys(opts: { pause?: boolean }) {
  if (typeof opts.pause === 'boolean') paused = opts.pause;
}

export function startGame(canvas: HTMLCanvasElement) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);
  scene.fog = new THREE.Fog(0x0b1020, 35, 90);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 12, 22);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.5, 0);
  controls.enablePan = false; controls.enableZoom = true; controls.maxPolarAngle = Math.PI * 0.49;

  const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x223344, 0.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(20, 30, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  // shadow camera bounds
  (sun.shadow.camera as any).left = -40; (sun.shadow.camera as any).right = 40; (sun.shadow.camera as any).top = 40; (sun.shadow.camera as any).bottom = -40; scene.add(sun);

  world = new THREE.Group(); scene.add(world);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), new THREE.MeshStandardMaterial({ color: 0x294d2f, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);

  const patio = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshStandardMaterial({ color: 0x7a6d58 }));
  patio.rotation.x = -Math.PI / 2; patio.position.set(-18, 0.01, -12); patio.receiveShadow = true; world.add(patio);

  // Fence
  (function addFence(){
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0xbfa07a });
    const thickness = 0.5, height = 3; const long = 80, short = 60;
    const segs = [ { w: long, x: 0, z: -short/2 }, { w: long, x: 0, z: short/2 }, { w: short, x: -long/2, z: 0, r: Math.PI/2 }, { w: short, x: long/2, z: 0, r: Math.PI/2 } ];
    for (const s of segs) { const g = new THREE.BoxGeometry(s.w, height, thickness); const m = new THREE.Mesh(g, fenceMat); m.position.set(s.x, height/2, s.z); if (s.r) m.rotation.y = s.r; m.castShadow = m.receiveShadow = true; world.add(m);} 
  })();

  // Trees
  function addTree(x: number, z: number) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 5, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a2b })); trunk.position.set(x, 2.5, z); trunk.castShadow = trunk.receiveShadow = true;
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0x2f6f3e })); leaves.position.set(x, 5.5, z); leaves.castShadow = leaves.receiveShadow = true; world.add(trunk, leaves);
  }
  for (let i = 0; i < 15; i++) {
    const x = THREE.MathUtils.randFloatSpread(70); const z = THREE.MathUtils.randFloatSpread(50);
    if (Math.abs(x) < 8 && Math.abs(z) < 8) continue; addTree(x, z);
  }

  // Picnic table
  function addPicnicTable(x: number, z: number) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b6b4a });
    const top = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 2), mat); top.position.set(x, 1.2, z); top.castShadow = top.receiveShadow = true;
    const bench1 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 0.4), mat); bench1.position.set(x, 0.6, z-1.2);
    const bench2 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 0.4), mat); bench2.position.set(x, 0.6, z+1.2);
    bench1.castShadow = bench1.receiveShadow = bench2.castShadow = bench2.receiveShadow = true;
    const group = new THREE.Group(); group.add(top, bench1, bench2); (group as any).userData.type = 'picnic'; world.add(group); return group;
  }
  picnic = addPicnicTable(-16, -12);

  // Bird feeder
  function addBirdFeeder(x: number, z: number) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 8), new THREE.MeshStandardMaterial({ color: 0x777 })); pole.position.set(x, 1.5, z);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1, 10), new THREE.MeshStandardMaterial({ color: 0xccaa44 })); cone.position.set(x, 3.2, z); cone.rotation.x = Math.PI; (cone as any).userData.type = 'feeder'; cone.castShadow = cone.receiveShadow = true; world.add(pole, cone); return cone;
  }
  feeder = addBirdFeeder(14, -6);

  // Trash can
  function addTrashCan(x: number, z: number) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 1.5, 16), new THREE.MeshStandardMaterial({ color: 0x556a77, metalness: 0.4, roughness: 0.5 }));
    body.position.set(x, 0.75, z); body.castShadow = body.receiveShadow = true; (body as any).userData.type = 'trash'; (body as any).userData.tipped = false; world.add(body); return body;
  }
  trash = addTrashCan(10, 10);

  // Food
  function spawnFood() {
    const x = THREE.MathUtils.randFloat(-30, 30); const z = THREE.MathUtils.randFloat(-20, 20);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff8855 }));
    f.position.set(x, 0.35, z); f.castShadow = f.receiveShadow = true; (f as any).userData.type = 'food'; world.add(f); foods.push(f);
    if (foods.length > 12) { const old = foods.shift()!; world.remove(old); }
  }
  for (let i = 0; i < 6; i++) spawnFood();
  const foodTimer = window.setInterval(spawnFood, 6000);

  // Characters
  function makeRaccoon(color = 0x888888) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.2, 8, 16), new THREE.MeshStandardMaterial({ color })); body.castShadow = body.receiveShadow = true; (body.position as any).y = 0.9;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), new THREE.MeshStandardMaterial({ color: 0x777777 })); head.position.set(0, 1.6, 0.45);
    const mask = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.1, 6, 12), new THREE.MeshStandardMaterial({ color: 0x222222 })); mask.rotation.x = Math.PI/2; mask.position.set(0, 1.55, 0.7);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 6, 12), new THREE.MeshStandardMaterial({ color: 0x444444 })); tail.position.set(-0.5, 1.0, -0.3); tail.rotation.z = Math.PI/6;
    const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x555555 })); const ear2 = ear1.clone(); ear1.position.set(-0.2, 1.95, 0.2); ear2.position.set(0.2, 1.95, 0.2);
    [ear1, ear2, head, mask, tail].forEach(m=>{ m.castShadow = (m as any).receiveShadow = true; });
    g.add(body, head, mask, tail, ear1, ear2); (g as any).userData = { type: 'raccoon', onGround: true };
    return g;
  }
  player = makeRaccoon(0x888888); scene.add(player); player.position.set(0, 0, 0);
  mate = makeRaccoon(0x9a9a9a); scene.add(mate); mate.position.set(-10, 0, 8); (mate as any).userData.type = 'mate';

  // Input

  function computeYawFromDir(v: THREE.Vector3): number {
  // Face the direction of motion: +Z forward => yaw 0, +X => +PI/2
  return Math.atan2(v.x, v.z);
}
  function is(anyOf: readonly string[]) { return anyOf.some(k => keys.has(k)); }

  function tryJump() {
    if ((player as any).userData.onGround) {
      velocity.y = 8.5; (player as any).userData.onGround = false; setToast('Hop!');
    }
  }

  function nearby(target: THREE.Object3D, radius = 1.6) {
    return player.position.clone().sub(target.position).length() < radius;
  }

  function tryBite() {
    // eat food
    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      if (nearby(f, 1.4)) {
        world.remove(f); foods.splice(i, 1);
        state.foodScore = Math.min(100, state.foodScore + 8); setToast('Chomp! +food');
        if (nearby(mate, 3.0)) { state.affectionScore = Math.min(100, state.affectionScore + 12); setToast('Shared with mate ❤ +affection'); }
        clampScores();
        return;
      }
    }
    // tip trash
    if (nearby(trash, 2.0) && !trash.userData.tipped) {
      trash.rotation.z = Math.PI/2 * (Math.random() > 0.5 ? 1 : -1);
      trash.userData.tipped = true; state.mischiefScore = Math.min(100, state.mischiefScore + 12); setToast('Trash tipped! +mischief');
      clampScores();
      for (let k = 0; k < 3; k++) {
        const spill = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffa860 }));
        spill.position.copy(trash.position).add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(1.2), 0.3, THREE.MathUtils.randFloatSpread(1.2)));
        (spill as any).userData.type = 'food'; world.add(spill); foods.push(spill);
      }
    }
  }

  function tryTouch() {
    if (nearby(feeder, 2.2)) {
      feeder.rotation.z = (Math.random() - 0.5) * 0.6; state.mischiefScore = Math.min(100, state.mischiefScore + 6); setToast('You shook the feeder! +mischief');
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffd36e }));
      drop.position.copy(feeder.position).add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(0.8), -2.4, THREE.MathUtils.randFloatSpread(0.8))); drop.position.y = 0.28; (drop as any).userData.type = 'food'; world.add(drop); foods.push(drop);
      clampScores();
    }
    if (picnic && player.position.distanceTo((picnic as any).position) < 3.0) {
      state.mischiefScore = Math.min(100, state.mischiefScore + 5); setToast('Swiped from picnic! +mischief');
      const snack = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshStandardMaterial({ color: 0xee6644 }));
      snack.position.copy(player.position).add(new THREE.Vector3(0,0.4,0)); (snack as any).userData.type = 'food'; world.add(snack); foods.push(snack); clampScores();
    }
  }

  function keepInYard(obj: THREE.Object3D) {
    const halfW = 40 - 1.2, halfH = 30 - 1.2;
    obj.position.x = THREE.MathUtils.clamp(obj.position.x, -halfW, halfW);
    obj.position.z = THREE.MathUtils.clamp(obj.position.z, -halfH, halfH);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space') tryJump();
    if (e.code === 'KeyB') tryBite();
    if (e.code === 'KeyT') tryTouch();
    if (e.code === 'KeyP') paused = !paused;
    keys.add(e.code);
  }
  function onKeyUp(e: KeyboardEvent) { keys.delete(e.code); }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function resize() {
    if (!renderer) return;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function animate(now: number) {
    raf = requestAnimationFrame(animate);
    const dt = now - last; last = now;
    if (paused) { renderer!.render(scene, camera); return; }

    // Input
    const forward = +(is(keyMap.up)) - +(is(keyMap.down));
    // Invert sideways to correct left/right direction
    const sideways = +(is(keyMap.left)) - +(is(keyMap.right));
    const dir = new THREE.Vector3(sideways, 0, forward).normalize();

    if (dir.lengthSq() > 0) {
      const camYaw = Math.atan2(camera.position.x - player.position.x, camera.position.z - player.position.z) + Math.PI;
      const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), camYaw);
      dir.applyQuaternion(rot); dir.y = 0; dir.normalize();
      velocity.x += dir.x * 8 * 0.12; velocity.z += dir.z * 8 * 0.12;
      const yaw = computeYawFromDir(dir);
        (player.rotation as any).y = THREE.MathUtils.damp((player.rotation as any).y, yaw, 12, dt/1000);
    }

    // gravity & friction
    velocity.y += (-20) * (dt/1000);
    velocity.x = THREE.MathUtils.damp(velocity.x, 0, FRICTION, dt/1000);
    velocity.z = THREE.MathUtils.damp(velocity.z, 0, FRICTION, dt/1000);

    player.position.addScaledVector(velocity, dt/1000);
    if (player.position.y <= 0) { player.position.y = 0; velocity.y = 0; (player as any).userData.onGround = true; }

    keepInYard(player);

    const camTarget = player.position.clone().add(new THREE.Vector3(0, 3.5, 6.5));
    camera.position.lerp(camTarget, 0.08);
    controls.target.lerp(player.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0.15);
    controls.update();

    // NPC wander
    wander.t -= dt/1000; if (wander.t <= 0) { wander.t = THREE.MathUtils.randFloat(1.2, 2.6); const ang = THREE.MathUtils.randFloat(0, Math.PI*2); wander.dir.set(Math.cos(ang), Math.sin(ang)); }
    const mateSpeed = 2.0; mate.position.x += wander.dir.x * mateSpeed * (dt/1000); mate.position.z += wander.dir.y * mateSpeed * (dt/1000); keepInYard(mate);

    // Win condition
    if (state.affectionScore >= 100 && state.foodScore >= 50 && state.mischiefScore >= 40) setToast('You started a raccoon family! 🎉');

    // clock
    const secs = Math.floor((performance.now() - startTime) / 1000); setClock(secs);

    renderer!.render(scene, camera);
  }

  last = performance.now(); startTime = performance.now(); raf = requestAnimationFrame(animate);

  // expose for tests
  (window as any).__raccoon = { THREE, scene, camera, renderer, player, mate, foods, feeder, picnic, trash, spawnFood, tryTouch, velocity, computeYaw: (x: number, z: number) => computeYawFromDir(new THREE.Vector3(x, 0, z)) };
}

export function stopGame() {
  if (raf) cancelAnimationFrame(raf);
  window.removeEventListener('resize', ()=>{});
}

export function runSelfTests() { return runTestsImpl(); }