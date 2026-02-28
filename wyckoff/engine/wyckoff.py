"""
Wyckoff Phase Detection Engine

Core philosophy:
- The Composite Man (大戶/主力) accumulates before a markup, distributes before a markdown
- Volume reveals effort; price reveals result
- Look for cause (accumulation/distribution range) to project effect (markup/markdown)
- Springs and upthrusts are the highest-probability entries

This engine analyzes price+volume structure to identify:
1. Accumulation phases (大戶在低檔吃貨)
2. Markup phases (上漲趨勢)
3. Distribution phases (大戶在高檔出貨)
4. Markdown phases (下跌趨勢)
"""
import numpy as np
from typing import List, Tuple, Optional, Dict
from datetime import date
from ..data.models import OHLCV, StockData, WyckoffPhase, Signal


# ═══════════════════════════════════════════════════════════
#  UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════

def sma(values: List[float], period: int) -> List[Optional[float]]:
    """Simple moving average"""
    result = [None] * len(values)
    for i in range(period - 1, len(values)):
        result[i] = sum(values[i - period + 1:i + 1]) / period
    return result


def ema(values: List[float], period: int) -> List[Optional[float]]:
    """Exponential moving average"""
    result = [None] * len(values)
    if len(values) < period:
        return result
    k = 2 / (period + 1)
    result[period - 1] = sum(values[:period]) / period
    for i in range(period, len(values)):
        result[i] = values[i] * k + result[i - 1] * (1 - k)
    return result


def rolling_std(values: List[float], period: int) -> List[Optional[float]]:
    """Rolling standard deviation"""
    result = [None] * len(values)
    for i in range(period - 1, len(values)):
        window = values[i - period + 1:i + 1]
        result[i] = float(np.std(window))
    return result


def relative_volume(volumes: List[int], period: int = 20) -> List[Optional[float]]:
    """Volume relative to its moving average (RVOL)"""
    avg = sma([float(v) for v in volumes], period)
    result = [None] * len(volumes)
    for i in range(len(volumes)):
        if avg[i] and avg[i] > 0:
            result[i] = volumes[i] / avg[i]
    return result


def find_swing_highs(bars: List[OHLCV], lookback: int = 5) -> List[Tuple[int, float]]:
    """Find local swing high points"""
    swings = []
    for i in range(lookback, len(bars) - lookback):
        h = bars[i].high
        is_high = all(bars[j].high <= h for j in range(i - lookback, i + lookback + 1) if j != i)
        if is_high:
            swings.append((i, h))
    return swings


def find_swing_lows(bars: List[OHLCV], lookback: int = 5) -> List[Tuple[int, float]]:
    """Find local swing low points"""
    swings = []
    for i in range(lookback, len(bars) - lookback):
        l = bars[i].low
        is_low = all(bars[j].low >= l for j in range(i - lookback, i + lookback + 1) if j != i)
        if is_low:
            swings.append((i, l))
    return swings


def detect_trend(closes: List[float], period: int = 20) -> List[str]:
    """
    Classify trend at each bar: 'up', 'down', or 'sideways'
    Uses price position relative to SMA and SMA slope.
    """
    ma = sma(closes, period)
    trends = ['sideways'] * len(closes)

    for i in range(period + 5, len(closes)):
        if ma[i] is None or ma[i - 5] is None:
            continue
        slope = (ma[i] - ma[i - 5]) / ma[i - 5]
        above = closes[i] > ma[i]

        if slope > 0.005 and above:
            trends[i] = 'up'
        elif slope < -0.005 and not above:
            trends[i] = 'down'
        else:
            trends[i] = 'sideways'

    return trends


# ═══════════════════════════════════════════════════════════
#  EFFORT vs RESULT ANALYSIS
#  Wyckoff's most powerful concept:
#  "If there's high effort (volume) with low result (price change),
#   the supply/demand balance is about to shift"
# ═══════════════════════════════════════════════════════════

