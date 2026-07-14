// ========== GLOBAL VARIABLES ==========
let chartInstance = null;
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27', 'May 27', 'Jun 27'];

// ========== DEFAULT DATA ==========
let salesData = {
  revenue: 4820000,
  forecast: 5340000,
  pipeline: 2910000,
  winRate: 68,
  historical: [320, 290, 340, 380, 410, 440, 470, 510, 530, 580, 610, 650],
  forecastValues: [680, 720, 770, 820, 860, 910]
};

// Store imported data temporarily
let csvData = null;
let excelData = null;
let pdfData = null;

// ========== LOAD SAVED DATA ==========
function loadSavedData() {
  const saved = localStorage.getItem('salesData');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      salesData = parsed;
      populateManualForm(parsed);
      return true;
    } catch (e) {
      console.warn('Failed to load saved data', e);
      return false;
    }
  }
  return false;
}

function populateManualForm(data) {
  document.getElementById('inputRevenue').value = data.revenue;
  document.getElementById('inputForecast').value = data.forecast;
  document.getElementById('inputPipeline').value = data.pipeline;
  document.getElementById('inputWinRate').value = data.winRate;
  document.getElementById('inputHistorical').value = data.historical.join(',');
  document.getElementById('inputForecastValues').value = data.forecastValues.join(',');
}

// ========== UPDATE DASHBOARD ==========
function updateDashboard(data) {
  console.log('Updating dashboard with:', data);

  // Update KPI cards
  document.getElementById('kpiRevenue').textContent = '$' + (data.revenue / 1000000).toFixed(2) + 'M';
  document.getElementById('kpiForecast').textContent = '$' + (data.forecast / 1000000).toFixed(2) + 'M';
  document.getElementById('kpiPipeline').textContent = '$' + (data.pipeline / 1000000).toFixed(2) + 'M';
  document.getElementById('kpiWinRate').textContent = data.winRate + '%';

  // Update timestamp
  const now = new Date();
  document.getElementById('lastUpdate').textContent = 'Updated: ' + now.toLocaleString();

  // Update quarterly table
  const fv = data.forecastValues;
  if (fv && fv.length >= 4) {
    const quarters = [
      { period: 'Q3 2026', value: (fv[0] || 0) + (fv[1] || 0), confidence: '92%', trend: '+6%' },
      { period: 'Q4 2026', value: (fv[2] || 0) + (fv[3] || 0), confidence: '87%', trend: '+18%' },
      { period: 'Q1 2027', value: (fv[4] || 0) + (fv[5] || 0), confidence: '79%', trend: '+12%' },
      { period: 'Q2 2027', value: (fv[5] || 0) + 120, confidence: '74%', trend: '+8%' }
    ];
    const tbody = document.getElementById('quarterlyBody');
    if (tbody) {
      tbody.innerHTML = quarters.map(q => `
        <tr>
          <td>${q.period}</td>
          <td class="highlight">$${(q.value / 1000).toFixed(2)}M</td>
          <td><span class="badge-confidence">${q.confidence}</span></td>
          <td><i class="fas fa-arrow-up" style="color:#27ae60;"></i> ${q.trend}</td>
        </tr>
      `).join('');
    }
  }

  // Update chart
  updateChart(data);
}

// ========== CHART UPDATE ==========
function updateChart(data) {
  const ctx = document.getElementById('forecastChart').getContext('2d');
  const hist = data.historical || [];
  const fore = data.forecastValues || [];

  while (hist.length < 12) hist.push(0);
  while (fore.length < 6) fore.push(0);

  const historicalData = [...hist.slice(0, 12), ...Array(6).fill(null)];
  const forecastData = [...Array(12).fill(null), ...fore.slice(0, 6)];
  const upper = [...Array(12).fill(null), ...fore.slice(0, 6).map(v => v * 1.06)];
  const lower = [...Array(12).fill(null), ...fore.slice(0, 6).map(v => v * 0.94)];

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'Historical Sales',
        data: historicalData,
        backgroundColor: '#2a7de1',
        borderRadius: 4,
        barPercentage: 0.55,
        categoryPercentage: 0.7,
        order: 2
      }, {
        label: 'Forecast',
        data: forecastData,
        backgroundColor: '#f1c40f',
        borderRadius: 4,
        barPercentage: 0.55,
        categoryPercentage: 0.7,
        order: 2
      }, {
        label: 'Upper bound',
        data: upper,
        borderColor: '#e67e22',
        backgroundColor: 'rgba(230, 126, 34, 0.08)',
        borderWidth: 1.5,
        borderDash: [4, 4],
        type: 'line',
        pointRadius: 0,
        fill: false,
        tension: 0.2,
        order: 1
      }, {
        label: 'Lower bound',
        data: lower,
        borderColor: '#e67e22',
        backgroundColor: 'rgba(230, 126, 34, 0.08)',
        borderWidth: 1.5,
        borderDash: [4, 4],
        type: 'line',
        pointRadius: 0,
        fill: '+1',
        tension: 0.2,
        order: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { callback: (v) => '$' + v + 'k' }
        },
        x: {
          grid: { display: false },
          ticks: { maxRotation: 30, font: { size: 10 } }
        }
      }
    }
  });
}

