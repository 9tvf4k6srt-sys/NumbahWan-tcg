"""
Taiwan Stock Exchange data collector
Fetches: daily OHLCV, institutional trading, margin data from TWSE/TPEX APIs
"""
import requests
import time
import json
import os
import pandas as pd
import numpy as np
from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple
from ..data.models import OHLCV, InstitutionalFlow, MarginData, StockData

# Cache directory
CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
}


def _cache_path(key: str) -> str:
    return os.path.join(CACHE_DIR, f"{key}.json")


def _read_cache(key: str, max_age_hours: int = 20) -> Optional[dict]:
    path = _cache_path(key)
    if not os.path.exists(path):
        return None
    mtime = os.path.getmtime(path)
    age_hours = (time.time() - mtime) / 3600
    if age_hours > max_age_hours:
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def _write_cache(key: str, data: dict):
    with open(_cache_path(key), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)


def _safe_float(s: str) -> float:
    """Parse TWSE number strings (with commas, dashes, etc)"""
    if not s or s in ('--', '-', 'N/A', ''):
        return 0.0
    try:
        return float(str(s).replace(',', '').replace(' ', ''))
    except (ValueError, TypeError):
        return 0.0


def _safe_int(s: str) -> int:
    return int(_safe_float(s))


def fetch_twse_daily(stock_id: str, year: int, month: int) -> List[OHLCV]:
    """
    Fetch monthly daily OHLCV from TWSE for a listed stock.
    API: https://www.twse.com.tw/exchangeReport/STOCK_DAY
    """
    cache_key = f"twse_daily_{stock_id}_{year}_{month:02d}"
    cached = _read_cache(cache_key, max_age_hours=48)

    if not cached:
        url = 'https://www.twse.com.tw/exchangeReport/STOCK_DAY'
        params = {
            'response': 'json',
            'date': f'{year}{month:02d}01',
            'stockNo': stock_id,
        }
        try:
            r = requests.get(url, params=params, headers=HEADERS, timeout=15)
            r.raise_for_status()
            cached = r.json()
            if cached.get('stat') == 'OK':
                _write_cache(cache_key, cached)
            time.sleep(0.5)  # rate limit
        except Exception as e:
            print(f"[TWSE] Error fetching {stock_id} {year}/{month}: {e}")
            return []

    if not cached or cached.get('stat') != 'OK':
        return []

    bars = []
    for row in cached.get('data', []):
        try:
            # Date format: 114/01/02 (ROC year)
            parts = row[0].strip().split('/')
            roc_year = int(parts[0])
            m = int(parts[1])
            d = int(parts[2])
            dt = date(roc_year + 1911, m, d)

            bars.append(OHLCV(
                date=dt,
                open=_safe_float(row[3]),
                high=_safe_float(row[4]),
                low=_safe_float(row[5]),
                close=_safe_float(row[6]),
                volume=_safe_int(row[1]),    # 成交股數
                turnover=_safe_float(row[2]), # 成交金額
                trades=_safe_int(row[8]),     # 成交筆數
            ))
        except (IndexError, ValueError) as e:
            continue

    return bars


def fetch_tpex_daily(stock_id: str, year: int, month: int) -> List[OHLCV]:
    """
    Fetch monthly daily OHLCV from TPEX (OTC market) for an OTC stock.
    API: https://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_result.php
    """
    cache_key = f"tpex_daily_{stock_id}_{year}_{month:02d}"
    cached = _read_cache(cache_key, max_age_hours=48)

    roc_year = year - 1911

    if not cached:
        url = 'https://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_result.php'
        params = {
            'l': 'zh-tw',
            'd': f'{roc_year}/{month:02d}',
            'stkno': stock_id,
        }
        try:
            r = requests.get(url, params=params, headers=HEADERS, timeout=15)
            r.raise_for_status()
            cached = r.json()
            if cached.get('aaData'):
                _write_cache(cache_key, cached)
            time.sleep(0.5)
        except Exception as e:
            print(f"[TPEX] Error fetching {stock_id} {year}/{month}: {e}")
            return []

    if not cached or not cached.get('aaData'):
        return []

    bars = []
    for row in cached['aaData']:
        try:
            parts = row[0].strip().split('/')
            roc_y = int(parts[0])
            m = int(parts[1])
            d = int(parts[2])
            dt = date(roc_y + 1911, m, d)

            bars.append(OHLCV(
                date=dt,
                open=_safe_float(row[3]),
                high=_safe_float(row[4]),
                low=_safe_float(row[5]),
                close=_safe_float(row[6]),
                volume=_safe_int(row[1]),
                turnover=_safe_float(row[2]),
                trades=_safe_int(row[8]) if len(row) > 8 else 0,
            ))
        except (IndexError, ValueError):
            continue

    return bars


