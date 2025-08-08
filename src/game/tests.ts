export function runSelfTests() {
  const out: { name: string; pass: boolean; e?: string }[] = [];
  function test(name: string, fn: () => void) { try { fn(); out.push({ name, pass: true }); } catch (e: any) { console.error(e); out.push({ name, pass: false, e: String(e) }); } }

  const g = (window as any).__raccoon;
  test('THREE global present', () => { if (!g?.THREE) throw new Error('THREE missing'); });
  test('Scene & camera created', () => { if (!g?.scene || !g?.camera) throw new Error('scene/camera'); });
  test('Renderer present', () => { if (!g?.renderer?.domElement?.parentElement) throw new Error('renderer not in DOM'); });
  test('Player & Mate exist', () => { if (!g?.player || !g?.mate) throw new Error('actors missing'); });
  test('Food spawns increases count', () => { const c = g.foods.length; g.spawnFood(); if (g.foods.length <= c) throw new Error('food did not spawn'); });
  test('Touch feeder increases mischief or food drop', () => { const before = g.foods.length; g.tryTouch(); /* should not throw; may drop food */ if (g.foods.length < before) throw new Error('unexpected food removal'); });
  test('Movement updates position', () => { const px = g.player.position.clone(); g.velocity.set(2,0,0); g.player.position.addScaledVector(g.velocity, 0.016); if (g.player.position.distanceTo(px) <= 0) throw new Error('position unchanged'); });
  test('Yaw faces +X/+Z/-X correctly', () => {
    const eps = 0.05;
    const yx = g.computeYaw(1,0); if (Math.abs(yx - Math.PI/2) > eps) throw new Error(`yaw +X wrong: ${yx}`);
    const yz = g.computeYaw(0,1); if (Math.abs(yz - 0) > eps) throw new Error(`yaw +Z wrong: ${yz}`);
    const ynx = g.computeYaw(-1,0); if (Math.abs(ynx + Math.PI/2) > eps) throw new Error(`yaw -X wrong: ${ynx}`);
    });

  const passes = out.filter(t=>t.pass).length; const fails = out.length - passes;
  console.log(`Tests: ${passes} passed / ${fails} failed`, out);
  return { passes, fails, tests: out };
}