def effort_vs_result(bars: List[OHLCV], period: int = 10) -> List[Dict]:
    """
    Analyze the relationship between volume (effort) and price movement (result).
    
    Returns per-bar analysis:
    - 'harmony': effort matches result (trend continues)
    - 'divergence_bullish': high effort, no down progress (accumulation)
    - 'divergence_bearish': high effort, no up progress (distribution)
    - 'no_demand': low volume rally (weak, likely to fail)
    - 'no_supply': low volume decline (supply exhausted, likely to reverse up)
    """
    results = [{'type': 'neutral', 'score': 0.0}] * len(bars)
    vols = [float(b.volume) for b in bars]
    rvol = relative_volume([b.volume for b in bars], period)

    for i in range(period, len(bars)):
        if rvol[i] is None:
            continue

        bar = bars[i]
        price_change = (bar.close - bars[i - 1].close) / bars[i - 1].close
        vol_ratio = rvol[i]

        analysis = {'type': 'neutral', 'score': 0.0, 'vol_ratio': vol_ratio,
                     'price_change': price_change}

        # HIGH VOLUME scenarios
        if vol_ratio > 1.5:
            if abs(price_change) < 0.005:
                # Big volume, tiny move — ABSORPTION
                if bar.close_position < 0.4:
                    analysis['type'] = 'divergence_bearish'
                    analysis['score'] = -vol_ratio * 0.5
                else:
                    analysis['type'] = 'divergence_bullish'
                    analysis['score'] = vol_ratio * 0.5
            elif price_change < -0.01 and bar.close_position > 0.5:
                # Down day but closes in upper half — buying into weakness
                analysis['type'] = 'divergence_bullish'
                analysis['score'] = vol_ratio * 0.4
            elif price_change > 0.01 and bar.close_position < 0.5:
                # Up day but closes in lower half — selling into strength
                analysis['type'] = 'divergence_bearish'
                analysis['score'] = -vol_ratio * 0.4
            else:
                analysis['type'] = 'harmony'
                analysis['score'] = vol_ratio * 0.2 * (1 if price_change > 0 else -1)

        # LOW VOLUME scenarios
        elif vol_ratio < 0.7:
            if price_change > 0.005:
                # Rally on low volume — NO DEMAND
                analysis['type'] = 'no_demand'
                analysis['score'] = -0.3
            elif price_change < -0.005:
                # Decline on low volume — NO SUPPLY (bullish!)
                analysis['type'] = 'no_supply'
                analysis['score'] = 0.3

        results[i] = analysis

    return results


# ═══════════════════════════════════════════════════════════
#  SUPPLY / DEMAND TESTS
#  Springs (false breakdown) and Upthrusts (false breakout)
# ═══════════════════════════════════════════════════════════

def detect_springs(bars: List[OHLCV], support_level: float,
                   tolerance: float = 0.02) -> List[Tuple[int, float]]:
    """
    Detect springs: price briefly penetrates support then closes back above.
    This is the #1 Wyckoff buy signal.
    
    A spring:
    1. Low goes BELOW support
    2. Close comes BACK ABOVE support
    3. Volume ideally decreasing (weak selling = supply exhausted)
    """
    springs = []
    for i in range(2, len(bars)):
        bar = bars[i]
        below_support = bar.low < support_level * (1 - tolerance)
        close_above = bar.close > support_level * (1 - tolerance * 0.5)

        if below_support and close_above:
            # Check volume — ideal spring has decreasing volume
            vol_decreasing = bar.volume < bars[i - 1].volume
            strength = 0.6 + (0.2 if vol_decreasing else 0) + (0.2 if bar.close_position > 0.6 else 0)
            springs.append((i, strength))

    return springs