def fetch_institutional(stock_id: str, start: date, end: date) -> List[InstitutionalFlow]:
    """
    Fetch institutional (法人) buy/sell data.
    API: https://www.twse.com.tw/fund/T86
    We fetch month by month.
    """
    flows = []
    current = start.replace(day=1)

    while current <= end:
        cache_key = f"inst_{stock_id}_{current.year}_{current.month:02d}"
        cached = _read_cache(cache_key, max_age_hours=48)

        if not cached:
            url = 'https://www.twse.com.tw/fund/T86'
            params = {
                'response': 'json',
                'date': f'{current.year}{current.month:02d}01',
                'selectType': 'ALLBUT0999',
            }
            try:
                r = requests.get(url, params=params, headers=HEADERS, timeout=15)
                r.raise_for_status()
                cached = r.json()
                if cached.get('stat') == 'OK':
                    _write_cache(cache_key, cached)
                time.sleep(0.8)
            except Exception as e:
                print(f"[INST] Error fetching {current.year}/{current.month}: {e}")
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)
                continue

        if cached and cached.get('stat') == 'OK':
            for row in cached.get('data', []):
                try:
                    sid = row[0].strip()
                    if sid != stock_id:
                        continue
                    # Parse date from the response context
                    flow = InstitutionalFlow(
                        date=current,  # Approximate — daily data requires different endpoint
                        stock_id=stock_id,
                        foreign_buy=_safe_int(row[2]),
                        foreign_sell=_safe_int(row[3]),
                        trust_buy=_safe_int(row[5]),
                        trust_sell=_safe_int(row[6]),
                        dealer_buy=_safe_int(row[8]),
                        dealer_sell=_safe_int(row[9]),
                    )
                    flows.append(flow)
                except (IndexError, ValueError):
                    continue

        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

    return flows


def fetch_margin_data(stock_id: str, start: date, end: date) -> List[MarginData]:
    """
    Fetch margin trading data (融資融券).
    API: https://www.twse.com.tw/exchangeReport/MI_MARGN
    """
    margins = []
    current = start.replace(day=1)

    while current <= end:
        cache_key = f"margin_{current.year}_{current.month:02d}"
        cached = _read_cache(cache_key, max_age_hours=48)

        if not cached:
            url = 'https://www.twse.com.tw/exchangeReport/MI_MARGN'
            params = {
                'response': 'json',
                'date': f'{current.year}{current.month:02d}01',
                'selectType': 'STOCK',
            }
            try:
                r = requests.get(url, params=params, headers=HEADERS, timeout=15)
                r.raise_for_status()
                cached = r.json()
                if cached.get('stat') == 'OK':
                    _write_cache(cache_key, cached)
                time.sleep(0.8)
            except Exception as e:
                print(f"[MARGIN] Error fetching {current.year}/{current.month}: {e}")
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)
                continue

        # Parse margins (structure varies by endpoint)
        if cached and cached.get('stat') == 'OK':
            for row in cached.get('data', []):
                try:
                    sid = row[0].strip()
                    if sid != stock_id:
                        continue
                    m = MarginData(
                        date=current,
                        stock_id=stock_id,
                        margin_buy=_safe_int(row[2]),
                        margin_sell=_safe_int(row[3]),
                        margin_balance=_safe_int(row[6]),
                        short_sell=_safe_int(row[8]),
                        short_cover=_safe_int(row[9]),
                        short_balance=_safe_int(row[12]) if len(row) > 12 else 0,
                    )
                    margins.append(m)
                except (IndexError, ValueError):
                    continue

        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

    return margins


def load_stock(stock_id: str, name: str = '', months: int = 12,
               end_date: Optional[date] = None, is_otc: bool = False) -> StockData:
    """
    Load complete stock data for analysis.
    Fetches OHLCV for the specified number of months.
    """
    if end_date is None:
        end_date = date.today()

    start_date = end_date - timedelta(days=months * 31)
    stock = StockData(stock_id=stock_id, name=name or stock_id)

    # Fetch OHLCV month by month
    current = start_date.replace(day=1)
    all_bars = []
    fetch_fn = fetch_tpex_daily if is_otc else fetch_twse_daily

    while current <= end_date:
        bars = fetch_fn(stock_id, current.year, current.month)
        all_bars.extend(bars)
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

    # Deduplicate and sort
    seen = set()
    for b in all_bars:
        key = b.date.isoformat()
        if key not in seen:
            seen.add(key)
            stock.bars.append(b)
    stock.bars.sort(key=lambda b: b.date)

    # Filter to requested range
    stock.bars = [b for b in stock.bars if start_date <= b.date <= end_date]

    print(f"[DATA] Loaded {stock_id}: {len(stock.bars)} bars "
          f"({stock.bars[0].date if stock.bars else 'N/A'} to "
          f"{stock.bars[-1].date if stock.bars else 'N/A'})")

    return stock


