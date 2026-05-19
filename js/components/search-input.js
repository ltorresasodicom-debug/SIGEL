// =============================================================================
// SIGEL — Componente reutilizable de input de búsqueda
//
// Renderiza un input con ícono de lupa, placeholder configurable, botón
// "limpiar" cuando hay texto, y dispara un callback debounceado.
//
// Uso (template literal):
//   ${searchInput({ value: state.q, placeholder: 'Buscar…', onInput: 'window.SIGEL.setSearch' })}
//
// El callback debe estar registrado en window.SIGEL (handlers globales),
// igual que el resto de los handlers del SPA.
// =============================================================================

/**
 * @param {object} opts
 * @param {string}  opts.value         valor actual del input
 * @param {string}  opts.placeholder   texto placeholder
 * @param {string}  opts.onInput       nombre del handler global (`window.SIGEL.<fn>`)
 * @param {string}  [opts.onClear]     handler para botón limpiar (opcional)
 * @param {string}  [opts.id]          id HTML opcional
 * @param {string}  [opts.ariaLabel]   etiqueta ARIA accesible
 * @returns {string} HTML del componente
 */
export function searchInput({
  value = '',
  placeholder = 'Buscar…',
  onInput,
  onClear,
  id = 'sigel-search',
  ariaLabel,
}) {
  const safeValue = escapeAttr(value);
  const clear = onClear || onInput;
  return /*html*/`
    <div class="relative" role="search">
      <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none" aria-hidden="true">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"/>
        </svg>
      </span>
      <input
        id="${id}"
        type="search"
        autocomplete="off"
        spellcheck="false"
        value="${safeValue}"
        placeholder="${escapeAttr(placeholder)}"
        aria-label="${escapeAttr(ariaLabel || placeholder)}"
        oninput="${onInput}(this.value)"
        class="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sigel-primary/40 focus:outline-none focus:border-sigel-primary hover:border-slate-400 transition shadow-sm"
      />
      ${value ? /*html*/`
        <button
          type="button"
          onclick="document.getElementById('${id}').value=''; ${clear}('')"
          aria-label="Limpiar búsqueda"
          class="absolute inset-y-0 right-0 flex items-center pr-3 pl-2 text-slate-400 hover:text-sigel-primary transition rounded-r-lg">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12"/>
          </svg>
        </button>
      ` : ''}
    </div>
  `;
}

function escapeAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