// ========== SAVE DATA ==========
function saveDataToStorage(data) {
  console.log('Saving data:', data);
  localStorage.setItem('salesData', JSON.stringify(data));
  salesData = data;
  updateDashboard(data);

  const successMsg = document.getElementById('successMessage');
  successMsg.style.display = 'block';
  setTimeout(() => {
    successMsg.style.display = 'none';
  }, 2000);
}

// ========== MANUAL SAVE ==========
function saveManualData() {
  try {
    const revenue = parseFloat(document.getElementById('inputRevenue').value);
    const forecast = parseFloat(document.getElementById('inputForecast').value);
    const pipeline = parseFloat(document.getElementById('inputPipeline').value);
    const winRate = parseFloat(document.getElementById('inputWinRate').value);

    const historicalStr = document.getElementById('inputHistorical').value;
    const historical = historicalStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));

    const forecastStr = document.getElementById('inputForecastValues').value;
    const forecastValues = forecastStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));

    if (historical.length !== 12) {
      alert('Please enter exactly 12 historical values. You entered ' + historical.length);
      return;
    }
    if (forecastValues.length !== 6) {
      alert('Please enter exactly 6 forecast values. You entered ' + forecastValues.length);
      return;
    }

    const data = { revenue, forecast, pipeline, winRate, historical, forecastValues };
    saveDataToStorage(data);
    document.getElementById('dataModal').style.display = 'none';
  } catch (e) {
    alert('Error saving data: ' + e.message);
  }
}

// ========== CSV HANDLING ==========
function handleCSVFile(file) {
  const reader = new FileReader();
  reader.onload = function(event) {
    const text = event.target.result;
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      alert('CSV file is empty');
      return;
    }

    // Find the first row with numbers
    let allNumbers = [];
    for (const line of lines) {
      const numbers = line.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      if (numbers.length > 0) {
        allNumbers = numbers;
        break;
      }
    }

    if (allNumbers.length < 22) {
      alert('Need at least 22 numbers in CSV (4 KPIs + 12 historical + 6 forecast). Found ' + allNumbers.length);
      return;
    }

    csvData = {
      revenue: allNumbers[0] || 0,
      forecast: allNumbers[1] || 0,
      pipeline: allNumbers[2] || 0,
      winRate: allNumbers[3] || 0,
      historical: allNumbers.slice(4, 16),
      forecastValues: allNumbers.slice(16, 22)
    };

    while (csvData.historical.length < 12) csvData.historical.push(0);
    while (csvData.forecastValues.length < 6) csvData.forecastValues.push(0);
    csvData.historical = csvData.historical.slice(0, 12);
    csvData.forecastValues = csvData.forecastValues.slice(0, 6);

    const preview = document.getElementById('csvPreview');
    preview.style.display = 'block';
    preview.innerHTML = `
      <p><strong>File:</strong> ${file.name}</p>
      <p><strong>Revenue:</strong> $${(csvData.revenue / 1000000).toFixed(2)}M</p>
      <p><strong>Forecast:</strong> $${(csvData.forecast / 1000000).toFixed(2)}M</p>
      <p><strong>Pipeline:</strong> $${(csvData.pipeline / 1000000).toFixed(2)}M</p>
      <p><strong>Win Rate:</strong> ${csvData.winRate}%</p>
      <p><strong>Historical:</strong> ${csvData.historical.join(', ')}</p>
      <p><strong>Forecast values:</strong> ${csvData.forecastValues.join(', ')}</p>
    `;
    document.getElementById('csvImportBtn').disabled = false;
  };
  reader.readAsText(file);
}

