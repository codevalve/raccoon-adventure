export const state = {
  clock: '00:00',
  toast: '',
  foodScore: 0,
  mischiefScore: 0,
  affectionScore: 0,
};

let toastTimer: number | null = null;
export function setToast(msg: string, ms = 1200) {
  state.toast = msg;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (state.toast = ''), ms);
}

export function setClock(sec: number) {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  state.clock = `${mm}:${ss}`;
}

export function clampScores() {
  state.foodScore = Math.min(100, state.foodScore);
  state.mischiefScore = Math.min(100, state.mischiefScore);
  state.affectionScore = Math.min(100, state.affectionScore);
}