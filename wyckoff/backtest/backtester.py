"""
Backtesting Framework for Wyckoff-based strategies

Simulates trading with:
- Taiwan stock market rules (T+2 settlement, tick sizes, transaction costs)
- Position sizing based on risk management
- Wyckoff signal-driven entries and exits
"""
from datetime import date, timedelta
from typing import List, Dict, Optional, Callable
from ..data.models import OHLCV, StockData, BacktestTrade, BacktestResult, Signal
from ..engine.wyckoff import WyckoffDetector, effort_vs_result, relative_volume, detect_trend


# Taiwan stock market constants
BROKER_FEE = 0.001425    # 券商手續費 0.1425%
BROKER_DISCOUNT = 0.6     # 常見折讓 6折
TAX_RATE = 0.003          # 證交稅 0.3% (賣出時)
MIN_LOT = 1000            # 1張 = 1000股 (整股交易)


def calc_buy_cost(price: float, shares: int) -> float:
    """Total cost to buy including fees"""
    amount = price * shares
    fee = max(amount * BROKER_FEE * BROKER_DISCOUNT, 20)  # 最低20元
    return amount + fee


def calc_sell_proceeds(price: float, shares: int) -> float:
    """Net proceeds from selling including fees and tax"""
    amount = price * shares
    fee = max(amount * BROKER_FEE * BROKER_DISCOUNT, 20)
    tax = amount * TAX_RATE
    return amount - fee - tax


