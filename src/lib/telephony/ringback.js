let context, timer, voices = [];
export function prepareRingback() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  context ||= new Audio();
  context.resume().catch(() => {});
}
export function setRingback(enabled) {
  clearInterval(timer); voices.forEach(v => {try {v.stop();} catch { /* Already stopped. */ }}); voices=[];
  if (!enabled || !context) return;
  const pulse=()=>{const gain=context.createGain();gain.gain.value=0.035;gain.connect(context.destination);for(const frequency of [440,480]) {const oscillator=context.createOscillator();oscillator.frequency.value=frequency;oscillator.connect(gain);oscillator.start();oscillator.stop(context.currentTime+2);voices.push(oscillator);}};
  pulse();timer=setInterval(pulse,6000);
}