// ========== EXCEL HANDLING ==========
function handleExcelFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (jsonData.length === 0) {
        alert('Excel file is empty');
        return;
      }

      // Find first row with numbers
      let numbers = [];
      for (const row of jsonData) {
        const rowNumbers = row.filter(val => typeof val === 'number' && !isNaN(val));
        if (rowNumbers.length >= 22) {
          numbers = rowNumbers;
          break;
        }
      }

      // If not found, try to find numbers in text
      if (numbers.length === 0) {
        const allValues = jsonData.flat().filter(val => typeof val === 'number' && !isNaN(val));
        if (allValues.length >= 22) {
          numbers = allValues;
        }
      }

      if (numbers.length < 22) {
        alert('Need at least 22 numbers in Excel. Found ' + numbers.length);
        return;
      }

      excelData = {
        revenue: numbers[0] || 0,
        forecast: numbers[1] || 0,
        pipeline: numbers[2] || 0,
        winRate: numbers[3] || 0,
        historical: numbers.slice(4, 16),
        forecastValues: numbers.slice(16, 22)
      };

      while (excelData.historical.length < 12) excelData.historical.push(0);
      while (excelData.forecastValues.length < 6) excelData.forecastValues.push(0);
      excelData.historical = excelData.historical.slice(0, 12);
      excelData.forecastValues = excelData.forecastValues.slice(0, 6);

      const preview = document.getElementById('excelPreview');
      preview.style.display = 'block';
      preview.innerHTML = `
        <p><strong>File:</strong> ${file.name}</p>
        <p><strong>Revenue:</strong> $${(excelData.revenue / 1000000).toFixed(2)}M</p>
        <p><strong>Forecast:</strong> $${(excelData.forecast / 1000000).toFixed(2)}M</p>
        <p><strong>Pipeline:</strong> $${(excelData.pipeline / 1000000).toFixed(2)}M</p>
        <p><strong>Win Rate:</strong> ${excelData.winRate}%</p>
        <p><strong>Historical:</strong> ${excelData.historical.join(', ')}</p>
        <p><strong>Forecast values:</strong> ${excelData.forecastValues.join(', ')}</p>
      `;
      document.getElementById('excelImportBtn').disabled = false;
    } catch (err) {
      alert('Error reading Excel file: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ========== PDF HANDLING ==========
function handlePDFFile(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const arrayBuffer = e.target.result;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + ' ';
      }

      // Extract all numbers
      const numbers = text.match(/\d+\.?\d*/g) || [];
      const numValues = numbers.map(Number).filter(n => n > 0);

      if (numValues.length < 22) {
        alert('Could not find enough numbers in PDF. Found ' + numValues.length + ' numbers. Need 22.');
        return;
      }

      pdfData = {
        revenue: numValues[0] || 0,
        forecast: numValues[1] || 0,
        pipeline: numValues[2] || 0,
        winRate: numValues[3] || 0,
        historical: numValues.slice(4, 16),
        forecastValues: numValues.slice(16, 22)
      };

      while (pdfData.historical.length < 12) pdfData.historical.push(0);
      while (pdfData.forecastValues.length < 6) pdfData.forecastValues.push(0);
      pdfData.historical = pdfData.historical.slice(0, 12);
      pdfData.forecastValues = pdfData.forecastValues.slice(0, 6);

      const preview = document.getElementById('pdfPreview');
      preview.style.display = 'block';
      preview.innerHTML = `
        <p><strong>File:</strong> ${file.name}</p>
        <p><strong>Pages:</strong> ${pdf.numPages}</p>
        <p><strong>Revenue:</strong> $${(pdfData.revenue / 1000000).toFixed(2)}M</p>
        <p><strong>Forecast:</strong> $${(pdfData.forecast / 1000000).toFixed(2)}M</p>
        <p><strong>Pipeline:</strong> $${(pdfData.pipeline / 1000000).toFixed(2)}M</p>
        <p><strong>Win Rate:</strong> ${pdfData.winRate}%</p>
        <p><strong>Historical:</strong> ${pdfData.historical.join(', ')}</p>
        <p><strong>Forecast values:</strong> ${pdfData.forecastValues.join(', ')}</p>
      `;
      document.getElementById('pdfImportBtn').disabled = false;
    } catch (err) {
      alert('Error reading PDF: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', function() {
  loadSavedData();
  updateDashboard(salesData);
  console.log('Dashboard initialized with data:', salesData);
});

// Modal Controls
const modal = document.getElementById('dataModal');
const editBtn = document.getElementById('editDataBtn');
const closeBtn = document.getElementById('closeModalBtn');

editBtn.onclick = function() {
  modal.style.display = 'flex';
  document.getElementById('successMessage').style.display = 'none';
  populateManualForm(salesData);
};

closeBtn.onclick = function() {
  modal.style.display = 'none';
};

window.onclick = function(event) {
  if (event.target === modal) modal.style.display = 'none';
};

// Manual Save
document.getElementById('manualSaveBtn').onclick = saveManualData;

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = function() {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    const tabId = 'tab-' + this.dataset.tab;
    document.getElementById(tabId).classList.add('active');
  };
});