class WyckoffBacktester:
    """
    Backtester that runs Wyckoff strategies on historical data.
    
    Strategies available:
    1. spring_hunter: Buy springs in accumulation, sell on distribution signals
    2. phase_follower: Buy at start of markup, sell at start of markdown
    3. composite_man: Full Wyckoff analysis with effort/result, springs, upthrusts
    """

    def __init__(self, initial_capital: float = 1_000_000,
                 max_position_pct: float = 0.25,
                 stop_loss_pct: float = 0.07,
                 take_profit_pct: float = 0.20,
                 trailing_stop_pct: float = 0.10):
        self.initial_capital = initial_capital
        self.max_position_pct = max_position_pct  # Max % of capital per trade
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct
        self.trailing_stop_pct = trailing_stop_pct

    def run(self, stock: StockData, strategy: str = 'composite_man',
            start_date: Optional[date] = None, end_date: Optional[date] = None) -> BacktestResult:
        """
        Run a backtest on the given stock data.
        """
        bars = stock.bars
        if start_date:
            bars = [b for b in bars if b.date >= start_date]
        if end_date:
            bars = [b for b in bars if b.date <= end_date]

        if len(bars) < 60:
            return BacktestResult(
                strategy_name=strategy,
                stock_id=stock.stock_id,
                start_date=bars[0].date if bars else date.today(),
                end_date=bars[-1].date if bars else date.today(),
                initial_capital=self.initial_capital,
                final_capital=self.initial_capital,
            )

        if strategy == 'spring_hunter':
            return self._run_spring_hunter(stock, bars)
        elif strategy == 'phase_follower':
            return self._run_phase_follower(stock, bars)
        elif strategy == 'composite_man':
            return self._run_composite_man(stock, bars)
        else:
            raise ValueError(f"Unknown strategy: {strategy}")

    def _run_composite_man(self, stock: StockData, bars: List[OHLCV]) -> BacktestResult:
        """
        Full Wyckoff composite man strategy:
        
        ENTRY (BUY):
        - Spring detected in accumulation phase (strongest signal)
        - Sign of Strength (SOS) after accumulation
        - Last Point of Support (LPS) in markup phase (add to position)
        - Bullish effort/result divergence in accumulation
        
        EXIT (SELL):
        - Upthrust in distribution phase
        - Sign of Weakness (SOW)
        - Stop loss hit
        - Trailing stop hit
        - Take profit reached
        
        POSITION SIZING:
        - Based on risk: position_size = risk_budget / stop_distance
        - Max 25% of capital per position
        """
        capital = self.initial_capital
        trades = []
        position = None  # {entry_price, shares, entry_date, stop_loss, peak_price, reason}

        # We need a rolling window analysis
        detector = WyckoffDetector()
        window_size = 80  # Analysis window

        closes = [b.close for b in bars]
        volumes = [b.volume for b in bars]
        evr_full = effort_vs_result(bars, 20)
        rvol_full = relative_volume(volumes, 20)
        trends = detect_trend(closes, 20)

        for i in range(window_size, len(bars)):
            bar = bars[i]
            prev_bar = bars[i - 1]

            # Run analysis on rolling window
            window_stock = StockData(stock.stock_id, stock.name,
                                     bars=bars[max(0, i - window_size):i + 1])
            analysis = detector.analyze(window_stock)

            current_phase = analysis.get('current_phase', 'unknown')
            recent_signals = analysis.get('signals', [])
            recent_events = analysis.get('events', [])

            evr = evr_full[i] if i < len(evr_full) and isinstance(evr_full[i], dict) else {}
            rvol_val = rvol_full[i] if i < len(rvol_full) else None

            # ── POSITION MANAGEMENT ──
            if position:
                # Update trailing stop
                if bar.high > position['peak_price']:
                    position['peak_price'] = bar.high
                    new_stop = bar.high * (1 - self.trailing_stop_pct)
                    position['stop_loss'] = max(position['stop_loss'], new_stop)

                # Check stop loss
                if bar.low <= position['stop_loss']:
                    exit_price = position['stop_loss']
                    proceeds = calc_sell_proceeds(exit_price, position['shares'])
                    capital += proceeds
                    trades.append(BacktestTrade(
                        stock_id=stock.stock_id,
                        entry_date=position['entry_date'],
                        exit_date=bar.date,
                        entry_price=position['entry_price'],
                        exit_price=exit_price,
                        shares=position['shares'],
                        side='long',
                        signal_reason=f"Stop loss hit ({position['reason']})",
                    ))
                    position = None
                    continue

                # Check take profit
                if bar.high >= position['entry_price'] * (1 + self.take_profit_pct):
                    exit_price = position['entry_price'] * (1 + self.take_profit_pct)
                    proceeds = calc_sell_proceeds(exit_price, position['shares'])
                    capital += proceeds
                    trades.append(BacktestTrade(
                        stock_id=stock.stock_id,
                        entry_date=position['entry_date'],
                        exit_date=bar.date,
                        entry_price=position['entry_price'],
                        exit_price=exit_price,
                        shares=position['shares'],
                        side='long',
                        signal_reason=f"Take profit ({position['reason']})",
                    ))
                    position = None
                    continue

                # Check Wyckoff exit signals
                should_exit = False
                exit_reason = ""

                if current_phase == 'distribution':
                    ut_events = [e for e in recent_events if e.get('type') == 'upthrust']
                    if ut_events:
                        should_exit = True
                        exit_reason = "Upthrust in distribution"

                if current_phase == 'markdown':
                    should_exit = True
                    exit_reason = "Markdown phase detected"

                # SOW: strong close below range support on high volume
                if (evr.get('type') == 'divergence_bearish' and
                        evr.get('score', 0) < -0.5 and
                        current_phase in ('distribution', 'markdown')):
                    should_exit = True
                    exit_reason = "Sign of Weakness (bearish divergence)"

                if should_exit and position:
                    exit_price = bar.close
                    proceeds = calc_sell_proceeds(exit_price, position['shares'])
                    capital += proceeds
                    trades.append(BacktestTrade(
                        stock_id=stock.stock_id,
                        entry_date=position['entry_date'],
                        exit_date=bar.date,
                        entry_price=position['entry_price'],
                        exit_price=exit_price,
                        shares=position['shares'],
                        side='long',
                        signal_reason=f"{exit_reason} ({position['reason']})",
                    ))
                    position = None
                    continue

            # ── ENTRY LOGIC (no position) ──
            elif not position:
                should_buy = False
                buy_reason = ""
                buy_strength = 0.0

                # Signal 1: Spring in accumulation (BEST signal)
                if current_phase == 'accumulation':
                    spring_events = [e for e in recent_events
                                     if e.get('type') == 'spring' and
                                     e.get('bar_index', 0) > len(bars[:i + 1]) - 10]
                    if spring_events:
                        should_buy = True
                        buy_reason = "Spring in accumulation"
                        buy_strength = 0.9

                # Signal 2: Bullish effort/result divergence in accumulation
                if (not should_buy and current_phase == 'accumulation' and
                        evr.get('type') == 'divergence_bullish' and
                        evr.get('score', 0) > 0.4):
                    # Confirm with volume declining
                    if rvol_val and rvol_val < 0.8:
                        should_buy = True
                        buy_reason = "Bullish absorption in accumulation"
                        buy_strength = 0.65

                # Signal 3: LPS in markup (add to winners)
                if (not should_buy and current_phase == 'markup' and
                        evr.get('type') == 'no_supply' and
                        trends[i] == 'up'):
                    should_buy = True
                    buy_reason = "Last Point of Support in markup"
                    buy_strength = 0.6

                if should_buy:
                    # Position sizing based on risk
                    stop_distance = bar.close * self.stop_loss_pct
                    risk_budget = capital * 0.02  # Risk 2% of capital per trade
                    ideal_shares = int(risk_budget / stop_distance)
                    max_shares = int(capital * self.max_position_pct / bar.close)
                    shares = min(ideal_shares, max_shares)
                    shares = max(shares // MIN_LOT * MIN_LOT, MIN_LOT)  # Round to lots

                    cost = calc_buy_cost(bar.close, shares)
                    if cost <= capital:
                        capital -= cost
                        position = {
                            'entry_price': bar.close,
                            'shares': shares,
                            'entry_date': bar.date,
                            'stop_loss': bar.close * (1 - self.stop_loss_pct),
                            'peak_price': bar.close,
                            'reason': buy_reason,
                            'strength': buy_strength,
                        }

        # Close any open position at the end
        if position:
            exit_price = bars[-1].close
            proceeds = calc_sell_proceeds(exit_price, position['shares'])
            capital += proceeds
            trades.append(BacktestTrade(
                stock_id=stock.stock_id,
                entry_date=position['entry_date'],
                exit_date=bars[-1].date,
                entry_price=position['entry_price'],
                exit_price=exit_price,
                shares=position['shares'],
                side='long',
                signal_reason=f"End of period ({position['reason']})",
            ))

        return BacktestResult(
            strategy_name='composite_man',
            stock_id=stock.stock_id,
            start_date=bars[0].date,
            end_date=bars[-1].date,
            initial_capital=self.initial_capital,
            final_capital=capital,
            trades=trades,
        )

    def _run_spring_hunter(self, stock: StockData, bars: List[OHLCV]) -> BacktestResult:
        """
        Simple strategy: only buy on springs, sell on fixed targets.
        Most conservative approach.
        """
        capital = self.initial_capital
        trades = []
        position = None
        detector = WyckoffDetector()
        window_size = 60

        for i in range(window_size, len(bars)):
            bar = bars[i]

            if position:
                # Trailing stop + time-based exit
                if bar.high > position['peak_price']:
                    position['peak_price'] = bar.high
                    position['stop_loss'] = max(
                        position['stop_loss'],
                        bar.high * (1 - self.trailing_stop_pct)
                    )

                holding_days = (bar.date - position['entry_date']).days
                exit_price = None
                exit_reason = ""

                if bar.low <= position['stop_loss']:
                    exit_price = position['stop_loss']
                    exit_reason = "Stop loss"
                elif bar.high >= position['entry_price'] * (1 + self.take_profit_pct):
                    exit_price = position['entry_price'] * (1 + self.take_profit_pct)
                    exit_reason = "Take profit"
                elif holding_days > 60:
                    exit_price = bar.close
                    exit_reason = "Time exit (60 days)"

                if exit_price:
                    capital += calc_sell_proceeds(exit_price, position['shares'])
                    trades.append(BacktestTrade(
                        stock_id=stock.stock_id,
                        entry_date=position['entry_date'],
                        exit_date=bar.date,
                        entry_price=position['entry_price'],
                        exit_price=exit_price,
                        shares=position['shares'],
                        side='long',
                        signal_reason=exit_reason,
                    ))
                    position = None

            elif not position:
                window_stock = StockData(stock.stock_id, stock.name,
                                         bars=bars[max(0, i - window_size):i + 1])
                analysis = detector.analyze(window_stock)

                if analysis.get('current_phase') == 'accumulation':
                    events = analysis.get('events', [])
                    springs = [e for e in events if e.get('type') == 'spring']
                    if springs:
                        shares = min(
                            int(capital * self.max_position_pct / bar.close),
                            int(capital * 0.02 / (bar.close * self.stop_loss_pct))
                        )
                        shares = max(shares // MIN_LOT * MIN_LOT, MIN_LOT)
                        cost = calc_buy_cost(bar.close, shares)
                        if cost <= capital:
                            capital -= cost
                            position = {
                                'entry_price': bar.close,
                                'shares': shares,
                                'entry_date': bar.date,
                                'stop_loss': bar.close * (1 - self.stop_loss_pct),
                                'peak_price': bar.close,
                            }

        if position:
            capital += calc_sell_proceeds(bars[-1].close, position['shares'])
            trades.append(BacktestTrade(
                stock_id=stock.stock_id,
                entry_date=position['entry_date'],
                exit_date=bars[-1].date,
                entry_price=position['entry_price'],
                exit_price=bars[-1].close,
                shares=position['shares'],
                side='long',
                signal_reason="End of period",
            ))

        return BacktestResult(
            strategy_name='spring_hunter',
            stock_id=stock.stock_id,
            start_date=bars[0].date,
            end_date=bars[-1].date,
            initial_capital=self.initial_capital,
            final_capital=capital,
            trades=trades,
        )

    def _run_phase_follower(self, stock: StockData, bars: List[OHLCV]) -> BacktestResult:
        """
        Follow the Wyckoff cycle: buy at accumulation→markup transition,
        sell at distribution→markdown transition.
        """
        capital = self.initial_capital
        trades = []
        position = None
        detector = WyckoffDetector()
        prev_phase = 'unknown'
        window_size = 60

        for i in range(window_size, len(bars)):
            bar = bars[i]
            window_stock = StockData(stock.stock_id, stock.name,
                                     bars=bars[max(0, i - window_size):i + 1])
            analysis = detector.analyze(window_stock)
            current_phase = analysis.get('current_phase', 'unknown')

            if position:
                # Exit on phase transition to distribution or markdown
                if current_phase in ('distribution', 'markdown') and prev_phase in ('markup', 'distribution'):
                    exit_price = bar.close
                    capital += calc_sell_proceeds(exit_price, position['shares'])
                    trades.append(BacktestTrade(
                        stock_id=stock.stock_id,
                        entry_date=position['entry_date'],
                        exit_date=bar.date,
                        entry_price=position['entry_price'],
                        exit_price=exit_price,
                        shares=position['shares'],
                        side='long',
                        signal_reason=f"Phase transition: {prev_phase} → {current_phase}",
                    ))
                    position = None

                # Stop loss
                elif position and bar.low <= position.get('stop_loss', 0):
                    exit_price = position['stop_loss']
                    capital += calc_sell_proceeds(exit_price, position['shares'])
                    trades.append(BacktestTrade(
                        stock_id=stock.stock_id,
                        entry_date=position['entry_date'],
                        exit_date=bar.date,
                        entry_price=position['entry_price'],
                        exit_price=exit_price,
                        shares=position['shares'],
                        side='long',
                        signal_reason="Stop loss",
                    ))
                    position = None

            elif not position:
                # Enter on phase transition from accumulation to markup
                if current_phase == 'markup' and prev_phase == 'accumulation':
                    shares = int(capital * self.max_position_pct / bar.close)
                    shares = max(shares // MIN_LOT * MIN_LOT, MIN_LOT)
                    cost = calc_buy_cost(bar.close, shares)
                    if cost <= capital:
                        capital -= cost
                        position = {
                            'entry_price': bar.close,
                            'shares': shares,
                            'entry_date': bar.date,
                            'stop_loss': bar.close * (1 - self.stop_loss_pct),
                        }

            prev_phase = current_phase

        if position:
            capital += calc_sell_proceeds(bars[-1].close, position['shares'])
            trades.append(BacktestTrade(
                stock_id=stock.stock_id,
                entry_date=position['entry_date'],
                exit_date=bars[-1].date,
                entry_price=position['entry_price'],
                exit_price=bars[-1].close,
                shares=position['shares'],
                side='long',
                signal_reason="End of period",
            ))

        return BacktestResult(
            strategy_name='phase_follower',
            stock_id=stock.stock_id,
            start_date=bars[0].date,
            end_date=bars[-1].date,
            initial_capital=self.initial_capital,
            final_capital=capital,
            trades=trades,
        )
