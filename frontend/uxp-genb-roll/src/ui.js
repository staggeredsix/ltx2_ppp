import { PRESETS } from './presets.js';

export function setupPresetButtons(container, promptEl) {
  PRESETS.forEach((text) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.addEventListener('click', () => {
      promptEl.value = promptEl.value ? `${promptEl.value}\n${text}` : text;
    });
    container.appendChild(btn);
  });
}

export function renderJobs(listEl, jobs) {
  listEl.innerHTML = '';
  for (const job of jobs) {
    const li = document.createElement('li');
    li.textContent = `${job.id.slice(0, 8)} • ${job.status}${job.progress ? ` • ${job.progress}%` : ''}`;
    listEl.appendChild(li);
  }
}

export function setError(el, err) {
  el.textContent = err ? String(err) : '';
}
