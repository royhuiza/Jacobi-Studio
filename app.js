const matrixGrid = document.getElementById('matrixGrid');
const vectorGrid = document.getElementById('vectorGrid');
const x0Grid = document.getElementById('x0Grid');
const sizeSelect = document.getElementById('sizeSelect');
const tolInput = document.getElementById('tolInput');
const maxIterInput = document.getElementById('maxIterInput');
const formulaList = document.getElementById('formulaList');
const dominanceChecks = document.getElementById('dominanceChecks');
const dominanceStatus = document.getElementById('dominanceStatus');
const dominanceDetail = document.getElementById('dominanceDetail');
const solutionStatus = document.getElementById('solutionStatus');
const solutionDetail = document.getElementById('solutionDetail');
const iterStatus = document.getElementById('iterStatus');
const errorDetail = document.getElementById('errorDetail');
const finalVector = document.getElementById('finalVector');
const tableHead = document.querySelector('#iterationsTable thead');
const tableBody = document.querySelector('#iterationsTable tbody');

let lastIterations = [];

function createInputs(n) {
  matrixGrid.innerHTML = '';
  vectorGrid.innerHTML = '';
  x0Grid.innerHTML = '';

  matrixGrid.style.gridTemplateColumns = `repeat(${n}, minmax(58px, 1fr))`;
  vectorGrid.style.gridTemplateColumns = '1fr';
  x0Grid.style.gridTemplateColumns = '1fr';

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.value = i === j ? 1 : 0;
      input.dataset.kind = 'A';
      input.dataset.row = i;
      input.dataset.col = j;
      matrixGrid.appendChild(input);
    }
  }

  for (let i = 0; i < n; i++) {
    const b = document.createElement('input');
    b.type = 'number';
    b.step = 'any';
    b.value = 0;
    b.dataset.kind = 'b';
    b.dataset.row = i;
    vectorGrid.appendChild(b);

    const x0 = document.createElement('input');
    x0.type = 'number';
    x0.step = 'any';
    x0.value = 0;
    x0.dataset.kind = 'x0';
    x0.dataset.row = i;
    x0Grid.appendChild(x0);
  }

  matrixGrid.querySelectorAll('input').forEach(input => input.addEventListener('input', renderFormulas));
  renderFormulas();
  clearOutputs();
}

function getN() {
  return Number(sizeSelect.value);
}

function collectData() {
  const n = getN();
  const A = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      Number(matrixGrid.querySelector(`input[data-kind="A"][data-row="${i}"][data-col="${j}"]`).value || 0)
    )
  );
  const b = Array.from({ length: n }, (_, i) =>
    Number(vectorGrid.querySelector(`input[data-kind="b"][data-row="${i}"]`).value || 0)
  );
  const x0 = Array.from({ length: n }, (_, i) =>
    Number(x0Grid.querySelector(`input[data-kind="x0"][data-row="${i}"]`).value || 0)
  );

  return { A, b, x0, tol: Number(tolInput.value), maxIter: Number(maxIterInput.value) };
}

function setSystem(A, b, x0 = null) {
  const n = A.length;
  sizeSelect.value = String(n);
  createInputs(n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      matrixGrid.querySelector(`input[data-kind="A"][data-row="${i}"][data-col="${j}"]`).value = A[i][j];
    }
    vectorGrid.querySelector(`input[data-kind="b"][data-row="${i}"]`).value = b[i];
    x0Grid.querySelector(`input[data-kind="x0"][data-row="${i}"]`).value = x0 ? x0[i] : 0;
  }

  renderFormulas();
  clearOutputs();
}

