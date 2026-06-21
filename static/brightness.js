/**
 * brightness.js — Control de brillo y modo (claro/oscuro)
 * Usa filter:brightness en <html> para afectar TODA la pantalla.
 * Tambien togglea modo claro/oscuro.
 *
 * Migrado del brightness.js de REDTEAM-4V v4.1.
 * STORAGE_KEY corregido: era "api-eye-brightness", ahora "pdb-brightness".
 */
(function() {
  'use strict';

  const STORAGE_BRIGHTNESS = 'pdb-brightness';
  const STORAGE_MODO = 'pdb-modo';

  let currentBrightness = parseInt(localStorage.getItem(STORAGE_BRIGHTNESS) || '100', 10);

  function applyBrightness(v) {
    currentBrightness = v;
    // aplicar al <html> (no body) para que afecte toda la pantalla
    document.documentElement.style.filter = `brightness(${v}%)`;
    localStorage.setItem(STORAGE_BRIGHTNESS, String(v));
  }

  function applyModo(modo) {
    localStorage.setItem(STORAGE_MODO, modo);
    document.documentElement.setAttribute('data-modo', modo);
  }

  function reset() {
    applyBrightness(100);
    applyModo('claro');
  }

  // ==================== INIT BRILLO ====================
  // aplicar brillo guardado
  applyBrightness(currentBrightness);

  // ==================== UI: bar en la nav ====================
  function inyectarUI() {
    const nav = document.querySelector('header nav');
    if (!nav) return;
    if (document.getElementById('brightBtn')) return;

    // Botón "Brillo" en el header
    const btn = document.createElement('button');
    btn.id = 'brightBtn';
    btn.className = 'bright-btn';
    btn.textContent = '🌗 Brillo';
    btn.title = 'Ajustar brillo y modo (claro/oscuro)';
    nav.appendChild(btn);

    // Panel/bar de brillo (esquina superior derecha, oculto por defecto)
    const bar = document.createElement('div');
    bar.className = 'brightness-bar';
    bar.id = 'brightnessBar';
    bar.style.display = 'none';
    bar.innerHTML = `
      <label>Brillo: <input type="range" id="brightnessSlider" min="30" max="100" value="${currentBrightness}"></label>
      <button class="close-bright" id="closeBright">×</button>
      <button class="bright-btn" id="toggleModo" style="margin-left:0.5em;" title="Cambiar modo claro/oscuro">🌓 Modo</button>
    `;
    document.body.appendChild(bar);

    const slider = document.getElementById('brightnessSlider');
    const closeBtn = document.getElementById('closeBright');
    const modoBtn = document.getElementById('toggleModo');

    btn.onclick = () => { bar.style.display = 'flex'; };
    closeBtn.onclick = () => { bar.style.display = 'none'; };
    slider.addEventListener('input', e => applyBrightness(parseInt(e.target.value, 10)));
    modoBtn.onclick = () => {
      const actual = localStorage.getItem(STORAGE_MODO) || 'claro';
      applyModo(actual === 'claro' ? 'oscuro' : 'claro');
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inyectarUI);
  } else {
    inyectarUI();
  }

  window.PdbBrightness = { applyBrightness, applyModo, reset, getBrightness: () => currentBrightness };
})();
