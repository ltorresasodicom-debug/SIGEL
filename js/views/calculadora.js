// =============================================================================
// SIGEL — Calculadora de Intención de Voto (módulo desacoplado)
//
// Asistente ciudadano de 5 pasos que estima un índice de intención de voto a
// partir de 13 ítems en escala 1–5, con modelo de suma ponderada (Teoría del
// Comportamiento Planificado + Inteligencia Afectiva + Marketing Político).
//
// Desacoplado: estado propio del módulo, sin tocar data.js / ingel.js / el
// sistema de evaluaciones. Sin red ni terceros — los datos NO salen del
// navegador (coherente con la política de privacidad de SIGEL). Reutiliza el
// sistema de diseño (.card .btn-* .badge .chip .likert) y patrón accesible
// (role=radiogroup / radio, progressbar, alert) igual que la vista /evaluar.
// =============================================================================

const V = {
  CCP:  { n: 'Calidad del contenido',  w: .22, neg: false, qs: [0, 1] },
  CP:   { n: 'Confianza política',     w: .18, neg: false, qs: [2, 3] },
  PCE:  { n: 'Conexión emocional',     w: .13, neg: false, qs: [4, 5] },
  PACP: { n: 'Autenticidad percibida', w: .13, neg: false, qs: [6, 7] },
  MC:   { n: 'Manipulación percibida', w: .09, neg: true,  qs: [8] },
  EPI:  { n: 'Eficacia política',      w: .05, neg: false, qs: [9] },
  EXPOS:{ n: 'Exposición digital',     w: .08, neg: false, qs: [10] },
  NS:   { n: 'Normas subjetivas',      w: .07, neg: false, qs: [11] },
  PP:   { n: 'Problemas percibidos',   w: .05, neg: false, qs: [12] },
};

const SEGS = {
  convencido:   { l: 'Votante convencido',   tone: 'VERDE',    d: 'Disposición muy favorable: confías en sus propuestas, te conectas emocionalmente y no percibes manipulación. Es probable que votes por el/ella e influyas en tu entorno.' },
  racional:     { l: 'Votante racional',     tone: 'INFO',     d: 'Tu apoyo se basa en propuestas y confianza más que en emoción. Decisión cognitiva, sólida y difícil de cambiar con estrategias superficiales de imagen.' },
  emocional:    { l: 'Votante emocional',    tone: 'ACCENT',   d: 'Te identificas emocionalmente, pero quizás no conoces bien sus propuestas. Vale la pena revisar su plan de gobierno antes de decidir.' },
  indeciso:     { l: 'Votante indeciso',     tone: 'AMARILLO', d: 'Relación moderada: ni te convence del todo ni lo rechazas. Hay aspectos que podrían inclinar tu decisión. Busca más información antes de decidir.' },
  critico:      { l: 'Votante crítico',      tone: 'ROJO',     d: 'Percibes manipulación o falta de autenticidad. Aunque haya aspectos positivos, tu desconfianza es alta; tu voto es poco probable sin cambios importantes.' },
  desconectado: { l: 'Votante desconectado', tone: 'SLATE',    d: 'No sientes conexión real ni racional ni emocional. Puede que no lo conozcas bien o simplemente no te representa. Quizás valga explorar otras opciones.' },
};

const TONE = {
  VERDE:    { bg: '#DCFCE7', br: '#B8E6C8', fg: '#14532D' },
  INFO:     { bg: '#DBEAFE', br: '#B8D4F5', fg: '#0C447C' },
  ACCENT:   { bg: '#FFEDD5', br: '#FCD9B0', fg: '#9A3412' },
  AMARILLO: { bg: '#FEF3C7', br: '#FCD34D', fg: '#854D0E' },
  ROJO:     { bg: '#FEE2E2', br: '#FCA5A5', fg: '#991B1B' },
  SLATE:    { bg: '#F1F5F9', br: '#CBD5E1', fg: '#334155' },
};