// CSV Events
document.getElementById('csvDropZone').onclick = () => document.getElementById('csvFileInput').click();

document.getElementById('csvDropZone').ondragover = (e) => {
  e.preventDefault();
  document.getElementById('csvDropZone').style.borderColor = '#2a7de1';
  document.getElementById('csvDropZone').style.background = '#f0f7ff';
};

document.getElementById('csvDropZone').ondragleave = () => {
  document.getElementById('csvDropZone').style.borderColor = '#d1d9e6';
  document.getElementById('csvDropZone').style.background = 'transparent';
};

document.getElementById('csvDropZone').ondrop = (e) => {
  e.preventDefault();
  document.getElementById('csvDropZone').style.borderColor = '#d1d9e6';
  document.getElementById('csvDropZone').style.background = 'transparent';
  const files = e.dataTransfer.files;
  if (files.length > 0) handleCSVFile(files[0]);
};

document.getElementById('csvFileInput').onchange = (e) => {
  if (e.target.files.length > 0) handleCSVFile(e.target.files[0]);
};

document.getElementById('csvImportBtn').onclick = function() {
  if (csvData) {
    saveDataToStorage(csvData);
    document.getElementById('dataModal').style.display = 'none';
  }
};

document.getElementById('csvCancelBtn').onclick = function() {
  document.getElementById('csvFileInput').value = '';
  document.getElementById('csvPreview').style.display = 'none';
  document.getElementById('csvPreview').innerHTML = '';
  document.getElementById('csvImportBtn').disabled = true;
  csvData = null;
};

// Excel Events
document.getElementById('excelDropZone').onclick = () => document.getElementById('excelFileInput').click();

document.getElementById('excelDropZone').ondragover = (e) => {
  e.preventDefault();
  document.getElementById('excelDropZone').style.borderColor = '#217346';
  document.getElementById('excelDropZone').style.background = '#f0faf5';
};

document.getElementById('excelDropZone').ondragleave = () => {
  document.getElementById('excelDropZone').style.borderColor = '#d1d9e6';
  document.getElementById('excelDropZone').style.background = 'transparent';
};

document.getElementById('excelDropZone').ondrop = (e) => {
  e.preventDefault();
  document.getElementById('excelDropZone').style.borderColor = '#d1d9e6';
  document.getElementById('excelDropZone').style.background = 'transparent';
  const files = e.dataTransfer.files;
  if (files.length > 0) handleExcelFile(files[0]);
};

document.getElementById('excelFileInput').onchange = function(e) {
  if (e.target.files.length > 0) handleExcelFile(e.target.files[0]);
};

document.getElementById('excelImportBtn').onclick = function() {
  if (excelData) {
    saveDataToStorage(excelData);
    document.getElementById('dataModal').style.display = 'none';
  }
};

document.getElementById('excelCancelBtn').onclick = function() {
  document.getElementById('excelFileInput').value = '';
  document.getElementById('excelPreview').style.display = 'none';
  document.getElementById('excelPreview').innerHTML = '';
  document.getElementById('excelImportBtn').disabled = true;
  excelData = null;
};

// PDF Events
document.getElementById('pdfDropZone').onclick = () => document.getElementById('pdfFileInput').click();

document.getElementById('pdfDropZone').ondragover = (e) => {
  e.preventDefault();
  document.getElementById('pdfDropZone').style.borderColor = '#dc3545';
  document.getElementById('pdfDropZone').style.background = '#fdf0f0';
};

document.getElementById('pdfDropZone').ondragleave = () => {
  document.getElementById('pdfDropZone').style.borderColor = '#d1d9e6';
  document.getElementById('pdfDropZone').style.background = 'transparent';
};

document.getElementById('pdfDropZone').ondrop = (e) => {
  e.preventDefault();
  document.getElementById('pdfDropZone').style.borderColor = '#d1d9e6';
  document.getElementById('pdfDropZone').style.background = 'transparent';
  const files = e.dataTransfer.files;
  if (files.length > 0) handlePDFFile(files[0]);
};

document.getElementById('pdfFileInput').onchange = function(e) {
  if (e.target.files.length > 0) handlePDFFile(e.target.files[0]);
};

document.getElementById('pdfImportBtn').onclick = function() {
  if (pdfData) {
    saveDataToStorage(pdfData);
    document.getElementById('dataModal').style.display = 'none';
  }
};

document.getElementById('pdfCancelBtn').onclick = function() {
  document.getElementById('pdfFileInput').value = '';
  document.getElementById('pdfPreview').style.display = 'none';
  document.getElementById('pdfPreview').innerHTML = '';
  document.getElementById('pdfImportBtn').disabled = true;
  pdfData = null;
};
