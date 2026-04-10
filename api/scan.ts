import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const ALL_COLUMNS = [
    'name', 'description', 'country', 'close', 'change', 'market_cap_basic',
    'price_earnings_ttm', 'earnings_per_share_diluted_yoy_growth_ttm', 
    'dividend_yield_recent', 'sector', 'Recommend.All', 'Perf.W', 
    'price_earnings_growth_ttm', 
    'return_on_equity', 'beta_1_year', 'earnings_release_date', 
    'earnings_release_next_date'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { market = 'america', filters = [], limit = 50, sortBy, sortOrder, exchange } = req.body;
        
        let tvFilters: any[] = [
            { left: 'change', operation: 'nequal', right: 0 },
            { left: 'average_volume_10d_calc', operation: 'greater', right: 25000 },
            { left: 'close', operation: 'greater', right: 0.01 }
        ];
        
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
        
        let uniqueData: any[] = [];
        let seen = new Set();
        for (const item of response.data.data) {
            if (!seen.has(item.d[0])) {
                seen.add(item.d[0]);
                uniqueData.push(item);
            }
        }

        res.status(200).json({ count: response.data.totalCount, data: uniqueData });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}