const QS = [
  ['Propuestas y confianza', 'racional', [
    ['Las propuestas del candidato/a son fáciles de entender', 'Sabes exactamente qué quiere hacer; no habla de forma vaga ni complicada.'],
    ['Sus propuestas abordan los temas que de verdad importan en tu comunidad', 'Habla de vialidad, agua potable, empleo o seguridad específicos de tu cantón.'],
    ['Crees que va a cumplir lo que promete si gana', 'No son solo palabras de campaña: hay propuestas concretas y realizables detrás.'],
    ['Le tienes confianza como líder político', 'Te parece una persona seria, capaz y comprometida con su comunidad.'],
  ]],
  ['Vínculo emocional y credibilidad', 'emocional', [
    ['Sientes que te representa y entiende lo que vives día a día', 'Cuando habla, sientes que conoce los problemas reales de personas como tú.'],
    ['Te genera entusiasmo pensar en que gane las elecciones', 'Sientes esperanza, alegría o motivación al imaginar su victoria.'],
    ['Se muestra como una persona honesta y transparente', 'No oculta información, reconoce errores y no cambia su discurso según quién lo escuche.'],
    ['Lo que dice y lo que hace van de la mano', 'No dice una cosa y hace otra; su mensaje es coherente.'],
    ['Sientes que usa el miedo, el odio o exageraciones para convencer', 'Asusta con el caos si no gana, ataca con mentiras o exagera los problemas.'],
  ]],
  ['Tu contexto personal', 'contextual', [
    ['Te sientes capaz de entender la política local y decidir con información', 'Puedes comparar candidatos, entender propuestas y saber qué te conviene votar.'],
    ['Has visto o escuchado sobre este candidato/a recientemente', 'En las últimas semanas te ha llegado información suya de alguna forma.'],
    ['Las personas que más te importan apoyarían a este candidato/a', 'Tu familia, amigos o vecinos cercanos lo/la ven bien.'],
    ['Habla de los problemas que más te preocupan en este momento', 'Menciona seguridad, empleo, economía u otros temas urgentes para ti.'],
  ]],
];
// Mapa global de índice de pregunta → bloque (para estilos/colores)
const Q_TONE = ['racional','racional','racional','racional','emocional','emocional','emocional','emocional','emocional','contextual','contextual','contextual','contextual'];
const BLOCK = {
  racional:   { dot: 'var(--sigel-primary)',  badge: 'INFO',   step: 3 },
  emocional:  { dot: 'var(--sigel-accent)',   badge: 'ACCENT', step: 4 },
  contextual: { dot: 'var(--sigel-secondary)',badge: 'VERDE',  step: 5 },
};