function clearOutputs() {
  dominanceStatus.textContent = 'Pendiente';
  dominanceDetail.textContent = 'Aún no se ha evaluado la matriz.';
  solutionStatus.textContent = 'Pendiente';
  solutionDetail.textContent = 'Ejecuta el método para obtener resultados.';
  iterStatus.textContent = '0';
  errorDetail.textContent = 'Error relativo: —';
  dominanceChecks.innerHTML = '<div class="check-item"><div class="expr">Modifica o carga un sistema y luego ejecuta el método.</div><span class="badge">Info</span></div>';
  finalVector.className = 'final-vector empty';
  finalVector.innerHTML = 'Sin calcular';
  tableHead.innerHTML = '';
  tableBody.innerHTML = '';
  lastIterations = [];
}

function renderFormulas() {
  const { A, b } = collectData();
  formulaList.innerHTML = '';

  A.forEach((row, i) => {
    const aii = row[i];
    const item = document.createElement('div');
    item.className = 'formula-item';
    if (aii === 0) {
      item.innerHTML = `x<sub>${i + 1}</sub><sup>(k+1)</sup> no puede despejarse porque a<sub>${i + 1}${i + 1}</sub> = 0.`;
    } else {
      const terms = row
        .map((value, j) => ({ value, j }))
        .filter(term => term.j !== i && term.value !== 0)
        .map(term => {
          const sign = term.value > 0 ? ' - ' : ' + ';
          return `${sign}${Math.abs(term.value)}x<sub>${term.j + 1}</sub><sup>(k)</sup>`;
        })
        .join('');

      item.innerHTML = `x<sub>${i + 1}</sub><sup>(k+1)</sup> = ( ${b[i]}${terms || ''} ) / ${aii}`;
    }
    formulaList.appendChild(item);
  });
}

function evaluateDominance(A) {
  let all = true;
  dominanceChecks.innerHTML = '';

  A.forEach((row, i) => {
    const diag = Math.abs(row[i]);
    const sumOthers = row.reduce((acc, value, j) => acc + (j !== i ? Math.abs(value) : 0), 0);
    const ok = diag > sumOthers;
    if (!ok) all = false;

    const item = document.createElement('div');
    item.className = 'check-item';
    item.innerHTML = `
      <div class="expr">
        Fila ${i + 1}: |a<sub>${i + 1}${i + 1}</sub>| = ${diag} y Σ|a<sub>${i + 1}j</sub>| = ${sumOthers}.<br>
        <strong>${diag} ${ok ? '&gt;' : '&le;'} ${sumOthers}</strong>
      </div>
      <span class="badge ${ok ? 'ok' : 'no'}">${ok ? 'Cumple' : 'No cumple'}</span>
    `;
    dominanceChecks.appendChild(item);
  });

  dominanceStatus.textContent = all ? 'Sí converge por EDD' : 'No garantizada por EDD';
  dominanceDetail.textContent = all
    ? 'La matriz es estrictamente diagonal dominante por filas. Jacobi converge.'
    : 'La matriz no es estrictamente diagonal dominante en todas las filas.';

  return all;
}

function maxAbs(arr) {
  return Math.max(...arr.map(v => Math.abs(v)));
}

function solveJacobi() {
  const { A, b, x0, tol, maxIter } = collectData();
  const n = A.length;

  if (!Number.isFinite(tol) || tol <= 0) {
    alert('Ingresa una tolerancia válida mayor que 0.');
    return;
  }
  if (!Number.isFinite(maxIter) || maxIter < 1) {
    alert('Ingresa un número de iteraciones válido.');
    return;
  }
  for (let i = 0; i < n; i++) {
    if (A[i][i] === 0) {
      alert(`La diagonal contiene un 0 en la fila ${i + 1}. No se puede aplicar Jacobi directamente.`);
      return;
    }
  }

  const convergesByEDD = evaluateDominance(A);
  let xPrev = [...x0];
  const iterations = [];
  let error = Infinity;
  let xNew = [...x0];

  for (let k = 1; k <= maxIter; k++) {
    xNew = Array.from({ length: n }, (_, i) => {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (j !== i) sum += A[i][j] * xPrev[j];
      }
      return (b[i] - sum) / A[i][i];
    });

    const numerator = maxAbs(xNew.map((value, i) => value - xPrev[i]));
    const denominator = Math.max(maxAbs(xNew), 1e-12);
    error = numerator / denominator;

    iterations.push({ k, x: [...xNew], error });
    xPrev = [...xNew];

    if (error <= tol) break;
  }

  lastIterations = iterations;
  renderTable(iterations, n);
  renderFinalVector(xNew);

  solutionStatus.textContent = iterations.length ? 'Cálculo completado' : 'Sin resultados';
  solutionDetail.textContent = convergesByEDD
    ? 'La solución se obtuvo bajo una condición suficiente de convergencia.'
    : 'Se obtuvo una aproximación, pero sin garantía teórica por EDD.';
  iterStatus.textContent = String(iterations.length);
  errorDetail.textContent = `Error relativo final: ${Number.isFinite(error) ? error.toExponential(4) : '—'}`;
}

