const API_BASE = '/api';

const els = {
    countrySelect: document.getElementById('countrySelect'),
    exchangeSelect: document.getElementById('exchangeSelect'),
    premadeBtns: document.querySelectorAll('.btn-glass[data-id]'),
    openAdvancedFilter: document.getElementById('openAdvancedFilter'),
    closeFilterModal: document.getElementById('closeFilterModal'),
    filterModal: document.getElementById('filterModal'),
    executeAdvancedScan: document.getElementById('executeAdvancedScan'),
    
    // Modal elements updated dynamically in executeAdvancedScan

    resultsBody: document.getElementById('resultsBody'),
    tableHeaders: document.getElementById('tableHeaders'),
    statusLine: document.getElementById('statusLine'),
    countLine: document.getElementById('countLine'),
    loadingOverlay: document.getElementById('loadingOverlay')
};

const COLUMNS = [
    { label: 'SYMBOL', key: 'name', tooltip: 'Unique ticker symbol.' },
    { label: 'DESC', key: 'description', hidden: true },
    { label: 'NATION', key: 'country', tooltip: 'ISO Country code.' },
    { label: 'PRICE', key: 'close', tooltip: 'Last traded price.' },
    { label: 'CHG%', key: 'change', tooltip: 'Daily % change (filtered for non-zero).' },
    { label: 'MKT CAP', key: 'market_cap_basic', tooltip: 'Company valuation.' },
    { label: 'P/E', key: 'price_earnings_ttm', tooltip: 'Price-to-Earnings ratio.' },
    { label: 'EPS GROW', key: 'earnings_per_share_diluted_yoy_growth_ttm', tooltip: 'EPS growth YoY.' },
    { label: 'DIV YLD%', key: 'dividend_yield_recent', tooltip: 'Dividend Yield.' },
    { label: 'SECTOR', key: 'sector', tooltip: 'Industrial sector.' },
    { label: 'RATING', key: 'Recommend.All', tooltip: 'Analyst recommendation.' },
    { label: 'PERF% (W)', key: 'Perf.W', tooltip: 'Weekly performance.' },
    { label: 'PEG', key: 'price_earnings_growth_ttm', tooltip: 'P/E to Growth ratio.' },
    { label: 'ROE%', key: 'return_on_equity', tooltip: 'Return on Equity.' },
    { label: 'BETA', key: 'beta_1_year', tooltip: 'Volatility score.' },
    { label: 'LAST EARN', key: 'earnings_release_date', tooltip: 'Most recent earnings.' },
    { label: 'NEXT EARN', key: 'earnings_release_next_date', tooltip: 'Upcoming earnings.' }
];

let currentScreenerId = 'top_gainers';

const MARKET_EXCHANGES = {
    'america': ['ALL EXCHANGES|ALL', 'NYSE|NYSE', 'NASDAQ|NASDAQ', 'AMEX|AMEX', 'OTC|OTC'],
    'uk': ['ALL EXCHANGES|ALL', 'LSE|LSE'],
    'canada': ['ALL EXCHANGES|ALL', 'TSX|TSX', 'TSXV|TSXV', 'CSE|CSE'],
    'germany': ['ALL EXCHANGES|ALL', 'XETR|XETR', 'FWB|FWB'],
    'france': ['ALL EXCHANGES|ALL', 'EURONEXT|EURONEXT'],
    'japan': ['ALL EXCHANGES|ALL', 'TSE|TSE'],
    'india': ['ALL EXCHANGES|ALL', 'NSE|NSE', 'BSE|BSE']
};

document.addEventListener('DOMContentLoaded', () => {
    initTableHeaders();
    updateExchanges();
    fetchScreener(currentScreenerId);
});

function initTableHeaders() {
    els.tableHeaders.innerHTML = COLUMNS.filter(c => !c.hidden).map(col => `
        <th>
            <div class="th-content">
                ${col.label}
                <span class="tooltip-icon" data-tooltip="${col.tooltip}">?</span>
            </div>
        </th>
    `).join('');
}

function updateExchanges() {
    const market = els.countrySelect.value;
    const exchanges = MARKET_EXCHANGES[market] || ['ALL EXCHANGES|ALL'];
    
    // Default America to NYSE as per user request, others to ALL
    let defaultExc = market === 'america' ? 'NYSE' : 'ALL';
    
    els.exchangeSelect.innerHTML = exchanges.map(ex => {
        const [label, val] = ex.split('|');
        return `<option value="${val}" ${val === defaultExc ? 'selected' : ''}>${label}</option>`;
    }).join('');
}

// Global UI Events
els.premadeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        els.premadeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentScreenerId = btn.dataset.id;
        fetchScreener(currentScreenerId);
    });
});

els.countrySelect.addEventListener('change', () => {
    updateExchanges();
    fetchScreener(currentScreenerId);
});

els.exchangeSelect.addEventListener('change', () => fetchScreener(currentScreenerId));

// Removed old filterValType listener

els.openAdvancedFilter.addEventListener('click', () => {
    els.filterModal.style.display = 'flex';
});

// Setup dynamic dropdown toggles
document.querySelectorAll('.f-premade').forEach(sel => {
    sel.addEventListener('change', (e) => {
        const row = e.target.closest('.filter-row');
        const customGrp = row.querySelector('.f-custom-group');
        if (e.target.value === 'custom') {
            customGrp.style.display = 'flex';
        } else {
            customGrp.style.display = 'none';
        }
    });
});

