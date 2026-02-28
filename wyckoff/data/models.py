"""
Data models for Taiwan Stock Market analysis
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List, Optional, Dict
import json


@dataclass
class OHLCV:
    """Single candlestick bar"""
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: int
    turnover: float = 0.0  # 成交金額
    trades: int = 0         # 成交筆數

    @property
    def spread(self) -> float:
        """Price spread (range)"""
        return self.high - self.low

    @property
    def body(self) -> float:
        """Candle body size (absolute)"""
        return abs(self.close - self.open)

    @property
    def is_up(self) -> bool:
        return self.close >= self.open

    @property
    def close_position(self) -> float:
        """Where close sits within the bar's range (0=low, 1=high)"""
        if self.spread == 0:
            return 0.5
        return (self.close - self.low) / self.spread

    def to_dict(self):
        return {
            'date': self.date.isoformat(),
            'open': self.open,
            'high': self.high,
            'low': self.low,
            'close': self.close,
            'volume': self.volume,
            'turnover': self.turnover,
            'trades': self.trades,
        }


@dataclass
class InstitutionalFlow:
    """法人買賣超"""
    date: date
    stock_id: str
    foreign_buy: int = 0      # 外資買超(張)
    foreign_sell: int = 0
    trust_buy: int = 0        # 投信買超
    trust_sell: int = 0
    dealer_buy: int = 0       # 自營商買超
    dealer_sell: int = 0

    @property
    def foreign_net(self) -> int:
        return self.foreign_buy - self.foreign_sell

    @property
    def trust_net(self) -> int:
        return self.trust_buy - self.trust_sell

    @property
    def dealer_net(self) -> int:
        return self.dealer_buy - self.dealer_sell

    @property
    def total_institutional_net(self) -> int:
        return self.foreign_net + self.trust_net + self.dealer_net


@dataclass
class MarginData:
    """融資融券 — 散戶槓桿指標"""
    date: date
    stock_id: str
    margin_buy: int = 0       # 融資買進
    margin_sell: int = 0      # 融資賣出
    margin_balance: int = 0   # 融資餘額
    short_sell: int = 0       # 融券賣出
    short_cover: int = 0      # 融券回補
    short_balance: int = 0    # 融券餘額

    @property
    def margin_net(self) -> int:
        return self.margin_buy - self.margin_sell

    @property
    def short_net(self) -> int:
        return self.short_sell - self.short_cover


@dataclass
class StockData:
    """Complete dataset for a single stock"""
    stock_id: str
    name: str
    bars: List[OHLCV] = field(default_factory=list)
    institutional: List[InstitutionalFlow] = field(default_factory=list)
    margin: List[MarginData] = field(default_factory=list)

    def get_closes(self) -> List[float]:
        return [b.close for b in self.bars]

    def get_volumes(self) -> List[int]:
        return [b.volume for b in self.bars]

    def get_dates(self) -> List[date]:
        return [b.date for b in self.bars]

    def slice(self, start: date, end: date) -> 'StockData':
        """Get a date-range subset"""
        sd = StockData(self.stock_id, self.name)
        sd.bars = [b for b in self.bars if start <= b.date <= end]
        sd.institutional = [i for i in self.institutional if start <= i.date <= end]
        sd.margin = [m for m in self.margin if start <= m.date <= end]
        return sd


@dataclass
class WyckoffPhase:
    """Detected Wyckoff phase for a date range"""
    phase: str          # 'accumulation' | 'markup' | 'distribution' | 'markdown' | 'unknown'
    sub_phase: str      # e.g. 'PS', 'SC', 'AR', 'ST', 'Spring', 'SOS', 'LPS', 'BU'
    start_date: date
    end_date: date
    confidence: float   # 0.0 - 1.0
    evidence: Dict[str, float] = field(default_factory=dict)
    notes: str = ""

    def to_dict(self):
        return {
            'phase': self.phase,
            'sub_phase': self.sub_phase,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'confidence': round(self.confidence, 3),
            'evidence': self.evidence,
            'notes': self.notes,
        }


