/**
 * theme.js — Panel de temas (color, fuente, tamaño)
 * Port del theme.js de REDTEAM-4V v4.
 *
 * Persiste en localStorage. Se aplica a TODO el sitio via atributos data-* en <html>.
 * 5 colores × 4 fuentes × 4 tamaños = 80 combinaciones
 * (el modo se cambia con el boton de brillo, no acá).
 */
(function () {
  'use strict';

  const KEY_TEMA = 'pdb-tema';
  const KEY_FONTSIZE = 'pdb-fontsize';
  const KEY_FONT = 'pdb-font';
  const KEY_MODO = 'pdb-modo';

  const TEMAS = [
    { id: 'azul',    label: 'Azul',    color: '#1877f2' },
    { id: 'verde',   label: 'Verde',   color: '#16a34a' },
    { id: 'rojo',    label: 'Rojo',    color: '#dc2626' },
    { id: 'violeta', label: 'Violeta', color: '#9333ea' },
    { id: 'naranja', label: 'Naranja', color: '#ea580c' },
  ];

  const FONT_SIZES = [
    { id: 'chico',  label: 'Chico',  px: 14 },
    { id: 'normal', label: 'Normal', px: 16 },
    { id: 'grande', label: 'Grande', px: 18 },
    { id: 'xl',     label: 'XL',     px: 21 },
  ];

  const FONT_FAMILIES = [
    { id: 'system',   label: 'System',     family: "'Segoe UI', system-ui, -apple-system, sans-serif" },
    { id: 'mono',     label: 'Mono',       family: "'JetBrains Mono', 'Fira Code', Consolas, monospace" },
    { id: 'serif',    label: 'Serif',      family: "Georgia, 'Times New Roman', serif" },
    { id: 'rounded',  label: 'Redondeada', family: "'Nunito', 'Comfortaa', 'Segoe UI', sans-serif" },
  ];

  // ==================== APLICAR AL CARGAR ====================
  function aplicarGuardados() {
    const tema = localStorage.getItem(KEY_TEMA) || 'azul';
    const fontsize = localStorage.getItem(KEY_FONTSIZE) || 'normal';
    const font = localStorage.getItem(KEY_FONT) || 'system';
    const modo = localStorage.getItem(KEY_MODO) || 'claro';
    document.documentElement.setAttribute('data-tema', tema);
    document.documentElement.setAttribute('data-fontsize', fontsize);
    document.documentElement.setAttribute('data-font', font);
    document.documentElement.setAttribute('data-modo', modo);
  }

  function guardar(key, value) {
    localStorage.setItem(key, value);
  }

  // ==================== CREAR PANEL ====================
  function crearPanel() {
    const css = `
      .theme-panel {
        position: fixed;
        top: 70px;
        right: 20px;
        background: var(--bg-card);
        border: 1px solid var(--border-soft);
        border-radius: 10px;
        padding: 1rem 1.1rem;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        z-index: 9999;
        min-width: 260px;
        max-width: 320px;
        display: none;
        font-family: var(--font-family-base);
        color: var(--text-main);
      }
      .theme-panel.open { display: block; }
      .theme-panel h3 {
        margin: 0 0 0.6rem 0;
        color: var(--text-main);
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .theme-panel h3 .cerrar {
        margin-left: auto;
        background: transparent;
        border: none;
        font-size: 1.2rem;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0 0.3rem;
      }
      .theme-panel h3 .cerrar:hover { color: var(--color-fallo); }
      .theme-panel .seccion {
        margin: 0.6rem 0;
        padding: 0.5rem 0;
        border-top: 1px solid var(--border-soft);
      }
      .theme-panel .seccion:first-of-type { border-top: none; padding-top: 0; }
      .theme-panel label {
        display: block;
        font-size: 0.78rem;
        color: var(--text-muted);
        font-weight: 600;
        text-transform: uppercase;
        margin-bottom: 0.3rem;
      }
      .theme-panel .opciones { display: flex; flex-wrap: wrap; gap: 0.3rem; }
      .theme-panel .opcion {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.35rem 0.6rem;
        border: 1px solid var(--border-soft);
        border-radius: 6px;
        background: var(--bg-soft);
        color: var(--text-main);
        font-size: 0.82rem;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
      }
      .theme-panel .opcion:hover {
        border-color: var(--accent);
        background: var(--accent-soft);
      }
      .theme-panel .opcion.activo {
        background: var(--accent);
        color: var(--text-on-accent);
        border-color: var(--accent);
      }
      .theme-panel .opcion-color {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        padding: 0;
        border: 2px solid var(--border-soft);
      }
      .theme-panel .opcion-color.activo {
        border-color: var(--text-main);
        box-shadow: 0 0 0 2px var(--accent);
      }
      .theme-panel .reset {
        margin-top: 0.5rem;
        width: 100%;
        padding: 0.4rem;
        background: transparent;
        border: 1px solid var(--border-soft);
        color: var(--text-muted);
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.82rem;
        font-family: inherit;
      }
      .theme-panel .reset:hover {
        border-color: var(--color-fallo);
        color: var(--color-fallo);
      }
    `;

    if (!document.getElementById('theme-panel-css')) {
      const style = document.createElement('style');
      style.id = 'theme-panel-css';
      style.textContent = css;
      document.head.appendChild(style);
    }

    const temaActual = localStorage.getItem(KEY_TEMA) || 'azul';
    const fontsizeActual = localStorage.getItem(KEY_FONTSIZE) || 'normal';
    const fontActual = localStorage.getItem(KEY_FONT) || 'system';

    const panel = document.createElement('div');
    panel.className = 'theme-panel';
    panel.id = 'theme-panel';
    panel.innerHTML = `
      <h3>
        <span aria-hidden="true">🎨</span> Tema
        <button class="cerrar" id="themePanelClose" aria-label="cerrar">×</button>
      </h3>

      <div class="seccion">
        <label>Color</label>
        <div class="opciones" id="themeOpciones">
          ${TEMAS.map(t => `
            <button class="opcion opcion-color ${t.id === temaActual ? 'activo' : ''}"
                    data-tema="${t.id}" title="${t.label}"
                    style="background:${t.color}">
            </button>
          `).join('')}
        </div>
      </div>

      <div class="seccion">
        <label>Tamaño de fuente</label>
        <div class="opciones" id="fontsizeOpciones">
          ${FONT_SIZES.map(f => `
            <button class="opcion ${f.id === fontsizeActual ? 'activo' : ''}"
                    data-fontsize="${f.id}">${f.label}</button>
          `).join('')}
        </div>
      </div>

      <div class="seccion">
        <label>Tipografía</label>
        <div class="opciones" id="fontOpciones">
          ${FONT_FAMILIES.map(f => `
            <button class="opcion ${f.id === fontActual ? 'activo' : ''}"
                    data-font="${f.id}" style="font-family:${f.family}">${f.label}</button>
          `).join('')}
        </div>
      </div>

      <div style="display: flex; gap: 0.4rem; align-items: center;">
        <span id="themeAplicado" style="color: var(--color-exito); font-size: 0.78rem; font-weight: 600; flex: 1;">✓ Aplicado</span>
        <button class="reset" id="themeReset" style="flex: 1; margin: 0;">↺ Volver al original</button>
      </div>
    `;

    const viejo = document.getElementById('theme-panel');
    if (viejo) viejo.remove();
    document.body.appendChild(panel);

    document.getElementById('themePanelClose').onclick = cerrarPanel;

    function marcarAplicado() {
      // FIX #15: el span debe mostrar qué tema se aplicó realmente,
      // no el mismo texto genérico antes y después del click.
      const span = document.getElementById('themeAplicado');
      if (span) {
        const nombre = (temaActual || 'tema') + ' aplicado ✓';
        span.textContent = nombre;
        span.style.color = 'var(--color-exito)';
        // Restaurar al texto neutro a los 1.2s para que el panel siga limpio
        setTimeout(() => { span.textContent = ''; }, 1200);
      }
    }

    document.getElementById('themeOpciones').onclick = (e) => {
      const btn = e.target.closest('button[data-tema]');
      if (!btn) return;
      const tema = btn.dataset.tema;
      document.documentElement.setAttribute('data-tema', tema);
      guardar(KEY_TEMA, tema);
      document.querySelectorAll('#themeOpciones button').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      marcarAplicado();
    };

    document.getElementById('fontsizeOpciones').onclick = (e) => {
      const btn = e.target.closest('button[data-fontsize]');
      if (!btn) return;
      const fs = btn.dataset.fontsize;
      document.documentElement.setAttribute('data-fontsize', fs);
      guardar(KEY_FONTSIZE, fs);
      document.querySelectorAll('#fontsizeOpciones button').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      marcarAplicado();
    };

    document.getElementById('fontOpciones').onclick = (e) => {
      const btn = e.target.closest('button[data-font]');
      if (!btn) return;
      const f = btn.dataset.font;
      document.documentElement.setAttribute('data-font', f);
      guardar(KEY_FONT, f);
      document.querySelectorAll('#fontOpciones button').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      marcarAplicado();
    };

    document.getElementById('themeReset').onclick = () => {
      localStorage.removeItem(KEY_TEMA);
      localStorage.removeItem(KEY_FONTSIZE);
      localStorage.removeItem(KEY_FONT);
      localStorage.removeItem(KEY_MODO);
      document.documentElement.setAttribute('data-tema', 'azul');
      document.documentElement.setAttribute('data-fontsize', 'normal');
      document.documentElement.setAttribute('data-font', 'system');
      document.documentElement.setAttribute('data-modo', 'claro');
      crearPanel();
      // también avisar al brightness.js
      if (window.PdbBrightness && window.PdbBrightness.reset) window.PdbBrightness.reset();
    };
  }

  function abrirPanel() {
    const panel = document.getElementById('theme-panel');
    if (panel) panel.classList.add('open');
  }

  function cerrarPanel() {
    const panel = document.getElementById('theme-panel');
    if (panel) panel.classList.remove('open');
  }

  // ==================== INYECTAR BOTÓN EN LA NAV ====================
  function inyectarBoton() {
    const nav = document.querySelector('header nav');
    if (!nav) return;
    if (document.getElementById('themeBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'themeBtn';
    btn.className = 'bright-btn';
    btn.textContent = '🎨 Tema';
    btn.title = 'Cambiar color, fuente y tamaño de letra';
    btn.onclick = () => {
      const panel = document.getElementById('theme-panel');
      if (panel) panel.classList.toggle('open');
    };
    nav.appendChild(btn);
  }

  // ==================== INIT ====================
  aplicarGuardados();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      inyectarBoton();
      crearPanel();
    });
  } else {
    inyectarBoton();
    crearPanel();
  }

  window.PdbTheme = { aplicarGuardados, abrirPanel, cerrarPanel, setModo };

  function setModo(modo) {
    if (modo !== 'claro' && modo !== 'oscuro') return;
    localStorage.setItem(KEY_MODO, modo);
    document.documentElement.setAttribute('data-modo', modo);
  }
})();