els.closeFilterModal.addEventListener('click', () => {
    els.filterModal.style.display = 'none';
});

els.executeAdvancedScan.addEventListener('click', () => {
    els.filterModal.style.display = 'none';
    executeAdvancedScan();
});

async function fetchScreener(id) {
    showLoading(true);
    const market = els.countrySelect.value;
    const exchange = els.exchangeSelect.value;
    els.statusLine.innerText = `SYNCING TELEMETRY: ${market.toUpperCase()} // ${exchange}`;
    
    try {
        const response = await fetch(`${API_BASE}/premade/${id}?market=${market}&exchange=${exchange}`);
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        renderTable(result.data);
        els.countLine.innerText = `${result.count || 0} DATASETS`;
    } catch (err) {
        console.error('Fetch Error:', err);
        showError('LINK_FAILURE');
    } finally {
        showLoading(false);
    }
}

async function executeAdvancedScan() {
    showLoading(true);
    const market = els.countrySelect.value;
    const exchange = els.exchangeSelect.value;
    
    const filterRows = document.querySelectorAll('.filter-row');
    const filters = [];

    filterRows.forEach(row => {
        const field = row.querySelector('.f-field').value;
        const premade = row.querySelector('.f-premade').value;
        
        if (premade === 'any') return;
        
        let op, val;
        if (premade === 'custom') {
            op = row.querySelector('.f-op').value;
            const valStr = row.querySelector('.f-val').value;
            if (valStr.trim() === '') return;
            val = parseFloat(valStr) || 0;
        } else {
            const parts = premade.split('|');
            op = parts[0];
            val = parseFloat(parts[1]) || 0;
        }
        
        filters.push({ field, op, value: val });
    });

    els.statusLine.innerText = `ADVANCED INJECTION: ${market.toUpperCase()}`;

    try {
        const response = await fetch(`${API_BASE}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ market, exchange, filters, limit: 100 })
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        renderTable(result.data);
        els.countLine.innerText = `${result.count || 0} DATASETS`;
    } catch (err) {
        console.error('Scan Error:', err);
        showError('INJECTION_DENIED');
    } finally {
        showLoading(false);
    }
}

function renderTable(data) {
    els.resultsBody.innerHTML = '';
    
    if (!data || data.length === 0) {
        els.resultsBody.innerHTML = `<tr><td colspan="${COLUMNS.length}" style="text-align: center; padding: 4rem; color: var(--text-muted);">NULL_SET_RETURNED</td></tr>`;
        return;
    }

    data.forEach(item => {
        const rowData = item.d;
        const tr = document.createElement('tr');
        
        tr.innerHTML = COLUMNS.map((col, idx) => {
            if (col.hidden) return ''; // Skip rendering description as a column
            
            let val = rowData[idx];
            let className = '';
            
            if (val === null || val === undefined) return `<td>—</td>`;
            const numVal = parseFloat(val);

            if (col.key === 'name') {
                className = 'ticker-col';
                // rowData[1] is the description column
                const tooltipHtml = rowData[1] ? `title="${rowData[1]}"` : '';
                return `<td class="${className}" ${tooltipHtml}>
                            ${val} 
                            <a href="https://finance.yahoo.com/quote/${val}" target="_blank" style="font-size: 0.7rem; color: var(--accent-blue); text-decoration: none; margin-left: 5px;" title="View on Yahoo Finance">[News]</a>
                        </td>`;
            }
            
            const pctCols = ['change', 'Perf.W', 'earnings_per_share_diluted_yoy_growth_ttm', 'return_on_equity', 'dividend_yield_recent'];
            if (pctCols.includes(col.key)) {
                if (!isNaN(numVal)) {
                    if (numVal > 0) className = 'up';
                    if (numVal < 0) className = 'down';
                    val = formatPct(numVal);
                } else { val = '—'; }
            }
            else if (col.key === 'close') val = !isNaN(numVal) ? formatCurrency(numVal) : '—';
            else if (col.key === 'market_cap_basic') val = !isNaN(numVal) ? formatCompact(numVal) : '—';
            else if (['price_earnings_ttm', 'price_earnings_growth_ttm', 'beta_1_year'].includes(col.key)) val = !isNaN(numVal) ? formatDecimal(numVal) : '—';
            else if (['earnings_release_date', 'earnings_release_next_date'].includes(col.key)) val = (numVal && numVal > 0) ? formatDate(numVal) : '—';
            else if (col.key === 'Recommend.All') val = !isNaN(numVal) ? formatRating(numVal) : '—';

            return `<td class="${className}">${val}</td>`;
        }).join('');
        
        els.resultsBody.appendChild(tr);
    });
}

function formatPct(num) { return (num >= 0 ? '+' : '') + num.toFixed(2) + '%'; }
function formatCurrency(num) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num); }
function formatCompact(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toFixed(2);
}
function formatDecimal(num) { return num.toFixed(2); }
function formatDate(sec) {
    const d = new Date(sec * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}
function formatRating(num) {
    if (num > 0.5) return 'STR_BUY';
    if (num > 0.1) return 'BUY';
    if (num > -0.1) return 'NEUTRAL';
    if (num > -0.5) return 'SELL';
    return 'STR_SELL';
}
function showLoading(show) { els.loadingOverlay.style.display = show ? 'flex' : 'none'; }
function showError(msg) {
    els.statusLine.innerText = `[!] ${msg}`;
    els.statusLine.style.color = 'var(--danger)';
    setTimeout(() => { els.statusLine.style.color = ''; }, 3000);
}
