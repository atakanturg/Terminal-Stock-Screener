import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

const ALL_COLUMNS = [
    'name', 'description', 'country', 'close', 'change', 'market_cap_basic',
    'price_earnings_ttm', 'earnings_per_share_diluted_yoy_growth_ttm', 
    'dividend_yield_recent', 'sector', 'Recommend.All', 'Perf.W', 
    'price_earnings_growth_ttm', 
    'return_on_equity', 'beta_1_year', 'earnings_release_date', 
    'earnings_release_next_date'
];

app.get('/api/health', (req, res) => {
    res.json({ status: 'online', message: 'Terminal-X Node Backend Operational' });
});

app.post('/api/scan', async (req, res) => {
    try {
        const { market = 'america', filters = [], limit = 50, sortBy, sortOrder, exchange } = req.body;
        let tvFilters = [{ left: 'change', operation: 'nequal', right: 0 }];
        if (exchange && exchange !== 'ALL') {
            tvFilters.push({ left: 'exchange', operation: 'equal', right: exchange });
        }
        filters.forEach((f: any) => {
            let tvOp = 'equal';
            if (f.op === '>') tvOp = 'greater';
            if (f.op === '>=') tvOp = 'egreater';
            if (f.op === '<') tvOp = 'less';
            if (f.op === '<=') tvOp = 'eless';
            if (f.op === '!=') tvOp = 'nequal';
            tvFilters.push({ left: f.field, operation: tvOp, right: f.value });
        });
        const payload = {
            filter: tvFilters,
            options: { lang: 'en' },
            markets: [market],
            symbols: { query: { types: [] }, tickers: [] },
            columns: ALL_COLUMNS,
            sort: sortBy ? { sortBy, sortOrder: sortOrder || 'desc' } : undefined,
            range: [0, limit]
        };
        const response = await axios.post(`https://scanner.tradingview.com/${market}/scan`, payload);
        let uniqueData = [];
        let seen = new Set();
        for (const item of response.data.data) {
            if (!seen.has(item.d[0])) {
                seen.add(item.d[0]);
                uniqueData.push(item);
            }
        }
        res.json({ count: response.data.totalCount, data: uniqueData });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/premade/:screener_id', async (req, res) => {
    const { screener_id } = req.params;
    const { market = 'america', exchange = 'ALL' } = req.query;
    let filters = [{ left: 'change', operation: 'nequal', right: 0 }];
    if (exchange !== 'ALL') {
        filters.push({ left: 'exchange', operation: 'equal', right: exchange });
    }
    let sort = { sortBy: 'change', sortOrder: 'desc' };
    
    if (screener_id === 'top_gainers') {
        filters.push({ left: 'change', operation: 'egreater', right: 5 }, { left: 'close', operation: 'greater', right: 5 });
    } else if (screener_id === 'high_volume') {
        filters.push({ left: 'volume', operation: 'greater', right: 1000000 });
        sort = { sortBy: 'volume', sortOrder: 'desc' };
    } else if (screener_id === 'oversold') {
        filters.push({ left: 'RSI', operation: 'less', right: 30 });
        sort = { sortBy: 'RSI', sortOrder: 'asc' };
    } else if (screener_id === 'growth_blue_chips') {
        filters.push({ left: 'market_cap_basic', operation: 'greater', right: 10000000000 }, { left: 'net_income', operation: 'greater', right: 0 });
        sort = { sortBy: 'market_cap_basic', sortOrder: 'desc' };
    } else {
        return res.status(404).json({ error: 'Screener not found' });
    }

    try {
        const payload = {
            filter: filters,
            options: { lang: 'en' },
            markets: [market],
            symbols: { query: { types: [] }, tickers: [] },
            columns: ALL_COLUMNS,
            sort: sort,
            range: [0, 50]
        };
        const response = await axios.post(`https://scanner.tradingview.com/${market}/scan`, payload);
        let uniqueData = [];
        let seen = new Set();
        for (const item of response.data.data) {
            if (!seen.has(item.d[0])) {
                seen.add(item.d[0]);
                uniqueData.push(item);
            }
        }
        res.json({ count: response.data.totalCount, data: uniqueData });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

if (process.env.NODE_ENV !== 'production' || process.env.LOCAL_DEV) {
    const PORT = 8000;
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

export default app;
