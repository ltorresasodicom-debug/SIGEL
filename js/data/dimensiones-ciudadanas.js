// =============================================================================
// SIGEL — Dimensiones SIGEL en lenguaje ciudadano
//
// Capa de contenido para el módulo "Crea tu evaluación". Traduce las 8
// dimensiones técnicas del INGEL a lenguaje simple, con ejemplos cotidianos y
// 3 preguntas ciudadanas por dimensión (escala Likert 1–5, polaridad positiva:
// más alto = mejor).
//
// `id` = código canónico SIGEL → enlaza con el peso de cada dimensión en
// js/ingel.js (DIMENSIONES). El peso de cada pregunta DENTRO de su dimensión
// suma 1.0; el score de la dimensión es la media ponderada de sus preguntas
// (ver agregarDimension en js/views/evaluar.js). La fórmula INGEL no cambia.
//
// Estructura (JSON-serializable, lista para cualquier frontend):
//   { id, dimension, tituloCiudadano, descripcionCorta, descripcionExpandida,
//     ejemplo, interpretacionScore:{baja,alta},
//     preguntas:[{ id, texto, helperText, tipoEscala, peso }] }
// =============================================================================

const LIKERT = 'likert-1-5';
const W = [0.34, 0.33, 0.33]; // pesos por pregunta (equitativo, calibrable)