function renderTable(iterations, n) {
  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  const tr = document.createElement('tr');
  tr.innerHTML = `<th>Iteración</th>${Array.from({ length: n }, (_, i) => `<th>x${i + 1}</th>`).join('')}<th>Error relativo</th>`;
  tableHead.appendChild(tr);

  iterations.forEach(row => {
    const trBody = document.createElement('tr');
    trBody.innerHTML = `
      <td>${row.k}</td>
      ${row.x.map(value => `<td>${value.toFixed(6)}</td>`).join('')}
      <td>${row.error.toExponential(4)}</td>
    `;
    tableBody.appendChild(trBody);
  });
}

function renderFinalVector(vector) {
  finalVector.className = 'final-vector';
  finalVector.innerHTML = vector
    .map((value, i) => `<div class="final-pill">x${i + 1} = ${value.toFixed(6)}</div>`)
    .join('');
}

function resetX0() {
  x0Grid.querySelectorAll('input').forEach(input => input.value = 0);
  clearOutputs();
}

function exportCSV() {
  if (!lastIterations.length) {
    alert('Primero ejecuta el método para generar el historial.');
    return;
  }
  const n = getN();
  const header = ['Iteracion', ...Array.from({ length: n }, (_, i) => `x${i + 1}`), 'Error_relativo'];
  const rows = lastIterations.map(it => [it.k, ...it.x.map(v => v.toFixed(6)), it.error]);
  const csv = [header, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'historial_jacobi.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

const sampleGuide = {
  A: [
    [10, -2, -1, 0],
    [-1, 8, 0, -2],
    [-2, 0, 12, -3],
    [0, -1, -2, 9]
  ],
  b: [15, 18, 25, 20],
  x0: [0, 0, 0, 0]
};

const sampleClass = {
  A: [
    [2, -1],
    [1, 2]
  ],
  b: [1, 3],
  x0: [0, 0]
};

const sampleEDD = {
  A: [
    [5, -2, 1],
    [2, -7, -1],
    [1, 4, -6]
  ],
  b: [1, 2, -1],
  x0: [0, 0, 0]
};

document.getElementById('btnSolve').addEventListener('click', solveJacobi);
document.getElementById('btnResetZeros').addEventListener('click', resetX0);
document.getElementById('btnExportCsv').addEventListener('click', exportCSV);
document.getElementById('btnSampleGuide').addEventListener('click', () => setSystem(sampleGuide.A, sampleGuide.b, sampleGuide.x0));
document.getElementById('btnSampleClass').addEventListener('click', () => setSystem(sampleClass.A, sampleClass.b, sampleClass.x0));
document.getElementById('btnSampleEDD').addEventListener('click', () => setSystem(sampleEDD.A, sampleEDD.b, sampleEDD.x0));
sizeSelect.addEventListener('change', () => createInputs(getN()));

createInputs(4);
setSystem(sampleGuide.A, sampleGuide.b, sampleGuide.x0);