@dataclass
class Signal:
    """Trading signal from the Wyckoff engine"""
    date: date
    stock_id: str
    action: str             # 'buy' | 'sell' | 'hold' | 'watch'
    strength: float         # 0.0 - 1.0
    phase: str              # Current Wyckoff phase
    reasons: List[str] = field(default_factory=list)
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    entry_price: Optional[float] = None

    def to_dict(self):
        return {
            'date': self.date.isoformat(),
            'stock_id': self.stock_id,
            'action': self.action,
            'strength': round(self.strength, 3),
            'phase': self.phase,
            'reasons': self.reasons,
            'target_price': self.target_price,
            'stop_loss': self.stop_loss,
            'entry_price': self.entry_price,
        }


@dataclass
class BacktestTrade:
    """Single completed trade in a backtest"""
    stock_id: str
    entry_date: date
    exit_date: date
    entry_price: float
    exit_price: float
    shares: int
    side: str               # 'long' | 'short'
    signal_reason: str
    pnl: float = 0.0
    pnl_pct: float = 0.0
    holding_days: int = 0

    def __post_init__(self):
        if self.side == 'long':
            self.pnl = (self.exit_price - self.entry_price) * self.shares
            self.pnl_pct = (self.exit_price - self.entry_price) / self.entry_price
        else:
            self.pnl = (self.entry_price - self.exit_price) * self.shares
            self.pnl_pct = (self.entry_price - self.exit_price) / self.entry_price
        self.holding_days = (self.exit_date - self.entry_date).days


@dataclass
class BacktestResult:
    """Complete backtest results"""
    strategy_name: str
    stock_id: str
    start_date: date
    end_date: date
    initial_capital: float
    final_capital: float
    trades: List[BacktestTrade] = field(default_factory=list)

    @property
    def total_return(self) -> float:
        return (self.final_capital - self.initial_capital) / self.initial_capital

    @property
    def total_trades(self) -> int:
        return len(self.trades)

    @property
    def winning_trades(self) -> int:
        return sum(1 for t in self.trades if t.pnl > 0)

    @property
    def losing_trades(self) -> int:
        return sum(1 for t in self.trades if t.pnl <= 0)

    @property
    def win_rate(self) -> float:
        if self.total_trades == 0:
            return 0.0
        return self.winning_trades / self.total_trades

    @property
    def avg_win(self) -> float:
        wins = [t.pnl_pct for t in self.trades if t.pnl > 0]
        return sum(wins) / len(wins) if wins else 0.0

    @property
    def avg_loss(self) -> float:
        losses = [t.pnl_pct for t in self.trades if t.pnl <= 0]
        return sum(losses) / len(losses) if losses else 0.0

    @property
    def profit_factor(self) -> float:
        gross_profit = sum(t.pnl for t in self.trades if t.pnl > 0)
        gross_loss = abs(sum(t.pnl for t in self.trades if t.pnl <= 0))
        if gross_loss == 0:
            return float('inf') if gross_profit > 0 else 0.0
        return gross_profit / gross_loss

    @property
    def max_drawdown(self) -> float:
        if not self.trades:
            return 0.0
        equity = self.initial_capital
        peak = equity
        max_dd = 0.0
        for t in self.trades:
            equity += t.pnl
            peak = max(peak, equity)
            dd = (peak - equity) / peak
            max_dd = max(max_dd, dd)
        return max_dd

    def summary(self) -> dict:
        return {
            'strategy': self.strategy_name,
            'stock_id': self.stock_id,
            'period': f"{self.start_date} to {self.end_date}",
            'initial_capital': self.initial_capital,
            'final_capital': round(self.final_capital, 2),
            'total_return': f"{self.total_return:.2%}",
            'total_trades': self.total_trades,
            'win_rate': f"{self.win_rate:.2%}",
            'avg_win': f"{self.avg_win:.2%}",
            'avg_loss': f"{self.avg_loss:.2%}",
            'profit_factor': round(self.profit_factor, 2),
            'max_drawdown': f"{self.max_drawdown:.2%}",
        }
