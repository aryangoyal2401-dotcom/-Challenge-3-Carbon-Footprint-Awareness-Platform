/**
 * Chart.js Configuration and Creation Functions
 * Dark theme charts with glassmorphism styling
 */

// Store chart instances for cleanup
const chartInstances = {};

// Set Chart.js global defaults for dark theme
function setGlobalDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17, 24, 39, 0.95)';
  Chart.defaults.plugins.tooltip.titleColor = '#f1f5f9';
  Chart.defaults.plugins.tooltip.bodyColor = '#94a3b8';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.cornerRadius = 12;
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.displayColors = true;
  Chart.defaults.plugins.tooltip.boxPadding = 4;
  Chart.defaults.animation.duration = 800;
  Chart.defaults.animation.easing = 'easeOutQuart';
  Chart.defaults.responsive = true;
  Chart.defaults.maintainAspectRatio = false;
}

setGlobalDefaults();

export function createCategoryDonut(canvasId, data) {
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const categoryColors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
  const categoryLabels = data.labels || ['Transportation', 'Food', 'Energy', 'Shopping'];
  const categoryValues = data.values || [0, 0, 0, 0];

  const hasData = categoryValues.some(v => v > 0);

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categoryLabels,
      datasets: [{
        data: hasData ? categoryValues : [1],
        backgroundColor: hasData ? categoryColors : ['rgba(255,255,255,0.05)'],
        borderColor: hasData ? categoryColors.map(c => c + '80') : ['rgba(255,255,255,0.1)'],
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      cutout: '70%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 11, weight: '500' }
          }
        },
        tooltip: {
          enabled: hasData,
          callbacks: {
            label: function (context) {
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${context.label}: ${value.toFixed(1)} kg CO₂ (${percentage}%)`;
            }
          }
        }
      }
    },
    plugins: [{
      id: 'centerText',
      afterDraw: function (chart) {
        if (!hasData) {
          const { ctx: context, width, height } = chart;
          context.save();
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillStyle = '#64748b';
          context.font = "500 14px 'Inter', sans-serif";
          context.fillText('No data yet', width / 2, height / 2);
          context.restore();
        }
      }
    }]
  });

  chartInstances[canvasId] = chart;
  return chart;
}

export function createWeeklyTrend(canvasId, data) {
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const labels = data.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const values = data.values || [0, 0, 0, 0, 0, 0, 0];

  const gradientFill = ctx.createLinearGradient(0, 0, 0, 260);
  gradientFill.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
  gradientFill.addColorStop(0.5, 'rgba(16, 185, 129, 0.1)');
  gradientFill.addColorStop(1, 'rgba(16, 185, 129, 0)');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'CO₂ Emissions (kg)',
        data: values,
        borderColor: '#10b981',
        backgroundColor: gradientFill,
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#0a0f1a',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#10b981',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }]
    },
    options: {
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.04)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 11, weight: '500' }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.04)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 11 },
            callback: function (value) {
              return value + ' kg';
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return ` ${context.parsed.y.toFixed(1)} kg CO₂`;
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });

  chartInstances[canvasId] = chart;
  return chart;
}

export function createComparisonBar(canvasId, userData, nationalAvg, globalAvg, netZeroTarget) {
  destroyChart(canvasId);

  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const labels = ['You', 'National Avg', 'Global Avg', 'Net-Zero Target'];
  const values = [
    userData || 0,
    nationalAvg || 4500,
    globalAvg || 4700,
    netZeroTarget || 2000
  ];

  const colors = [
    '#10b981',
    '#3b82f6',
    '#f59e0b',
    '#06b6d4'
  ];

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Annual CO₂ (kg)',
        data: values,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 40,
        hoverBackgroundColor: colors
      }]
    },
    options: {
      indexAxis: 'y',
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.04)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 11 },
            callback: function (value) {
              if (value >= 1000) return (value / 1000).toFixed(1) + 't';
              return value + ' kg';
            }
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 12, weight: '500' }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.parsed.x;
              if (val >= 1000) return ` ${(val / 1000).toFixed(1)} tonnes CO₂/year`;
              return ` ${val.toFixed(0)} kg CO₂/year`;
            }
          }
        }
      }
    }
  });

  chartInstances[canvasId] = chart;
  return chart;
}

export function updateChart(canvasId, newData) {
  const chart = chartInstances[canvasId];
  if (!chart) return;

  if (newData.labels) {
    chart.data.labels = newData.labels;
  }
  if (newData.values) {
    chart.data.datasets[0].data = newData.values;
  }

  chart.update('active');
}

export function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}
