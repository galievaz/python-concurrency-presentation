(function() {
  const slides = document.querySelectorAll('.slide');
  const total = slides.length;
  let current = 0;
  let pyodideReady = false;

  function showSlide(index) {
    current = Math.max(0, Math.min(index, total - 1));
    slides.forEach((s, i) => s.classList.toggle('active', i === current));
    document.querySelectorAll('.slide-indicator').forEach(el => el.textContent = `${current + 1} / ${total}`);
    document.querySelectorAll('.lesson-item').forEach((el, i) => el.classList.toggle('active', i === current));
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = `${((current + 1) / total) * 100}%`;
    const progressText = document.getElementById('progressText');
    if (progressText) progressText.textContent = `${current + 1} / ${total}`;
    document.querySelectorAll('.nav-btn.prev').forEach(btn => btn.disabled = current === 0);
    document.querySelectorAll('.nav-btn.next').forEach(btn => btn.disabled = current === total - 1);
    document.querySelector('.slide.active')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelectorAll('.nav-btn.prev').forEach(btn => btn.addEventListener('click', () => showSlide(current - 1)));
  document.querySelectorAll('.nav-btn.next').forEach(btn => btn.addEventListener('click', () => showSlide(current + 1)));

  document.querySelectorAll('.lesson-item').forEach((item, i) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      showSlide(i);
    });
  });

  document.querySelector('.sidebar-toggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('collapsed');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showSlide(current - 1);
    if (e.key === 'ArrowRight') showSlide(current + 1);
  });

  // Pyodide loading
  async function initPyodide() {
    if (window.pyodide) return window.pyodide;
    const loading = document.createElement('div');
    loading.id = 'pyodide-loading';
    loading.textContent = 'Loading Python (Pyodide)...';
    loading.style.cssText = 'position:fixed;top:1rem;right:1rem;background:#1a2332;padding:0.5rem 1rem;border-radius:8px;font-size:0.9rem;z-index:999';
    document.body.appendChild(loading);
    try {
      window.pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
      loading.textContent = 'Python ready!';
      setTimeout(() => loading.remove(), 1500);
      pyodideReady = true;
      return window.pyodide;
    } catch (err) {
      loading.textContent = 'Error: ' + (err.message || err);
      loading.style.background = '#f85149';
      return null;
    }
  }

  async function runPython(code, outputEl) {
    if (!pyodideReady) {
      await initPyodide();
    }
    if (!window.pyodide) {
      outputEl.textContent = 'Python (Pyodide) unavailable. Check network.';
      outputEl.classList.add('error');
      return;
    }
    outputEl.textContent = 'Running...';
    outputEl.classList.remove('error', 'success');
    // Pyodide: asyncio.run() doesn't work. Use await main() in templates.
    const codeFixed = code.replace(/asyncio\.run\s*\(\s*(\w+)\s*\(\s*\)\s*\)/g, 'await $1()');
    const wrapped = `
import sys
from io import StringIO
__run_out__ = ''
_buffer = StringIO()
_old_stdout, _old_stderr = sys.stdout, sys.stderr
sys.stdout = sys.stderr = _buffer
try:
` + codeFixed.split('\n').map(l => '    ' + l).join('\n') + `
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    sys.stdout, sys.stderr = _old_stdout, _old_stderr
    __run_out__ = _buffer.getvalue()
`;
    try {
      await window.pyodide.runPythonAsync(wrapped);
      const out = window.pyodide.globals.get('__run_out__') || '';
      outputEl.textContent = out.trim() || '(no output)';
      outputEl.classList.add('success');
    } catch (err) {
      outputEl.textContent = String(err);
      outputEl.classList.add('error');
    }
  }

  // Quiz: on option select, show feedback
  document.querySelectorAll('.quiz-item').forEach(item => {
    const correct = item.dataset.correct;
    const isMultichoice = item.hasAttribute('data-multichoice');
    const feedback = item.querySelector('.quiz-feedback');
    const opts = item.querySelectorAll('.quiz-opt input');
    const checkBtn = item.querySelector('.quiz-check-btn');

    function doCheck(selectedVal) {
      item.classList.remove('correct', 'incorrect');
      item.querySelectorAll('.quiz-opt').forEach(l => l.classList.remove('selected', 'correct-opt', 'incorrect-opt'));
      const correctSet = new Set(correct.split(',').map(s => s.trim()));
      const selectedSet = isMultichoice ? new Set(selectedVal) : new Set([selectedVal]);
      const isCorrect = correctSet.size === selectedSet.size && [...correctSet].every(v => selectedSet.has(v));

      if (isCorrect) {
        item.classList.add('correct');
        correctSet.forEach(v => {
          const letters = { A: 0, B: 1, C: 2, D: 3 };
          const idx = letters[v];
          if (idx !== undefined) item.querySelectorAll('.quiz-opt')[idx]?.classList.add('correct-opt');
        });
        feedback.textContent = '✅ Correct!';
        feedback.className = 'quiz-feedback correct';
      } else {
        item.classList.add('incorrect');
        const letters = { A: 0, B: 1, C: 2, D: 3 };
        correctSet.forEach(v => {
          const idx = letters[v];
          if (idx !== undefined) item.querySelectorAll('.quiz-opt')[idx]?.classList.add('correct-opt');
        });
        selectedSet.forEach(v => {
          if (!correctSet.has(v)) {
            const idx = letters[v];
            if (idx !== undefined) item.querySelectorAll('.quiz-opt')[idx]?.classList.add('incorrect-opt');
          }
        });
        feedback.textContent = `❌ Correct: ${[...correctSet].join(', ')}`;
        feedback.className = 'quiz-feedback incorrect';
      }
      opts.forEach(r => r.disabled = true);
      if (checkBtn) checkBtn.disabled = true;
      const scope = item.closest('.col') || item.closest('.slide-content');
      if (scope) scope.querySelectorAll('.reveal-after-answer').forEach(el => el.classList.add('revealed'));
    }

    if (isMultichoice && checkBtn) {
      checkBtn.addEventListener('click', () => {
        const selected = [...opts].filter(cb => cb.checked).map(cb => cb.value);
        doCheck(selected);
      });
    } else {
      opts.forEach(radio => {
        radio.addEventListener('change', () => doCheck(radio.value));
      });
    }
  });

  document.querySelectorAll('.reveal-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const scope = btn.closest('.slide-content');
      if (scope) scope.querySelectorAll('.reveal-after-answer').forEach(el => el.classList.add('revealed'));
      btn.disabled = true;
      btn.textContent = 'Answer shown';
    });
  });

  document.querySelectorAll('.run-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.target;
      const outputId = btn.dataset.output;
      const codeEl = document.getElementById(targetId);
      const outputEl = document.getElementById(outputId);
      if (!codeEl || !outputEl) return;
      btn.disabled = true;
      await runPython(codeEl.value, outputEl);
      btn.disabled = false;
    });
  });

  showSlide(0);
})();
