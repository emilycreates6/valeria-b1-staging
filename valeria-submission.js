window.collectHomework = function () {
  const items = [];
  const add = (id, label, answer, result) => {
    const score = Number.isInteger(state.scores[id]) ? state.scores[id] : null;
    items.push({ label, answer, result, score });
  };
  const grade = (answer, correct) => !answer ? 'Sin comprobar' : correct ? 'Correcta' : 'Incorrecta';

  DATA.grammar.forEach(([, prompt, expected], i) => {
    const id = 'g' + i;
    const answer = GRAMMAR_OPTIONS[i][state.responses[id]] || '';
    const correct = answer.trim().toLocaleLowerCase('es') === expected.trim().toLocaleLowerCase('es');
    add(id, 'Gramática ' + (i + 1) + ' — ' + prompt, answer, grade(answer, correct));
  });
  DATA.vocabulary.forEach(([word, , , options, key], i) => {
    const id = 'v' + i;
    const choice = state.responses[id];
    const answer = options[choice] || '';
    add(id, 'Vocabulario ' + (i + 1) + ' — ' + word, answer, grade(answer, choice === String(key)));
  });
  DATA.dictations.forEach(([part, phrase, missing], i) => {
    const id = 'd' + i;
    const words = phrase.split(' ');
    const entries = missing.filter(j => j < words.length).map((j, index) => {
      const answer = (state.responses[id + '_' + j] || '').trim();
      const correct = answer && normalize(answer) === normalize(words[j]);
      return { answer, correct, text: (index + 1) + '. ' + (answer || '—') + (answer ? (correct ? ' ✓' : ' ✗') : '') };
    });
    const result = grade(entries.some(entry => entry.answer), entries.every(entry => entry.correct));
    add(id, 'Dictado ' + (i + 1) + ' — ' + part, entries.map(entry => entry.text).join(' | '), result);
  });
  for (const [prefix, label, exercises] of [
    ['c', 'Comprensión', DATA.comprehension], ['o', 'Conversación', DATA.oral]
  ]) {
    exercises.forEach(([prompt], i) => {
      const id = prefix + i;
      const answer = state.responses[id] || '';
      add(id, label + ' ' + (i + 1) + ' — ' + prompt, answer, answer ? 'Para revisar' : '');
    });
  }
  DATA.auto.forEach((prompt, i) => {
    const answer = { si: 'Sí', practicar: 'Necesito practicar' }[state.self[i]] || '';
    add('self' + i, 'Autoevaluación ' + (i + 1) + ' — ' + prompt, answer, '');
  });
  return { items, max: TOTAL * 2 };
};
