<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import Hud from './components/Hud.vue';
import { startGame, stopGame, runSelfTests, setActionKeys } from './game/world';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const paused = ref(false);

function togglePause() {
  paused.value = !paused.value;
  setActionKeys({ pause: paused.value });
}

onMounted(() => {
  if (canvasRef.value) startGame(canvasRef.value);
  const onKey = (e: KeyboardEvent) => { if (e.code === 'F9') runSelfTests(); };
  window.addEventListener('keydown', onKey);
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
});

onBeforeUnmount(() => stopGame());
</script>

<template>
  <div style="position:relative; height:100%">
    <canvas ref="canvasRef" style="display:block; width:100%; height:100%"></canvas>
    <Hud :paused="paused" @pause="togglePause" @tests="runSelfTests" />
  </div>
</template>

<style scoped>
</style>