let st = newState();
function newState() {
  return { step: 0, cname: '', cargo: '', edad: '', educ: '', genero: '',
           ingreso: '', ans: new Array(13).fill(null) };
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const SEL = [
  ['edad', 'Rango de edad', ['18 a 25','26 a 35','36 a 45','46 a 60','Más de 60']],
  ['educ', 'Nivel de educación', ['Primaria','Secundaria','Técnica o tecnológica','Universitaria','Posgrado']],
  ['genero', 'Género', ['Masculino','Femenino','Otro / Prefiero no decir']],
  ['ingreso', 'Ingreso mensual del hogar', ['Menos de $450','$450 a $800','$800 a $1.500','$1.500 a $3.000','Más de $3.000']],
];

function likertGroup(qIdx, tone) {
  return `<div class="likert" role="radiogroup" aria-label="Pregunta ${qIdx + 1}" data-lk="${qIdx}">
    ${[1,2,3,4,5].map(v => `
      <button type="button" role="radio" aria-checked="false"
        class="likert-btn" data-q="${qIdx}" data-v="${v}"
        aria-label="${v} de 5">${v}</button>`).join('')}
  </div>
  <div class="flex justify-between text-xs text-slate-500 mt-1.5 px-1">
    <span>En desacuerdo</span><span>De acuerdo</span>
  </div>`;
}

function stepQuestions(blockIdx) {
  const [titulo, key, items] = QS[blockIdx];
  const b = BLOCK[key];
  const offset = blockIdx === 0 ? 0 : blockIdx === 1 ? 4 : 9;
  const stepNo = b.step;
  const pct = stepNo * 20;
  return `
  <div class="step" data-step="${stepNo}">
    <div class="mb-5" aria-hidden="true">
      <div class="flex justify-between text-xs text-slate-500 mb-1">
        <span>Paso ${stepNo} de 5</span><span>${pct}%</span>
      </div>
      <div class="bg-slate-100 rounded-full h-2 overflow-hidden">
        <div class="h-full rounded-full transition-all" style="width:${pct}%;background:var(--sigel-primary)"></div>
      </div>
    </div>
    <div class="card">
      <div class="flex items-center gap-2 mb-1">
        <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${b.dot}"></span>
        <h2 class="font-display font-bold text-xl">${titulo}</h2>
      </div>
      <p class="text-sm text-slate-500" data-sub>Responde pensando en el/la candidato/a.</p>
      <div class="chip text-xs mt-3"><span class="dot" style="background:${b.dot}"></span>Califica del 1 (en desacuerdo) al 5 (de acuerdo)</div>
      <div class="mt-2 divide-y divide-slate-100">
        ${items.map((it, i) => `
          <div class="py-4">
            <div class="text-sm font-medium flex gap-2">
              <span class="badge badge-${b.badge === 'INFO' ? 'ALTO' : b.badge === 'ACCENT' ? 'BAJO' : 'EXCELENTE'}" style="min-width:1.6rem;text-align:center">${offset + i + 1}</span>
              <span>${it[0]}</span>
            </div>
            <p class="text-xs text-slate-500 bg-slate-50 border-l-2 border-slate-200 rounded px-2 py-1 my-2">Ejemplo: ${it[1]}</p>
            ${likertGroup(offset + i, key)}
          </div>`).join('')}
      </div>
      <div class="err hidden mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
        Responde todas las preguntas antes de continuar.
      </div>
    </div>
    <div class="flex gap-2 mt-4">
      <button type="button" class="btn-primary !bg-white !text-slate-600 border border-slate-300" data-act="back" data-to="${stepNo - 1}">← Atrás</button>
      <button type="button" class="btn-primary flex-1" data-act="validate-block" data-step="${stepNo}">${stepNo === 5 ? 'Ver resultados →' : 'Siguiente →'}</button>
    </div>
  </div>`;
}

export function viewCalculadora() {
  return /*html*/`
  <div class="max-w-3xl mx-auto px-4 py-10 fade-in" id="calc-root">

    <header class="mb-6">
      <span class="chip text-xs"><span class="dot" style="background:var(--sigel-primary)"></span>Herramienta analítica electoral · Ecuador</span>
      <h1 class="font-display font-extrabold text-3xl md:text-4xl tracking-tight mt-3">Calculadora de intención de voto</h1>
      <p class="text-slate-600 mt-2 text-lg leading-relaxed max-w-2xl">
        Responde 13 preguntas cortas sobre un candidato/a. Sin respuestas
        correctas: solo cuenta lo que piensas y sientes. <strong>Tus respuestas
        no salen de tu navegador.</strong>
      </p>
    </header>

    <!-- Paso 0 -->
    <div class="step" data-step="0">
      <div class="card">
        <h2 class="font-display font-bold text-xl mb-3">Cómo usar esta herramienta</h2>
        <ol class="space-y-2.5">
          ${['Escribe el nombre del candidato/a y el cargo al que aspira.',
             'Ingresa algunos datos para contextualizar el análisis.',
             'Responde 13 preguntas en escala 1–5, en tres bloques.',
             'Obtén tus resultados al instante, sin registrarte.']
            .map((t, i) => `<li class="flex items-start gap-3 text-sm text-slate-700">
              <span class="grid place-items-center w-6 h-6 rounded-full bg-slate-100 text-sigel-primary font-bold text-xs flex-none">${i + 1}</span>
              <span>${t}</span></li>`).join('')}
        </ol>
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-5">
          <p class="text-xs font-semibold text-slate-500 mb-2">Qué obtendrás:</p>
          <div class="flex flex-wrap gap-2">
            ${['Índice de intención de voto','Nivel: Baja / Media / Alta','Tu perfil como votante','Factores que suben o bajan el apoyo','Recomendación estratégica']
              .map(t => `<span class="chip text-xs">${t}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="mt-4">
        <button type="button" class="btn-accent w-full" data-act="goto" data-to="1">Iniciar evaluación →</button>
      </div>
    </div>

    <!-- Paso 1: candidato -->
    <div class="step" data-step="1">
      ${progress(1)}
      <div class="card">
        <h2 class="font-display font-bold text-xl mb-1">¿A quién vas a evaluar?</h2>
        <p class="text-sm text-slate-500 mb-4">Datos del candidato/a a analizar en esta sesión.</p>
        <div class="mb-3">
          <label for="calc-cname" class="block text-sm font-medium text-slate-600 mb-1">Nombre del candidato/a</label>
          <input id="calc-cname" type="text" maxlength="60" autocomplete="off" spellcheck="false"
            placeholder="Ej: María García"
            class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sigel-primary/40 focus:border-sigel-primary outline-none transition">
        </div>
        <div>
          <label for="calc-cargo" class="block text-sm font-medium text-slate-600 mb-1">Cargo al que aspira</label>
          <select id="calc-cargo" class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sigel-primary/40 focus:border-sigel-primary outline-none transition">
            <option value="">Selecciona…</option>
            ${['Alcalde/sa','Prefecto/a','Concejal/a','Consejero/a provincial','Otro'].map(o => `<option>${o}</option>`).join('')}
          </select>
        </div>
        <div class="err hidden mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          Por favor ingresa el nombre del candidato/a.
        </div>
      </div>
      <div class="flex gap-2 mt-4">
        <button type="button" class="btn-primary !bg-white !text-slate-600 border border-slate-300" data-act="goto" data-to="0">← Atrás</button>
        <button type="button" class="btn-primary flex-1" data-act="validate-1">Siguiente →</button>
      </div>
    </div>

    <!-- Paso 2: contexto -->
    <div class="step" data-step="2">
      ${progress(2)}
      <div class="card">
        <h2 class="font-display font-bold text-xl mb-1">Cuéntanos sobre ti</h2>
        <p class="text-sm text-slate-500 mb-4">Confidencial: solo se usa para contextualizar el análisis (no sale de tu navegador).</p>
        ${SEL.map(([id, label, opts]) => `
          <div class="mb-3">
            <label for="calc-${id}" class="block text-sm font-medium text-slate-600 mb-1">${label}</label>
            <select id="calc-${id}" class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sigel-primary/40 focus:border-sigel-primary outline-none transition">
              <option value="">Selecciona…</option>
              ${opts.map(o => `<option>${o}</option>`).join('')}
            </select>
          </div>`).join('')}
        <div class="err hidden mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          Por favor completa todos los campos para continuar.
        </div>
      </div>
      <div class="flex gap-2 mt-4">
        <button type="button" class="btn-primary !bg-white !text-slate-600 border border-slate-300" data-act="goto" data-to="1">← Atrás</button>
        <button type="button" class="btn-primary flex-1" data-act="validate-2">Siguiente →</button>
      </div>
    </div>

    ${stepQuestions(0)}
    ${stepQuestions(1)}
    ${stepQuestions(2)}

    <!-- Paso 6: resultados -->
    <div class="step" data-step="6">
      <div class="card text-center">
        <div class="text-xs text-slate-500">Resultado para</div>
        <div class="font-display font-bold text-xl" data-r="cn"></div>
        <div class="text-xs text-slate-500 mb-2" data-r="cc"></div>
        <svg viewBox="0 0 180 100" style="width:180px;height:100px;margin:.25rem auto 0;" aria-hidden="true">
          <path d="M16,90 A74,74 0 0,1 164,90" fill="none" stroke="#E2E8F0" stroke-width="14" stroke-linecap="round"/>
          <path data-r="arc" d="M16,90 A74,74 0 0,1 164,90" fill="none" stroke="var(--sigel-primary)" stroke-width="14" stroke-linecap="round" stroke-dasharray="232.5" stroke-dashoffset="232.5" style="transition:stroke-dashoffset 1.1s ease;"/>
        </svg>
        <div class="font-display font-extrabold text-4xl tabular-nums" data-r="pct">—</div>
        <div class="text-xs text-slate-500">Índice de intención de voto</div>
        <div class="mt-2"><span class="badge" data-r="lv"></span></div>
      </div>
      <div class="segc card mt-4" data-r="seg"></div>
      <div class="card mt-4">
        <div class="font-semibold mb-2">¿Qué significa este resultado?</div>
        <div class="text-sm leading-relaxed" data-r="interp"></div>
        <div class="flex flex-wrap gap-2 mt-3" data-r="chips"></div>
      </div>
      <div class="card mt-4">
        <div class="font-semibold mb-3">Desglose por variable</div>
        <div data-r="brd" class="space-y-3"></div>
        <p class="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100 leading-relaxed">
          Nota metodológica: modelo de suma ponderada con pesos teóricos
          (Teoría del Comportamiento Planificado, Inteligencia Afectiva y
          Marketing Político; contexto Ecuador, elecciones seccionales). Los
          resultados son orientativos y los pesos son calibrables empíricamente.
        </p>
      </div>
      <button type="button" class="btn-primary !bg-white !text-slate-600 border border-slate-300 w-full mt-4" data-act="reset">Evaluar a otro candidato/a →</button>
    </div>

  </div>`;
}

function progress(n) {
  const pct = n * 20;
  return `<div class="mb-5" aria-hidden="true">
    <div class="flex justify-between text-xs text-slate-500 mb-1"><span>Paso ${n} de 5</span><span>${pct}%</span></div>
    <div class="bg-slate-100 rounded-full h-2 overflow-hidden"><div class="h-full rounded-full transition-all" style="width:${pct}%;background:var(--sigel-primary)"></div></div>
  </div>`;
}

// ── Mount: cablea el asistente (sin router, sin globals) ────────────────────
export function mountCalculadora() {
  st = newState();
  const root = document.getElementById('calc-root');
  if (!root) return;

  const steps = root.querySelectorAll('.step');
  const show = (n) => {
    st.step = n;
    steps.forEach(s => s.classList.toggle('hidden', +s.dataset.step !== n));
    const cn = st.cname || 'el/la candidato/a';
    root.querySelectorAll('[data-sub]').forEach(e =>
      e.innerHTML = `Responde pensando en <strong>${esc(cn)}</strong>.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  steps.forEach(s => s.classList.toggle('hidden', +s.dataset.step !== 0));

  const showErr = (stepNo, on) => {
    const s = root.querySelector(`.step[data-step="${stepNo}"] .err`);
    if (s) s.classList.toggle('hidden', !on);
  };

  // Likert: selección accesible (click + teclado)
  root.addEventListener('click', (ev) => {
    const lb = ev.target.closest('.likert-btn');
    if (lb) {
      const q = +lb.dataset.q, v = +lb.dataset.v;
      st.ans[q] = v;
      lb.closest('.likert').querySelectorAll('.likert-btn').forEach(b => {
        const on = +b.dataset.v === v;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.style.borderColor = '';
      });
      return;
    }
    const act = ev.target.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'goto') show(+act.dataset.to);
    else if (a === 'back') show(+act.dataset.to);
    else if (a === 'validate-1') validate1();
    else if (a === 'validate-2') validate2();
    else if (a === 'validate-block') validateBlock(+act.dataset.step);
    else if (a === 'reset') { st = newState(); reset(); show(0); }
  });

  // Teclado en grupos radio (flechas + espacio/enter ya por click)
  root.addEventListener('keydown', (ev) => {
    const lb = ev.target.closest('.likert-btn');
    if (!lb) return;
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); lb.click(); }
  });

  function validate1() {
    st.cname = (root.querySelector('#calc-cname').value || '').trim();
    st.cargo = root.querySelector('#calc-cargo').value || '';
    if (!st.cname) { showErr(1, true); return; }
    showErr(1, false); show(2);
  }
  function validate2() {
    let ok = true;
    SEL.forEach(([id]) => {
      const val = root.querySelector('#calc-' + id).value || '';
      st[id] = val; if (!val) ok = false;
    });
    if (!ok) { showErr(2, true); return; }
    showErr(2, false); show(3);
  }
  function validateBlock(stepNo) {
    const ranges = { 3: [0, 3], 4: [4, 8], 5: [9, 12] };
    const [a, b] = ranges[stepNo];
    let ok = true;
    for (let i = a; i <= b; i++) if (st.ans[i] === null) ok = false;
    if (!ok) {
      showErr(stepNo, true);
      for (let i = a; i <= b; i++) if (st.ans[i] === null)
        root.querySelectorAll(`.likert-btn[data-q="${i}"]`).forEach(x => x.style.borderColor = '#DC2626');
      return;
    }
    showErr(stepNo, false);
    if (stepNo === 5) { compute(); show(6); } else show(stepNo + 1);
  }

  function reset() {
    root.querySelector('#calc-cname').value = '';
    root.querySelector('#calc-cargo').value = '';
    SEL.forEach(([id]) => root.querySelector('#calc-' + id).value = '');
    root.querySelectorAll('.likert-btn').forEach(b => {
      b.classList.remove('selected'); b.setAttribute('aria-checked', 'false'); b.style.borderColor = '';
    });
    root.querySelectorAll('.err').forEach(e => e.classList.add('hidden'));
  }

  function segOf(vs) {
    const { CCP, CP, PCE, MC } = vs;
    if (CP >= .65 && CCP >= .65 && PCE >= .65 && MC <= .35) return 'convencido';
    if (CCP >= .6 && CP >= .55 && PCE < .45) return 'racional';
    if (PCE >= .6 && CCP < .45) return 'emocional';
    if (MC >= .6) return 'critico';
    if (CCP < .35 && CP < .35 && PCE < .35) return 'desconectado';
    return 'indeciso';
  }

  function compute() {
    const vs = {};
    for (const k in V) {
      const vv = V[k];
      const avg = vv.qs.reduce((s, qi) => s + st.ans[qi], 0) / vv.qs.length;
      vs[k] = (avg - 1) / 4;
    }
    let raw = 0;
    for (const k in V) { const vv = V[k]; raw += vv.neg ? -(vv.w * vs[k]) : (vv.w * vs[k]); }
    const pct = Math.max(0, Math.min(100, Math.round((raw + .09) * 100)));

    const q = sel => root.querySelector(`[data-r="${sel}"]`);
    q('cn').textContent = st.cname;
    q('cc').textContent = st.cargo ? 'Candidato/a a: ' + st.cargo : '';

    const gcol = pct <= 30 ? '#DC2626' : pct <= 60 ? '#F59E0B' : '#16A34A';
    const arc = q('arc');
    arc.style.stroke = gcol;
    arc.style.strokeDashoffset = '232.5';
    setTimeout(() => { arc.style.strokeDashoffset = 232.5 * (1 - pct / 100); }, 100);
    q('pct').textContent = pct + '%';

    const lvName = pct <= 30 ? 'CRITICO' : pct <= 60 ? 'MEDIO' : 'EXCELENTE';
    const lvTxt = pct <= 30 ? 'Baja probabilidad' : pct <= 60 ? 'Probabilidad media' : 'Alta probabilidad';
    const lv = q('lv'); lv.className = 'badge badge-' + lvName; lv.textContent = lvTxt;

    const seg = SEGS[segOf(vs)]; const t = TONE[seg.tone];
    const sc = q('seg');
    sc.style.background = t.bg; sc.style.borderColor = t.br;
    sc.innerHTML = `<div class="text-[10px] font-semibold uppercase tracking-wider mb-1" style="color:${t.fg}">Segmento de votante</div>
      <div class="font-display font-bold text-lg" style="color:${t.fg}">${seg.l}</div>
      <div class="text-sm mt-1 leading-relaxed text-slate-700">${seg.d}</div>`;

    const pos = Object.entries(V).filter(e => !e[1].neg).sort((a, b) => vs[b[0]] - vs[a[0]]);
    const top = pos[0][1].n.toLowerCase();
    const bot = pos[pos.length - 1][1].n.toLowerCase();
    let txt;
    if (pct <= 30) txt = `La intención de voto hacia <strong>${esc(st.cname)}</strong> es baja. La dimensión más débil es <strong>${bot}</strong>. Para mejorar, debería reforzar su comunicación de propuestas y construir confianza ciudadana.`;
    else if (pct <= 60) txt = `La intención de voto hacia <strong>${esc(st.cname)}</strong> es moderada. Su activo más fuerte es <strong>${top}</strong> y el mayor margen de mejora está en <strong>${bot}</strong>. Con una estrategia focalizada hay potencial real de crecimiento.`;
    else txt = `La intención de voto hacia <strong>${esc(st.cname)}</strong> es alta. Destaca especialmente en <strong>${top}</strong>. Se recomienda mantener la consistencia del mensaje y el vínculo con el electorado.`;
    q('interp').innerHTML = txt;

    q('chips').innerHTML = [['edad','Edad'],['educ','Educación'],['genero','Género'],['ingreso','Ingreso']]
      .map(([id, lb]) => `<span class="chip text-xs"><strong>${lb}:</strong> ${esc(st[id])}</span>`).join('');

    const sorted = Object.entries(V).sort((a, b) => b[1].w - a[1].w);
    q('brd').innerHTML = sorted.map(([k, vv]) => {
      const perf = vv.neg ? Math.round((1 - vs[k]) * 100) : Math.round(vs[k] * 100);
      const bc = perf >= 70 ? '#16A34A' : perf >= 40 ? '#F59E0B' : '#DC2626';
      return `<div>
        <div class="flex justify-between items-center text-sm mb-1">
          <span class="text-slate-600">${vv.n} <span class="text-slate-400 text-xs">(${Math.round(vv.w * 100)}%)</span></span>
          <span class="font-display font-bold tabular-nums">${perf}%</span>
        </div>
        <div class="bg-slate-100 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow="${perf}" aria-valuemin="0" aria-valuemax="100" aria-label="${vv.n}">
          <div class="h-full rounded-full" style="width:0%;background:${bc}" data-t="${perf}"></div>
        </div>
      </div>`;
    }).join('');
    setTimeout(() => root.querySelectorAll('[data-t]').forEach(b => { b.style.width = b.dataset.t + '%'; }), 150);
  }

  show(0);
}