def detect_upthrusts(bars: List[OHLCV], resistance_level: float,
                     tolerance: float = 0.02) -> List[Tuple[int, float]]:
    """
    Detect upthrusts: price briefly exceeds resistance then closes back below.
    This is a Wyckoff sell signal / sign of distribution.
    """
    upthrusts = []
    for i in range(2, len(bars)):
        bar = bars[i]
        above_resistance = bar.high > resistance_level * (1 + tolerance)
        close_below = bar.close < resistance_level * (1 + tolerance * 0.5)

        if above_resistance and close_below:
            vol_high = bar.volume > bars[i - 1].volume
            strength = 0.6 + (0.2 if vol_high else 0) + (0.2 if bar.close_position < 0.4 else 0)
            upthrusts.append((i, strength))

    return upthrusts


# ═══════════════════════════════════════════════════════════
#  PHASE DETECTION ENGINE
#  Identifies the four Wyckoff phases from price/volume structure
# ═══════════════════════════════════════════════════════════

class WyckoffDetector:
    """
    Main Wyckoff phase detection engine.
    
    Analyzes a stock's price+volume history and identifies:
    - Current phase (accumulation/markup/distribution/markdown)
    - Key structural events (SC, AR, ST, Spring, SOS, etc.)
    - Trading signals based on phase context
    """

    def __init__(self, lookback_period: int = 20, volatility_period: int = 20):
        self.lookback = lookback_period
        self.vol_period = volatility_period

    def analyze(self, stock: StockData) -> Dict:
        """
        Full Wyckoff analysis of a stock.
        Returns phases, events, signals, and scoring.
        """
        bars = stock.bars
        if len(bars) < 50:
            return {'error': 'Need at least 50 bars for analysis', 'phases': [], 'signals': []}

        closes = [b.close for b in bars]
        volumes = [b.volume for b in bars]
        highs = [b.high for b in bars]
        lows = [b.low for b in bars]

        # Step 1: Identify trend structure
        trends = detect_trend(closes, self.lookback)

        # Step 2: Find volume patterns
        evr = effort_vs_result(bars, self.vol_period)
        rvol = relative_volume(volumes, self.vol_period)

        # Step 3: Find swing highs/lows to identify ranges
        swing_highs = find_swing_highs(bars, 5)
        swing_lows = find_swing_lows(bars, 5)

        # Step 4: Detect phases
        phases = self._detect_phases(bars, trends, evr, rvol, swing_highs, swing_lows)

        # Step 5: Detect springs and upthrusts
        events = self._detect_events(bars, phases, swing_highs, swing_lows)

        # Step 6: Generate signals
        signals = self._generate_signals(stock, bars, phases, events, evr, rvol, trends)

        return {
            'stock_id': stock.stock_id,
            'stock_name': stock.name,
            'bars_analyzed': len(bars),
            'date_range': f"{bars[0].date} to {bars[-1].date}",
            'phases': [p.to_dict() for p in phases],
            'events': events,
            'signals': [s.to_dict() for s in signals],
            'effort_vs_result': evr[-20:],  # Last 20 bars
            'current_phase': phases[-1].phase if phases else 'unknown',
            'current_signal': signals[-1].to_dict() if signals else None,
        }

    def _detect_phases(self, bars, trends, evr, rvol, swing_highs, swing_lows) -> List[WyckoffPhase]:
        """
        Phase detection using multiple evidence streams:
        1. Price trend (moving average direction)
        2. Volatility contraction/expansion
        3. Volume patterns (effort vs result)
        4. Range behavior (sideways = accumulation or distribution)
        """
        phases = []
        n = len(bars)
        window = 40  # Phase detection window

        for start_idx in range(0, n - window + 1, window // 2):
            end_idx = min(start_idx + window, n - 1)
            segment = bars[start_idx:end_idx + 1]

            if len(segment) < 20:
                continue

            # Gather evidence
            seg_closes = [b.close for b in segment]
            seg_volumes = [b.volume for b in segment]
            seg_trends = trends[start_idx:end_idx + 1]

            # Price direction
            price_change = (segment[-1].close - segment[0].close) / segment[0].close

            # Volatility (range tightness)
            price_range = (max(b.high for b in segment) - min(b.low for b in segment))
            avg_price = sum(seg_closes) / len(seg_closes)
            range_pct = price_range / avg_price

            # Trend composition
            up_count = seg_trends.count('up')
            down_count = seg_trends.count('down')
            side_count = seg_trends.count('sideways')
            total = len(seg_trends)

            # Volume trend
            first_half_vol = sum(seg_volumes[:len(seg_volumes) // 2])
            second_half_vol = sum(seg_volumes[len(seg_volumes) // 2:])
            vol_trend = second_half_vol / first_half_vol if first_half_vol > 0 else 1.0

            # EVR divergences in this segment
            seg_evr = evr[start_idx:end_idx + 1]
            bullish_divs = sum(1 for e in seg_evr if isinstance(e, dict) and
                              e.get('type') in ('divergence_bullish', 'no_supply'))
            bearish_divs = sum(1 for e in seg_evr if isinstance(e, dict) and
                              e.get('type') in ('divergence_bearish', 'no_demand'))

            # === SCORING ===
            evidence = {}
            phase = 'unknown'
            confidence = 0.0

            # ACCUMULATION evidence
            acc_score = 0.0
            if range_pct < 0.15:
                acc_score += 0.3  # Tight range
                evidence['tight_range'] = range_pct
            if side_count / total > 0.5:
                acc_score += 0.2  # Mostly sideways
            if vol_trend < 0.85:
                acc_score += 0.2  # Decreasing volume (drying up supply)
                evidence['vol_declining'] = vol_trend
            if bullish_divs > bearish_divs:
                acc_score += 0.3  # Bullish absorption
                evidence['bullish_divergences'] = bullish_divs
            # Check if we're near lows
            if price_change > -0.05 and price_change < 0.05:
                acc_score += 0.1

            # MARKUP evidence
            mk_score = 0.0
            if price_change > 0.05:
                mk_score += 0.4
                evidence['price_up'] = price_change
            if up_count / total > 0.5:
                mk_score += 0.3
            if vol_trend > 1.0 and price_change > 0:
                mk_score += 0.2  # Rising volume with rising price
                evidence['vol_confirming'] = vol_trend
            if bullish_divs > 0:
                mk_score += 0.1

            # DISTRIBUTION evidence
            dist_score = 0.0
            if range_pct < 0.15 and price_change < 0.03:
                dist_score += 0.3
            if side_count / total > 0.4:
                dist_score += 0.2
            if vol_trend > 1.1 and abs(price_change) < 0.05:
                dist_score += 0.2  # Increasing volume in range (churning)
                evidence['churning_volume'] = vol_trend
            if bearish_divs > bullish_divs:
                dist_score += 0.3
                evidence['bearish_divergences'] = bearish_divs

            # MARKDOWN evidence
            md_score = 0.0
            if price_change < -0.05:
                md_score += 0.4
                evidence['price_down'] = price_change
            if down_count / total > 0.5:
                md_score += 0.3
            if vol_trend > 1.0 and price_change < 0:
                md_score += 0.2
            if bearish_divs > 0:
                md_score += 0.1

            # Pick highest scoring phase
            scores = {
                'accumulation': acc_score,
                'markup': mk_score,
                'distribution': dist_score,
                'markdown': md_score,
            }
            phase = max(scores, key=scores.get)
            confidence = scores[phase]

            # Need minimum confidence
            if confidence < 0.2:
                phase = 'unknown'

            # Determine sub-phase
            sub_phase = self._classify_sub_phase(segment, phase, evidence, evr[start_idx:end_idx + 1])

            phases.append(WyckoffPhase(
                phase=phase,
                sub_phase=sub_phase,
                start_date=segment[0].date,
                end_date=segment[-1].date,
                confidence=min(confidence, 1.0),
                evidence=evidence,
            ))

        return phases

    def _classify_sub_phase(self, bars, phase, evidence, evr_segment) -> str:
        """Classify the sub-phase within a major phase"""
        if phase == 'accumulation':
            closes = [b.close for b in bars]
            # Early accumulation: prices still falling
            if closes[-1] < closes[0] * 0.97:
                return 'SC_area'  # Selling Climax area
            # Bounce from low
            if closes[-1] > closes[len(closes) // 2] * 1.02:
                return 'AR'  # Automatic Rally
            # Tight consolidation
            rng = (max(closes) - min(closes)) / min(closes)
            if rng < 0.06:
                return 'consolidation'
            return 'testing'

        elif phase == 'distribution':
            closes = [b.close for b in bars]
            if closes[-1] > closes[0] * 1.02:
                return 'BC_area'  # Buying Climax area
            if closes[-1] < closes[len(closes) // 2] * 0.98:
                return 'SOW'  # Sign of Weakness
            return 'testing'

        elif phase == 'markup':
            return 'trending_up'

        elif phase == 'markdown':
            return 'trending_down'

        return 'unknown'

    def _detect_events(self, bars, phases, swing_highs, swing_lows) -> List[Dict]:
        """Detect key Wyckoff events: Springs, Upthrusts, SOS, SOW"""
        events = []

        if not phases:
            return events

        # Find support/resistance from ranges
        for phase in phases:
            if phase.phase in ('accumulation', 'distribution'):
                # Get bars in this phase
                phase_bars = [b for b in bars if phase.start_date <= b.date <= phase.end_date]
                if len(phase_bars) < 5:
                    continue

                support = min(b.low for b in phase_bars)
                resistance = max(b.high for b in phase_bars)

                # Get full bars for detection (need surrounding context)
                start_i = next((i for i, b in enumerate(bars) if b.date >= phase.start_date), 0)
                end_i = next((i for i, b in enumerate(bars) if b.date >= phase.end_date), len(bars) - 1)

                if phase.phase == 'accumulation':
                    springs = detect_springs(bars[max(0, start_i - 5):min(len(bars), end_i + 10)], support)
                    for idx, strength in springs:
                        actual_idx = max(0, start_i - 5) + idx
                        if actual_idx < len(bars):
                            events.append({
                                'type': 'spring',
                                'date': bars[actual_idx].date.isoformat(),
                                'bar_index': actual_idx,
                                'strength': strength,
                                'level': support,
                                'phase': 'accumulation',
                            })

                elif phase.phase == 'distribution':
                    upthrusts = detect_upthrusts(bars[max(0, start_i - 5):min(len(bars), end_i + 10)], resistance)
                    for idx, strength in upthrusts:
                        actual_idx = max(0, start_i - 5) + idx
                        if actual_idx < len(bars):
                            events.append({
                                'type': 'upthrust',
                                'date': bars[actual_idx].date.isoformat(),
                                'bar_index': actual_idx,
                                'strength': strength,
                                'level': resistance,
                                'phase': 'distribution',
                            })

        return events

    def _generate_signals(self, stock, bars, phases, events, evr, rvol, trends) -> List[Signal]:
        """
        Generate trading signals based on Wyckoff phase context.
        
        Priority signals:
        1. Spring in accumulation → BUY (highest confidence)
        2. Sign of Strength after spring → BUY
        3. Upthrust in distribution → SELL
        4. Sign of Weakness → SELL
        5. Last Point of Support (LPS) in markup → ADD
        """
        signals = []
        current_phase = phases[-1] if phases else None

        if not current_phase:
            return signals

        # Check recent events
        recent_events = [e for e in events if e.get('bar_index', 0) > len(bars) - 30]

        # Current bar analysis
        last_bar = bars[-1]
        last_evr = evr[-1] if evr else {'type': 'neutral', 'score': 0}

        # === ACCUMULATION SIGNALS ===
        if current_phase.phase == 'accumulation':
            # Look for springs
            springs = [e for e in recent_events if e['type'] == 'spring']
            if springs:
                best_spring = max(springs, key=lambda e: e['strength'])
                # Calculate target using Wyckoff point & figure
                phase_bars = [b for b in bars if current_phase.start_date <= b.date <= current_phase.end_date]
                range_width = len(phase_bars)  # Count of bars in range = "cause"
                avg_price = sum(b.close for b in phase_bars) / len(phase_bars)
                range_height = max(b.high for b in phase_bars) - min(b.low for b in phase_bars)

                # Target = base + (range_width * range_height * factor)
                target = avg_price + range_width * range_height * 0.05

                signals.append(Signal(
                    date=last_bar.date,
                    stock_id=stock.stock_id,
                    action='buy',
                    strength=best_spring['strength'],
                    phase='accumulation_spring',
                    reasons=[
                        f"Spring detected at support {best_spring['level']:.2f}",
                        f"Accumulation phase confidence: {current_phase.confidence:.0%}",
                        f"Volume divergence favoring buyers",
                    ],
                    target_price=round(target, 2),
                    stop_loss=round(best_spring['level'] * 0.97, 2),
                    entry_price=last_bar.close,
                ))
            elif current_phase.confidence > 0.5:
                # Accumulation without spring yet — WATCH
                signals.append(Signal(
                    date=last_bar.date,
                    stock_id=stock.stock_id,
                    action='watch',
                    strength=current_phase.confidence * 0.5,
                    phase='accumulation_building',
                    reasons=[
                        f"Accumulation phase detected (confidence: {current_phase.confidence:.0%})",
                        "Waiting for spring or sign of strength",
                        f"EVR: {last_evr.get('type', 'neutral') if isinstance(last_evr, dict) else 'neutral'}",
                    ],
                ))

        # === DISTRIBUTION SIGNALS ===
        elif current_phase.phase == 'distribution':
            upthrusts = [e for e in recent_events if e['type'] == 'upthrust']
            if upthrusts:
                best_ut = max(upthrusts, key=lambda e: e['strength'])
                signals.append(Signal(
                    date=last_bar.date,
                    stock_id=stock.stock_id,
                    action='sell',
                    strength=best_ut['strength'],
                    phase='distribution_upthrust',
                    reasons=[
                        f"Upthrust detected at resistance {best_ut['level']:.2f}",
                        f"Distribution phase confidence: {current_phase.confidence:.0%}",
                        "Smart money distributing — expect markdown",
                    ],
                    stop_loss=round(best_ut['level'] * 1.03, 2),
                    entry_price=last_bar.close,
                ))
            elif current_phase.confidence > 0.5:
                signals.append(Signal(
                    date=last_bar.date,
                    stock_id=stock.stock_id,
                    action='watch',
                    strength=current_phase.confidence * 0.4,
                    phase='distribution_building',
                    reasons=[
                        f"Distribution phase detected (confidence: {current_phase.confidence:.0%})",
                        "Watching for upthrust or sign of weakness",
                    ],
                ))

        # === MARKUP / MARKDOWN ===
        elif current_phase.phase == 'markup':
            # Look for Last Point of Support (LPS) — pullback on low volume
            is_lps = (isinstance(last_evr, dict) and
                      last_evr.get('type') == 'no_supply' and
                      trends[-1] == 'up')
            if is_lps:
                signals.append(Signal(
                    date=last_bar.date,
                    stock_id=stock.stock_id,
                    action='buy',
                    strength=0.6,
                    phase='markup_lps',
                    reasons=[
                        "Last Point of Support: pullback on declining volume",
                        "Trend still up — supply exhausted on pullback",
                        "Composite Man likely still accumulating",
                    ],
                    entry_price=last_bar.close,
                    stop_loss=round(last_bar.low * 0.97, 2),
                ))
            else:
                signals.append(Signal(
                    date=last_bar.date,
                    stock_id=stock.stock_id,
                    action='hold',
                    strength=0.5,
                    phase='markup',
                    reasons=["Markup phase — trend is up", "Hold existing positions"],
                ))

        elif current_phase.phase == 'markdown':
            signals.append(Signal(
                date=last_bar.date,
                stock_id=stock.stock_id,
                action='sell',
                strength=0.7,
                phase='markdown',
                reasons=[
                    "Markdown phase — downtrend in progress",
                    "Avoid buying until accumulation signs appear",
                ],
            ))

        return signals
