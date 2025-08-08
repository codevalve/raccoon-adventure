<script setup lang="ts">
import { computed } from 'vue';
import { state } from '../game/state';

const props = defineProps<{ paused: boolean }>();
const emit = defineEmits<{ (e:'pause'): void; (e:'tests'): void }>();

const foodPct = computed(()=> `${Math.min(100, state.foodScore)}%`);
const mischiefPct = computed(()=> `${Math.min(100, state.mischiefScore)}%`);
const affectionPct = computed(()=> `${Math.min(100, state.affectionScore)}%`);
</script>

<template>
  <div style="position:fixed;left:12px;top:12px;background:rgba(6,10,20,.6);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:10px 12px;backdrop-filter:blur(6px);">
    <div style="display:flex;gap:8px;align-items:center;"><strong>Raccoon Adventure</strong><span style="opacity:.8">{{ state.clock }}</span></div>
    <div style="display:flex;gap:8px;align-items:center;">Food
      <div style="width:160px;height:10px;background:#22293f;border-radius:6px;overflow:hidden;">
        <div :style="{width: foodPct, height: '100%', background: 'linear-gradient(90deg,#6cf,#7fdd7f)'}"></div>
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">Mischief
      <div style="width:160px;height:10px;background:#22293f;border-radius:6px;overflow:hidden;">
        <div :style="{width: mischiefPct, height: '100%', background: 'linear-gradient(90deg,#6cf,#7fdd7f)'}"></div>
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">Mate Affection
      <div style="width:160px;height:10px;background:#22293f;border-radius:6px;overflow:hidden;">
        <div :style="{width: affectionPct, height: '100%', background: 'linear-gradient(90deg,#6cf,#7fdd7f)'}"></div>
      </div>
    </div>
    <div style="margin-top:6px;font-size:12px;opacity:.9;max-width:320px">
      ← → ↑ ↓ move · Space = jump · B = bite · T = touch · P = pause · F9 = tests
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button @click="emit('pause')">{{ props.paused ? 'Resume' : 'Pause' }}</button>
      <button @click="emit('tests')">Run Tests</button>
    </div>
  </div>
  <div v-if="state.toast" style="position:fixed;left:50%;transform:translateX(-50%);bottom:24px;color:#fff;background:rgba(0,0,0,.7);padding:12px 16px;border-radius:10px;">{{ state.toast }}</div>
</template>