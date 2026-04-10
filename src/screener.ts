import './style.css';

interface TVSymbolData {
    s: string;
    d: any[];
}

interface ScanResponse {
    data: TVSymbolData[];
    count: number;
}

const API_BASE = '/api';

// Metric Column Mapping (TradingView Index)
const COLS = {
    TICKER: 0,
    NAME: 1,
    COUNTRY: 2,
    PRICE: 3,
    CHANGE: 4,
    MARKET_CAP: 5,
    PE: 6,
    EPS_GROWTH: 7,
    DIV_YIELD: 8,
    SECTOR: 9,
    RECOMMENDATION: 10,
    PERF_W: 11,
    PEG: 12,
    ROE: 13,
    BETA: 14,
    EARNINGS_RELEASE: 15,
    EARNINGS_NEXT: 16
};

// Application State
let currentScreener = 'top_gainers';
let exchangeFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Nav Click Handlers
    document.querySelectorAll('.btn-glass, .primary-glow').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).dataset.id;
            if (id) {
                switchScreener(id);
            }
        });
    });

    // Exchange Select
    const exSelect = document.getElementById('exchangeSelect') as HTMLSelectElement;
    if (exSelect) {
        exSelect.addEventListener('change', (e) => {
            exchangeFilter = (e.target as HTMLSelectElement).value;
            refreshData();
        });
    }

    // Custom Button
    const customBtn = document.getElementById('openAdvancedFilter');
    if (customBtn) {
        customBtn.addEventListener('click', openCustomModal);
    }

    // Modal Close
    const closeBtn = document.getElementById('closeFilterModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCustomModal);
    }

    // Default Load
    refreshData();
}

async function switchScreener(id: string) {
    currentScreener = id;
    document.querySelectorAll('.btn-glass').forEach(b => b.classList.remove('active'));
    
    const activeBtn = document.querySelector(`[data-id="${id}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    if (id === 'custom') {
        openCustomModal();
    } else {
        refreshData();
    }
}

async function refreshData() {
    showLoading(true);
    try {
        const url = `${API_BASE}/premade?screener_id=${currentScreener}&exchange=${exchangeFilter}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API returned status ${res.status}`);
        const data: ScanResponse = await res.json();
        if (data && data.data) {
            renderTable(data.data);
            updateStatus(data.count);
        } else {
            throw new Error('Invalid data format received');
        }
    } catch (err) {
        console.error('Data pull failed:', err);
        const statusEl = document.getElementById('statusLine');
        if (statusEl) statusEl.innerText = 'DATA FETCH FAILED - CHECK API';
    } finally {
        showLoading(false);
    }
}

function renderTable(symbols: TVSymbolData[]) {
    const tbody = document.getElementById('resultsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    symbols.forEach(item => {
        const row = document.createElement('tr');
        const d = item.d;
        const change = parseFloat(d[COLS.CHANGE]);
        const changeClass = change >= 0 ? 'up' : 'down';
        const ticker = d[COLS.TICKER].split(':')[1] || d[COLS.TICKER];

        row.innerHTML = `
            <td class="ticker-col">
                ${ticker}
                <a href="https://finance.yahoo.com/quote/${ticker}" target="_blank" class="badge" style="margin-left:8px; text-decoration:none; cursor:pointer;">[News]</a>
            </td>
            <td>${d[COLS.NAME]}</td>
            <td class="${changeClass}">${d[COLS.PRICE].toFixed(2)}</td>
            <td class="${changeClass}">${change.toFixed(2)}%</td>
            <td>${formatMarketCap(d[COLS.MARKET_CAP])}</td>
            <td>${d[COLS.PE]?.toFixed(1) || 'N/A'}</td>
            <td>${d[COLS.EPS_GROWTH]?.toFixed(1)}%</td>
            <td>${d[COLS.DIV_YIELD]?.toFixed(2)}%</td>
            <td>${d[COLS.SECTOR]}</td>
        `;
        tbody.appendChild(row);
    });
}

function formatMarketCap(val: number) {
    if (!val) return 'N/A';
    if (val >= 1e12) return (val / 1e12).toFixed(2) + 'T';
    if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B';
    if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M';
    return val.toLocaleString();
}

function showLoading(show: boolean) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function updateStatus(count: number) {
    const countEl = document.getElementById('countLine');
    if (countEl) countEl.innerText = `${count} ASSETS INDEXED`;
}

function openCustomModal() {
    const modal = document.getElementById('filterModal');
    if (modal) modal.style.display = 'flex';
}

function closeCustomModal() {
    const modal = document.getElementById('filterModal');
    if (modal) modal.style.display = 'none';
}

// Custom Scan Execution
(window as any).runCustomScan = async () => {
    closeCustomModal();
    showLoading(true);
    
    // Collect Filters
    const filters: any[] = [];
    const rows = document.querySelectorAll('.filter-row');
    rows.forEach(row => {
        const fieldInput = row.querySelector('.f-field') as HTMLInputElement;
        if (!fieldInput) return;
        const field = fieldInput.value;
        const premade = row.querySelector('.f-premade') as HTMLSelectElement;
        const customContainer = row.querySelector('.f-custom-group') as HTMLElement;
        const customInput = customContainer?.querySelector('.f-val') as HTMLInputElement;
        const opSelect = customContainer?.querySelector('.f-op') as HTMLSelectElement;

        let val;
        let op = '>';
        if (premade.value === 'custom') {
            val = parseFloat(customInput.value);
            op = opSelect.value;
        } else if (premade.value !== 'any') {
            const parts = premade.value.split('|');
            if (parts.length === 2) {
                op = parts[0];
                val = parseFloat(parts[1]);
            }
        }

        if (val !== undefined && !isNaN(val) && field) {
            filters.push({ field, op: op, value: val });
        }
    });

    try {
        const res = await fetch(`${API_BASE}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filters, exchange: exchangeFilter })
        });
        if (!res.ok) throw new Error(`API returned status ${res.status}`);
        const data = await res.json();
        if (data && data.data) {
            renderTable(data.data);
            updateStatus(data.count);
        } else {
             throw new Error('Invalid data format received');
        }
    } catch (err) {
        console.error('Custom scan error:', err);
        const statusEl = document.getElementById('statusLine');
        if (statusEl) statusEl.innerText = 'CUSTOM SCAN FAILED - CHECK API';
    } finally {
        showLoading(false);
    }
};

(window as any).toggleCustomInput = (select: HTMLSelectElement) => {
    const container = select.parentElement?.querySelector('.f-custom-group') as HTMLElement;
    if (container) {
        container.style.display = select.value === 'custom' ? 'flex' : 'none';
    }
};

// Also attach Custom Scan handler here
document.addEventListener('DOMContentLoaded', () => {
    const execBtn = document.getElementById('executeAdvancedScan');
    if (execBtn) {
        execBtn.addEventListener('click', (window as any).runCustomScan);
    }
    
    // Attach change listeners to predefined selects to toggle custom inputs
    document.querySelectorAll('.f-premade').forEach(sel => {
        sel.addEventListener('change', (e) => {
            (window as any).toggleCustomInput(e.currentTarget as HTMLSelectElement);
        });
    });
});
