window.collectHomework = function () {
  const items = [];
  let max = 0;
  function add(id, label, gradable = true) {
    const answer = s.inputs[id] || '';
    const score = gradable && [0, 2].includes(s.scores[id]) ? s.scores[id] : null;
    const result = !gradable ? (answer ? 'Para revisar' : '') :
      score === null ? 'Sin comprobar' : score === 2 ? 'Correcta' : 'Incorrecta';
    if (gradable) max += 2;
    items.push({ label, answer, result, score });
  }
  V.forEach((verb, j) => {
    ['pres', 'past'].forEach((tense, z) => {
      P.forEach((person, i) =>
        add(`c${j}_${tense}_${i}`, `Conjugación ${j + 1} · ${verb.v} · ${person} · ${LABEL[tense]}`));
      const i = j * 2 + z;
      add('m' + i, `Opción múltiple ${i + 1} · ${verb.v} · ${P[(j + z + 1) % 5]} · ${LABEL[tense]}`);
      add('x' + i, `Completa ${i + 1} · ${z ? 'Ayer' : 'Normalmente'}, ${subjects[(j + z) % 5]} _____ ${verb.tail}.`);
      const person = (j + z + 1) % 5;
      const target = z ? 'pres' : 'past';
      add('t' + i, `Transformación ${i + 1} · ${P[person]} · ${verb[tense][person]} → ${LABEL[target]}`);
    });
  });
  dicts.forEach(([before, , after], i) => add('d' + i, `Dictado ${i + 1} · ${before} _____ ${after}`));
  oral.forEach(([prompt], i) => add('oral' + i, `Conversación ${i + 1} · ${prompt}`, false));
  return { items, max };
};