export const DIMENSIONES_CIUDADANAS = [
  {
    id: 'transparencia',
    dimension: 'Transparencia',
    tituloCiudadano: 'La información está a la vista',
    descripcionCorta: 'Qué tan fácil es enterarte de lo que hace el municipio con el dinero y las decisiones públicas.',
    descripcionExpandida: 'Un buen gobierno local no esconde información: publica en qué gasta, qué obras hace, cuánto cuestan y quién gana los contratos. Aquí evalúas si puedes acceder a esos datos sin trabas y entenderlos.',
    ejemplo: 'Quieres saber cuánto costó el arreglo de tu calle. Si lo encuentras publicado y en lenguaje claro, eso es transparencia.',
    interpretacionScore: {
      baja: 'La información está escondida o es confusa; cuesta saber en qué se usa el dinero.',
      alta: 'La información es pública, clara y fácil de encontrar para cualquier vecino.',
    },
    preguntas: [
      { id: 'transparencia_q1', texto: '¿Puedes enterarte fácilmente de en qué gasta el dinero tu municipio?', helperText: 'Piensa en presupuestos, obras y contratos. 1 = imposible · 5 = muy fácil.', tipoEscala: LIKERT, peso: W[0] },
      { id: 'transparencia_q2', texto: 'Cuando pides información al municipio, ¿te la entregan sin trabas?', helperText: '1 = nunca te la dan · 5 = siempre y rápido.', tipoEscala: LIKERT, peso: W[1] },
      { id: 'transparencia_q3', texto: 'La información que publica el municipio, ¿se entiende sin ser experto?', helperText: '1 = muy confusa · 5 = clara para cualquiera.', tipoEscala: LIKERT, peso: W[2] },
    ],
  },
  {
    id: 'finanzas',
    dimension: 'Gestión financiera',
    tituloCiudadano: 'Usan bien el dinero de todos',
    descripcionCorta: 'Si el municipio administra con cuidado el presupuesto y no malgasta los recursos públicos.',
    descripcionExpandida: 'El dinero del municipio viene de impuestos y transferencias del Estado. Manejarlo bien es cobrar de forma justa, gastar en lo que la gente necesita, terminar las obras y no endeudarse de más.',
    ejemplo: 'El municipio cobra el predial y con eso termina a tiempo el parque que prometió, sin dejar deudas. Eso es buen manejo del dinero.',
    interpretacionScore: {
      baja: 'Se percibe desorden, gasto en cosas poco útiles o deudas que preocupan.',
      alta: 'El dinero rinde: se gasta en lo importante y las cuentas dan tranquilidad.',
    },
    preguntas: [
      { id: 'finanzas_q1', texto: '¿Sientes que el municipio gasta el dinero en lo que de verdad hace falta?', helperText: '1 = lo malgasta · 5 = lo invierte muy bien.', tipoEscala: LIKERT, peso: W[0] },
      { id: 'finanzas_q2', texto: 'Las obras y servicios, ¿se terminan sin quedar a medias por falta de plata?', helperText: '1 = casi nunca · 5 = casi siempre.', tipoEscala: LIKERT, peso: W[1] },
      { id: 'finanzas_q3', texto: 'Lo que pagas al municipio (impuestos, tasas), ¿te parece justo para lo que recibes?', helperText: '1 = injusto · 5 = muy justo.', tipoEscala: LIKERT, peso: W[2] },
    ],
  },
  {
    id: 'servicios',
    dimension: 'Servicios públicos',
    tituloCiudadano: 'Los servicios del día a día funcionan',
    descripcionCorta: 'Cómo funcionan los servicios básicos que usas todos los días: agua, basura, calles, alumbrado.',
    descripcionExpandida: 'Es lo más visible del trabajo municipal: que llegue el agua, que recojan la basura, que las vías estén en buen estado y las calles iluminadas. Aquí calificas tu experiencia real con esos servicios.',
    ejemplo: 'El camión de la basura pasa los días que debe, el agua no se corta y tu calle está iluminada de noche. Eso son buenos servicios.',
    interpretacionScore: {
      baja: 'Los servicios fallan seguido y afectan tu vida diaria.',
      alta: 'Los servicios son confiables y casi no te dan problemas.',
    },
    preguntas: [
      { id: 'servicios_q1', texto: 'El agua potable y la recolección de basura, ¿funcionan bien donde vives?', helperText: '1 = fallan mucho · 5 = funcionan muy bien.', tipoEscala: LIKERT, peso: W[0] },
      { id: 'servicios_q2', texto: 'Las calles y veredas de tu zona, ¿están en buen estado?', helperText: 'Piensa en huecos y alumbrado. 1 = muy malas · 5 = muy buenas.', tipoEscala: LIKERT, peso: W[1] },
      { id: 'servicios_q3', texto: 'Cuando un servicio falla, ¿el municipio lo arregla pronto?', helperText: '1 = tarda muchísimo o nunca · 5 = lo soluciona rápido.', tipoEscala: LIKERT, peso: W[2] },
    ],
  },
  {
    id: 'desarrollo',
    dimension: 'Desarrollo territorial',
    tituloCiudadano: 'El cantón mejora y crece ordenado',
    descripcionCorta: 'Si tu cantón avanza con obras útiles, buenos espacios públicos y un crecimiento bien planificado.',
    descripcionExpandida: 'Más allá del día a día, un buen municipio piensa en el futuro: construye parques y espacios de encuentro, ordena dónde se puede construir y hace que el cantón sea un mejor lugar para vivir con el tiempo.',
    ejemplo: 'En los últimos años aparecieron un parque nuevo y mejores veredas, y la ciudad crece sin caos. Eso es desarrollo del territorio.',
    interpretacionScore: {
      baja: 'El cantón se siente estancado o crece de forma desordenada.',
      alta: 'Se nota que el cantón mejora y se planifica pensando en el futuro.',
    },
    preguntas: [
      { id: 'desarrollo_q1', texto: 'En los últimos años, ¿sientes que tu cantón ha mejorado como lugar para vivir?', helperText: '1 = igual o peor · 5 = mejoró bastante.', tipoEscala: LIKERT, peso: W[0] },
      { id: 'desarrollo_q2', texto: '¿Hay suficientes espacios públicos buenos (parques, plazas, áreas verdes)?', helperText: '1 = casi no hay o descuidados · 5 = hay y bien cuidados.', tipoEscala: LIKERT, peso: W[1] },
      { id: 'desarrollo_q3', texto: 'El crecimiento del cantón (construcciones, barrios nuevos), ¿se ve ordenado?', helperText: '1 = muy desordenado · 5 = bien planificado.', tipoEscala: LIKERT, peso: W[2] },
    ],
  },
  {
    id: 'gestion_institucional',
    dimension: 'Gestión institucional',
    tituloCiudadano: 'Hacer un trámite es fácil',
    descripcionCorta: 'Qué tan bien te atiende el municipio cuando necesitas un trámite o una respuesta.',
    descripcionExpandida: 'Tarde o temprano necesitas algo del municipio: un permiso, un certificado, una respuesta. Buena gestión es que te atiendan con respeto, sin vueltas innecesarias y en un tiempo razonable.',
    ejemplo: 'Vas a sacar un permiso, te atienden bien, te explican los pasos y lo resuelves en una sola visita. Eso es buena gestión.',
    interpretacionScore: {
      baja: 'Los trámites son lentos, confusos o te hacen volver muchas veces.',
      alta: 'El municipio atiende rápido, claro y con buen trato.',
    },
    preguntas: [
      { id: 'gestion_institucional_q1', texto: 'Cuando haces un trámite en el municipio, ¿te atienden con respeto y buen trato?', helperText: '1 = mal trato · 5 = excelente trato.', tipoEscala: LIKERT, peso: W[0] },
      { id: 'gestion_institucional_q2', texto: 'Los trámites municipales, ¿se resuelven en un tiempo razonable?', helperText: '1 = demoran muchísimo · 5 = son rápidos.', tipoEscala: LIKERT, peso: W[1] },
      { id: 'gestion_institucional_q3', texto: '¿Es fácil saber qué pasos seguir, sin que te manden de un lado a otro?', helperText: '1 = muy confuso · 5 = muy claro.', tipoEscala: LIKERT, peso: W[2] },
    ],
  },
  {
    id: 'participacion',
    dimension: 'Participación ciudadana',
    tituloCiudadano: 'Te toman en cuenta',
    descripcionCorta: 'Si el municipio escucha a los vecinos y los hace parte de las decisiones.',
    descripcionExpandida: 'Las mejores decisiones se toman escuchando a la gente. Aquí evalúas si el municipio abre espacios para que opines, si toma en serio lo que dicen los vecinos y si puedes influir en lo que pasa en tu barrio.',
    ejemplo: 'El municipio reúne al barrio para decidir en qué usar el presupuesto y de verdad toma en cuenta lo que la gente propone. Eso es participación.',
    interpretacionScore: {
      baja: 'Las decisiones se toman sin consultar a los vecinos.',
      alta: 'El municipio escucha a la gente y la incluye en las decisiones.',
    },
    preguntas: [
      { id: 'participacion_q1', texto: '¿El municipio abre espacios para que los vecinos opinen sobre lo que se hace?', helperText: 'Reuniones, consultas, presupuesto participativo. 1 = nunca · 5 = siempre.', tipoEscala: LIKERT, peso: W[0] },
      { id: 'participacion_q2', texto: 'Cuando los vecinos plantean un problema o idea, ¿el municipio lo toma en cuenta?', helperText: '1 = los ignora · 5 = los escucha de verdad.', tipoEscala: LIKERT, peso: W[1] },
      { id: 'participacion_q3', texto: '¿Sientes que puedes influir en las decisiones que afectan tu barrio?', helperText: '1 = nada · 5 = bastante.', tipoEscala: LIKERT, peso: W[2] },
    ],
  },
  {
    id: 'legitimidad',
    dimension: 'Legitimidad y confianza',
    tituloCiudadano: 'Confías en tus autoridades',
    descripcionCorta: 'Cuánta confianza te generan las autoridades del municipio y su forma de actuar.',
    descripcionExpandida: 'La confianza se gana cumpliendo lo prometido y actuando con honestidad. Aquí evalúas si crees que tus autoridades trabajan para la gente, cumplen su palabra y manejan lo público con rectitud.',
    ejemplo: 'El alcalde prometió arreglar el mercado y lo cumplió tal como dijo. Eso construye confianza.',
    interpretacionScore: {
      baja: 'Hay desconfianza: se percibe incumplimiento o falta de honestidad.',
      alta: 'Las autoridades generan confianza y actúan con honestidad.',
    },
    preguntas: [
      { id: 'legitimidad_q1', texto: '¿Crees que tus autoridades municipales cumplen lo que prometen?', helperText: '1 = casi nunca cumplen · 5 = casi siempre cumplen.', tipoEscala: LIKERT, peso: W[0] },
      { id: 'legitimidad_q2', texto: '¿Sientes que el municipio se maneja con honestidad?', helperText: '1 = mucha desconfianza · 5 = mucha confianza.', tipoEscala: LIKERT, peso: W[1] },
      { id: 'legitimidad_q3', texto: '¿Sientes que las autoridades trabajan para la gente y no para intereses propios?', helperText: '1 = para sus intereses · 5 = para la gente.', tipoEscala: LIKERT, peso: W[2] },
    ],
  },
  {
    id: 'innovacion',
    dimension: 'Innovación digital',
    tituloCiudadano: 'Resolver en línea es fácil',
    descripcionCorta: 'Si el municipio te facilita la vida con herramientas digitales: web, trámites en línea, apps.',
    descripcionExpandida: 'Hoy muchas cosas se resuelven desde el celular. Un municipio moderno tiene una web útil, permite hacer trámites o pagos en línea y usa medios digitales para informar, evitándote filas y viajes.',
    ejemplo: 'Pagas el predial o sacas un certificado desde el celular, sin ir a hacer fila. Eso es innovación digital.',
    interpretacionScore: {
      baja: 'Casi todo es presencial; las herramientas digitales no existen o no sirven.',
      alta: 'Puedes resolver y consultar muchas cosas en línea, sin filas.',
    },
    preguntas: [
      { id: 'innovacion_q1', texto: '¿Puedes hacer trámites o pagos del municipio por internet?', helperText: '1 = nada en línea · 5 = casi todo en línea.', tipoEscala: LIKERT, peso: W[0] },
      { id: 'innovacion_q2', texto: 'La página web o app del municipio, ¿es útil y fácil de usar?', helperText: '1 = no sirve o no existe · 5 = muy útil.', tipoEscala: LIKERT, peso: W[1] },
      { id: 'innovacion_q3', texto: '¿El municipio usa medios digitales para informarte de forma clara?', helperText: 'Redes, web, mensajes. 1 = nunca · 5 = siempre y bien.', tipoEscala: LIKERT, peso: W[2] },
    ],
  },
];

/** Total de preguntas ciudadanas (8 dimensiones × 3). */
export const TOTAL_PREGUNTAS = DIMENSIONES_CIUDADANAS.reduce(
  (n, d) => n + d.preguntas.length, 0);