def generate_synthetic_data(stock_id: str = 'SYN001', name: str = 'Synthetic',
                            days: int = 500, seed: int = 42) -> StockData:
    """
    Generate realistic synthetic stock data with embedded Wyckoff patterns.
    Useful for testing the engine without API calls.
    Embeds: Accumulation → Markup → Distribution → Markdown cycle.
    """
    np.random.seed(seed)
    stock = StockData(stock_id=stock_id, name=name)

    # Design a Wyckoff cycle into the data
    # Phase 1: Accumulation (days 0-120) — sideways with volume patterns
    # Phase 2: Markup (days 120-250) — trending up
    # Phase 3: Distribution (days 250-380) — sideways at top
    # Phase 4: Markdown (days 380-500) — trending down

    base_price = 100.0
    price = base_price
    bars = []
    start = date(2024, 1, 2)

    for i in range(days):
        dt = start + timedelta(days=int(i * 365 / 250))  # ~250 trading days/year
        # Skip weekends approximately
        while dt.weekday() >= 5:
            dt += timedelta(days=1)

        phase_pct = i / days

        if phase_pct < 0.24:
            # ACCUMULATION: slight downtrend then sideways
            sub_pct = i / (days * 0.24)
            if sub_pct < 0.15:
                # PS (Preliminary Support) — first big drop
                drift = -0.003
                vol_mult = 2.5
            elif sub_pct < 0.25:
                # SC (Selling Climax) — sharp drop, huge volume
                drift = -0.008
                vol_mult = 4.0
            elif sub_pct < 0.35:
                # AR (Automatic Rally) — bounce
                drift = 0.005
                vol_mult = 2.0
            elif sub_pct < 0.55:
                # ST (Secondary Test) — retest low, LESS volume
                drift = -0.002
                vol_mult = 1.2
            elif sub_pct < 0.75:
                # Accumulation range — tight, low volume
                drift = 0.0005
                vol_mult = 0.8
            else:
                # Spring — brief dip below range then strong close
                if sub_pct < 0.82:
                    drift = -0.004
                    vol_mult = 1.5
                else:
                    drift = 0.004
                    vol_mult = 2.0

        elif phase_pct < 0.50:
            # MARKUP: steady uptrend with rising volume
            drift = 0.004
            vol_mult = 1.5 + (phase_pct - 0.24) * 2

        elif phase_pct < 0.76:
            # DISTRIBUTION: sideways at top, high volume
            sub_pct = (phase_pct - 0.50) / 0.26
            if sub_pct < 0.2:
                # PSY (Preliminary Supply)
                drift = 0.001
                vol_mult = 2.5
            elif sub_pct < 0.35:
                # BC (Buying Climax)
                drift = 0.002
                vol_mult = 4.0
            elif sub_pct < 0.5:
                # AR (Automatic Reaction)
                drift = -0.003
                vol_mult = 2.0
            elif sub_pct < 0.7:
                # ST (Secondary Test) — fails to exceed BC high
                drift = 0.001
                vol_mult = 1.5
            elif sub_pct < 0.85:
                # UTAD (Upthrust After Distribution) — false breakout
                drift = 0.003 if sub_pct < 0.78 else -0.005
                vol_mult = 3.0
            else:
                # SOW (Sign of Weakness)
                drift = -0.004
                vol_mult = 2.5

        else:
            # MARKDOWN: downtrend
            drift = -0.004
            vol_mult = 1.3

        # Generate OHLCV
        noise = np.random.normal(0, 0.012)
        change = drift + noise
        price *= (1 + change)
        price = max(price, 10)  # floor

        spread = price * abs(np.random.normal(0.015, 0.005))
        o = price * (1 + np.random.normal(0, 0.003))
        h = max(o, price) + spread * np.random.random()
        l = min(o, price) - spread * np.random.random()
        c = price

        base_vol = 5000
        vol = int(base_vol * vol_mult * (0.5 + np.random.random()))

        bars.append(OHLCV(
            date=dt,
            open=round(o, 2),
            high=round(h, 2),
            low=round(l, 2),
            close=round(c, 2),
            volume=vol,
            turnover=round(c * vol, 0),
            trades=int(vol * 0.3),
        ))

    # Deduplicate dates
    seen = set()
    for b in bars:
        if b.date not in seen:
            seen.add(b.date)
            stock.bars.append(b)

    stock.bars.sort(key=lambda b: b.date)
    print(f"[SYNTH] Generated {stock_id}: {len(stock.bars)} bars with Wyckoff cycle embedded")
    return stock
