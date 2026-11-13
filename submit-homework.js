(() => {
  const button = document.getElementById('submit-homework');
  const status = document.getElementById('homework-status');
  const receiptLink = document.getElementById('open-homework-receipt');
  const endpoint = window.homeworkEndpoint;
  const assignment = JSON.parse(document.getElementById('homework-assignment').textContent);
  const storageKey = 'homework-submission-v1:' + assignment.id;
  let pending;
  let lastReceipt;
  const success = '¡Tarea enviada correctamente! / Your homework was submitted successfully!';
  const messages = {
    unavailable: 'No se confirmó el envío. Intenta de nuevo. / Submission was not confirmed. Try again.',
    busy: 'Servicio ocupado. Intenta de nuevo. / Service is busy. Try again.',
    invalid: 'Revisa el nombre y la longitud de las respuestas. / Check your name and answer lengths.',
    limit: 'Límite temporal de envíos. Intenta más tarde. / Temporary submission limit. Try again later.',
    conflict: 'La referencia ya se usó con otro contenido. / This reference was already used with different content.'
  };

  async function submissionRef(snapshot) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(snapshot));
    const fingerprint = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
    let cached = pending;
    try {
      cached = JSON.parse(localStorage.getItem(storageKey)) || cached;
    } catch (_) {
      // In-memory retry remains available if storage is disabled.
    }
    if (cached?.fingerprint === fingerprint) return cached.ref;
    pending = { fingerprint, ref: crypto.randomUUID() };
    try {
      localStorage.setItem(storageKey, JSON.stringify(pending));
    } catch (_) {
      // The lesson's existing autosave remains independent.
    }
    return pending.ref;
  }

  function send(payload) {
    return new Promise((resolve, reject) => {
      const token = crypto.randomUUID();
      const frame = document.createElement('iframe');
      frame.name = 'homework-' + token;
      frame.title = 'Confirmación de tarea / Homework confirmation';
      frame.hidden = true;
      const form = document.createElement('form');
      form.action = endpoint;
      form.method = 'post';
      form.target = frame.name;
      form.hidden = true;
      for (const [name, value] of Object.entries({ token, homework: JSON.stringify(payload) })) {
        const field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        field.value = value;
        form.append(field);
      }
      function cleanup() {
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        frame.remove();
        form.remove();
      }
      function receive(event) {
        if (!/^https:\/\/(?:script\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(event.origin) ||
            event.data?.token !== token) return;
        cleanup();
        resolve(event.data);
      }
      const timer = setTimeout(() => {
        cleanup();
        reject(Error('Receipt timeout'));
      }, 25000);
      window.addEventListener('message', receive);
      document.body.append(frame, form);
      form.submit();
    });
  }

  function showReceipt(tab, text) {
    tab.document.title = 'Tarea recibida / Homework received';
    const heading = tab.document.createElement('h1');
    heading.textContent = success;
    const details = tab.document.createElement('p');
    details.style.whiteSpace = 'pre-line';
    details.textContent = text;
    tab.document.body.replaceChildren(heading, details);
  }

  receiptLink.addEventListener('click', () => {
    if (!lastReceipt) return;
    const tab = window.open('', '_blank');
    if (tab) showReceipt(tab, lastReceipt);
  });

  button.addEventListener('click', async () => {
    const nameField = document.getElementById('student');
    const name = nameField.value.trim();
    if (!name || name.length > 100) {
      status.textContent = 'Escribe tu nombre (1–100 caracteres). / Enter your name (1–100 characters).';
      nameField.focus();
      return;
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint)) {
      status.textContent = 'Envíos aún no disponibles. / Submissions are not available yet.';
      return;
    }
    save();
    const { items, max } = window.collectHomework();
    const snapshot = JSON.stringify({ version: 1, assignment, name, items, max });
    const tab = window.open('', '_blank');
    if (tab) {
      tab.document.title = 'Enviando tarea / Sending homework';
      tab.document.body.textContent = 'Enviando tarea… / Sending homework…';
    }
    button.disabled = true;
    receiptLink.hidden = true;
    status.textContent = 'Enviando tarea… / Sending homework…';
    try {
      const ref = await submissionRef(snapshot);
      const result = await send({ ...JSON.parse(snapshot), ref });
      if (!result.ok || result.ref !== ref || !Number.isFinite(Date.parse(result.at))) {
        status.textContent = messages[result.reason] || messages.unavailable;
        if (tab && !tab.closed) tab.close();
        return;
      }
      const notification = result.notification === 'Enviada' ? 'Enviada / Sent' : 'Pendiente / Pending';
      const date = new Date(result.at).toLocaleString();
      lastReceipt = [
        'Estudiante / Student: ' + name, 'Tarea / Assignment: ' + assignment.title,
        'Referencia / Reference: ' + ref, 'Fecha / Date: ' + date,
        'Estado / Status: Recibida / Received', 'Notificación / Notification: ' + notification
      ].join('\n');
      status.textContent = success + '\n' + lastReceipt;
      receiptLink.hidden = false;
      if (tab && !tab.closed) {
        try { showReceipt(tab, lastReceipt); } catch (_) { /* Inline receipt is already visible. */ }
      }
    } catch (_) {
      status.textContent = messages.unavailable;
      if (tab && !tab.closed) tab.close();
    } finally {
      button.disabled = false;
    }
  });
})();
