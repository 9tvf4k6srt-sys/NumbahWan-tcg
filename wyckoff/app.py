"""
Flask API + Dashboard for Wyckoff Trading System
"""
import json
import sys
import os
from datetime import date, datetime
from flask import Flask, render_template, jsonify, request

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from wyckoff.data.collector import load_stock, generate_synthetic_data
from wyckoff.data.models import StockData
from wyckoff.engine.wyckoff import WyckoffDetector, effort_vs_result, relative_volume
from wyckoff.backtest.backtester import WyckoffBacktester

app = Flask(__name__,
            template_folder=os.path.join(os.path.dirname(__file__), 'dashboard', 'templates'),
            static_folder=os.path.join(os.path.dirname(__file__), 'dashboard', 'static'))

# Cache for loaded data
_data_cache = {}


def get_stock(stock_id: str, months: int = 12, use_synthetic: bool = False) -> StockData:
    key = f"{stock_id}_{months}_{use_synthetic}"
    if key not in _data_cache:
        if use_synthetic:
            _data_cache[key] = generate_synthetic_data(stock_id, f"Synthetic {stock_id}", days=months * 21)
        else:
            _data_cache[key] = load_stock(stock_id, months=months)
    return _data_cache[key]


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Run Wyckoff analysis on a stock"""
    data = request.json or {}
    stock_id = data.get('stock_id', '2330')
    months = data.get('months', 12)
    use_synthetic = data.get('synthetic', False)

    try:
        stock = get_stock(stock_id, months, use_synthetic)
        detector = WyckoffDetector()
        result = detector.analyze(stock)
        return jsonify({'status': 'ok', 'data': result})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/backtest', methods=['POST'])
def backtest():
    """Run backtest on a stock"""
    data = request.json or {}
    stock_id = data.get('stock_id', '2330')
    strategy = data.get('strategy', 'composite_man')
    months = data.get('months', 24)
    initial_capital = data.get('capital', 1_000_000)
    use_synthetic = data.get('synthetic', False)
    stop_loss = data.get('stop_loss', 0.07)
    take_profit = data.get('take_profit', 0.20)

    try:
        stock = get_stock(stock_id, months, use_synthetic)
        bt = WyckoffBacktester(
            initial_capital=initial_capital,
            stop_loss_pct=stop_loss,
            take_profit_pct=take_profit,
        )
        result = bt.run(stock, strategy=strategy)

        return jsonify({
            'status': 'ok',
            'summary': result.summary(),
            'trades': [
                {
                    'entry_date': t.entry_date.isoformat(),
                    'exit_date': t.exit_date.isoformat(),
                    'entry_price': round(t.entry_price, 2),
                    'exit_price': round(t.exit_price, 2),
                    'shares': t.shares,
                    'pnl': round(t.pnl, 2),
                    'pnl_pct': f"{t.pnl_pct:.2%}",
                    'holding_days': t.holding_days,
                    'reason': t.signal_reason,
                }
                for t in result.trades
            ],
            'equity_curve': _build_equity_curve(result),
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/chart_data', methods=['POST'])
def chart_data():
    """Get OHLCV + analysis data for charting"""
    data = request.json or {}
    stock_id = data.get('stock_id', '2330')
    months = data.get('months', 12)
    use_synthetic = data.get('synthetic', False)

    try:
        stock = get_stock(stock_id, months, use_synthetic)
        detector = WyckoffDetector()
        analysis = detector.analyze(stock)

        bars_data = [b.to_dict() for b in stock.bars]
        evr = effort_vs_result(stock.bars, 20)
        rvol = relative_volume([b.volume for b in stock.bars], 20)

        return jsonify({
            'status': 'ok',
            'bars': bars_data,
            'phases': analysis.get('phases', []),
            'events': analysis.get('events', []),
            'signals': analysis.get('signals', []),
            'evr': [
                {
                    'date': stock.bars[i].date.isoformat(),
                    'type': e.get('type', 'neutral') if isinstance(e, dict) else 'neutral',
                    'score': e.get('score', 0) if isinstance(e, dict) else 0,
                    'vol_ratio': e.get('vol_ratio', 1) if isinstance(e, dict) else 1,
                }
                for i, e in enumerate(evr) if isinstance(e, dict) and e.get('type', 'neutral') != 'neutral'
            ],
            'rvol': [
                {'date': stock.bars[i].date.isoformat(), 'value': round(v, 2)}
                for i, v in enumerate(rvol) if v is not None
            ],
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500


def _build_equity_curve(result) -> list:
    equity = result.initial_capital
    curve = [{'date': result.start_date.isoformat(), 'equity': equity}]
    for t in result.trades:
        equity += t.pnl
        curve.append({
            'date': t.exit_date.isoformat(),
            'equity': round(equity, 2),
        })
    return curve


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
