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
    const { screener_id, market = 'america', exchange = 'ALL' } = req.query;
    
    let filters: any[] = [{ left: 'change', operation: 'nequal', right: 0 }];
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
