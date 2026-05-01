#!/usr/bin/env python3
"""
Translate every flat-English string in metrics[].k/v/delta and scenario.*.label
into {en, zh, ja} objects. Idempotent: skips fields already in tri-lingual shape.
"""
import json
from pathlib import Path

P = Path('public/static/data/pinforge-stocks.json')
data = json.loads(P.read_text(encoding='utf-8'))

# ---- Metric KEY translations (column header) ----
METRIC_K = {
    "TTM revenue":            {"en":"TTM revenue",            "zh":"近 12 月營收",     "ja":"TTM 売上高"},
    "Operating margin":       {"en":"Operating margin",       "zh":"營業利益率",       "ja":"営業利益率"},
    "Net debt / EBITDA":      {"en":"Net debt / EBITDA",      "zh":"淨負債 / EBITDA","ja":"純有利子負債 / EBITDA"},
    "ROIC":                   {"en":"ROIC",                   "zh":"投入資本報酬率",   "ja":"ROIC(投下資本利益率)"},
    "AI mix of revenue":      {"en":"AI mix of revenue",      "zh":"AI 營收占比",      "ja":"AI 売上比率"},
    "M8 / Megtron-8 mix":     {"en":"M8 / Megtron-8 mix",     "zh":"M8 / Megtron‑8 占比","ja":"M8 / Megtron‑8 比率"},
    "SiC mix of revenue":     {"en":"SiC mix of revenue",     "zh":"SiC 營收占比",     "ja":"SiC 売上比率"},
    "Capacity util.":         {"en":"Capacity utilisation",   "zh":"產能利用率",       "ja":"設備稼働率"},
    "AI / HPC test mix":      {"en":"AI / HPC test mix",      "zh":"AI / HPC 測試占比","ja":"AI / HPC テスト比率"},
    "Free cash flow yield":   {"en":"Free cash flow yield",   "zh":"自由現金流殖利率", "ja":"フリーキャッシュフロー利回り"},
    "FCF yield":              {"en":"FCF yield",              "zh":"自由現金流殖利率", "ja":"FCF 利回り"},
    "AI fabric mix":          {"en":"AI fabric mix",          "zh":"AI 網路占比",      "ja":"AI ファブリック比率"},
    "AI / DC mix":            {"en":"AI / DC mix",            "zh":"AI / 資料中心占比","ja":"AI / データセンター比率"},
    "Backlog cover":          {"en":"Backlog cover",          "zh":"在手訂單能見度",   "ja":"受注残カバー期間"},
    "AI fab + humanoid mix":  {"en":"AI fab + humanoid mix",  "zh":"AI 廠 + 人形機器人占比","ja":"AI ファブ + ヒューマノイド比率"},
    "Capex 2026E":            {"en":"Capex 2026E",            "zh":"2026 年資本支出 E","ja":"2026 年設備投資 E"},
    "LTA cover":              {"en":"Long-term agreement cover","zh":"長約覆蓋率",     "ja":"長期契約カバー率"},
    "Texas fab progress":     {"en":"Texas fab progress",     "zh":"德州廠進度",       "ja":"テキサス工場進捗"},
    "AI device mix":          {"en":"AI device mix",          "zh":"AI 裝置占比",      "ja":"AI デバイス比率"},
    "Apple share of FPC":     {"en":"Apple share of FPC",     "zh":"Apple 占 FPC 比重","ja":"FPC のうち Apple 比率"},
    "EUV pod global share":   {"en":"EUV pod global share",   "zh":"EUV 載具全球市占", "ja":"EUV ポッド世界シェア"},
    "AI / edge inference mix":{"en":"AI / edge inference mix","zh":"AI / 邊緣推論占比","ja":"AI / エッジ推論比率"},
}

# ---- Metric DELTA translations (third column) ----
def tr_delta(s):
    """Translate the small delta tag. Numeric/percent prefixes stay the same."""
    if s is None: return None
    map_ = {
        "+62 % YoY":       {"en":"+62 % YoY","zh":"+62 % 年增","ja":"+62 % 前年比"},
        "+38 % YoY":       {"en":"+38 % YoY","zh":"+38 % 年增","ja":"+38 % 前年比"},
        "+44 % YoY":       {"en":"+44 % YoY","zh":"+44 % 年增","ja":"+44 % 前年比"},
        "+71 % YoY":       {"en":"+71 % YoY","zh":"+71 % 年增","ja":"+71 % 前年比"},
        "+33 % YoY":       {"en":"+33 % YoY","zh":"+33 % 年增","ja":"+33 % 前年比"},
        "+51 % YoY":       {"en":"+51 % YoY","zh":"+51 % 年增","ja":"+51 % 前年比"},
        "+88 % YoY":       {"en":"+88 % YoY","zh":"+88 % 年增","ja":"+88 % 前年比"},
        "+18 % YoY":       {"en":"+18 % YoY","zh":"+18 % 年增","ja":"+18 % 前年比"},
        "+12 % YoY":       {"en":"+12 % YoY","zh":"+12 % 年增","ja":"+12 % 前年比"},
        "+22 % YoY":       {"en":"+22 % YoY","zh":"+22 % 年增","ja":"+22 % 前年比"},
        "+58 % YoY":       {"en":"+58 % YoY","zh":"+58 % 年增","ja":"+58 % 前年比"},
        "+19 % YoY":       {"en":"+19 % YoY","zh":"+19 % 年增","ja":"+19 % 前年比"},
        "+340 bps YoY":    {"en":"+340 bps YoY","zh":"+340 基點 年增","ja":"+340 bp 前年比"},
        "+520 bps YoY":    {"en":"+520 bps YoY","zh":"+520 基點 年增","ja":"+520 bp 前年比"},
        "+610 bps YoY":    {"en":"+610 bps YoY","zh":"+610 基點 年增","ja":"+610 bp 前年比"},
        "+780 bps YoY":    {"en":"+780 bps YoY","zh":"+780 基點 年增","ja":"+780 bp 前年比"},
        "+410 bps YoY":    {"en":"+410 bps YoY","zh":"+410 基點 年增","ja":"+410 bp 前年比"},
        "+260 bps YoY":    {"en":"+260 bps YoY","zh":"+260 基點 年增","ja":"+260 bp 前年比"},
        "+540 bps YoY":    {"en":"+540 bps YoY","zh":"+540 基點 年增","ja":"+540 bp 前年比"},
        "+220 bps YoY":    {"en":"+220 bps YoY","zh":"+220 基點 年增","ja":"+220 bp 前年比"},
        "+180 bps YoY":    {"en":"+180 bps YoY","zh":"+180 基點 年增","ja":"+180 bp 前年比"},
        "net cash":        {"en":"net cash","zh":"淨現金部位","ja":"実質ネットキャッシュ"},
        "deleveraging":    {"en":"deleveraging","zh":"財務槓桿下降中","ja":"レバレッジ低下中"},
        "vs 14 % WACC":    {"en":"vs 14 % WACC","zh":"WACC 14 % 對照","ja":"WACC 14 % 比"},
        "vs 12 % WACC":    {"en":"vs 12 % WACC","zh":"WACC 12 % 對照","ja":"WACC 12 % 比"},
        "vs 11 % WACC":    {"en":"vs 11 % WACC","zh":"WACC 11 % 對照","ja":"WACC 11 % 比"},
        "vs 13 % WACC":    {"en":"vs 13 % WACC","zh":"WACC 13 % 對照","ja":"WACC 13 % 比"},
        "from 28 % in 2024":{"en":"from 28 % in 2024","zh":"由 2024 年的 28 % 提升","ja":"2024 年の 28 % から上昇"},
        "from 11 % in 2024":{"en":"from 11 % in 2024","zh":"由 2024 年的 11 % 提升","ja":"2024 年の 11 % から上昇"},
        "from 12 % in 2024":{"en":"from 12 % in 2024","zh":"由 2024 年的 12 % 提升","ja":"2024 年の 12 % から上昇"},
        "from 24 % in 2024":{"en":"from 24 % in 2024","zh":"由 2024 年的 24 % 提升","ja":"2024 年の 24 % から上昇"},
        "from 33 % in 2024":{"en":"from 33 % in 2024","zh":"由 2024 年的 33 % 提升","ja":"2024 年の 33 % から上昇"},
        "from 7 % in 2024":{"en":"from 7 % in 2024","zh":"由 2024 年的 7 % 提升","ja":"2024 年の 7 % から上昇"},
        "from 9 % in 2024":{"en":"from 9 % in 2024","zh":"由 2024 年的 9 % 提升","ja":"2024 年の 9 % から上昇"},
        "from 14 % in 2024":{"en":"from 14 % in 2024","zh":"由 2024 年的 14 % 提升","ja":"2024 年の 14 % から上昇"},
        "from 11 % in 2024":{"en":"from 11 % in 2024","zh":"由 2024 年的 11 % 提升","ja":"2024 年の 11 % から上昇"},
        "vs 2.8 % TWSE avg":{"en":"vs 2.8 % TWSE avg","zh":"vs 加權平均 2.8 %","ja":"vs TWSE 平均 2.8 %"},
        "sold out 2026":   {"en":"sold out through 2026","zh":"產能售罄至 2026","ja":"2026 年まで完売"},
        "1.4 yrs visibility":{"en":"~1.4 yrs visibility","zh":"約 1.4 年能見度","ja":"約 1.4 年の見通し"},
        "humanoid line":   {"en":"humanoid robotics line","zh":"人形機器人產線","ja":"ヒューマノイド・ロボ産線"},
        "to 2030":         {"en":"locked to 2030","zh":"鎖定至 2030 年","ja":"2030 年まで固定"},
        "Q4 26 qualifications":{"en":"Q4 26 qualifications","zh":"2026 Q4 客戶認證","ja":"2026 年 Q4 顧客認証"},
        "stable":          {"en":"stable","zh":"持平","ja":"横ばい"},
        "estimated 38 %":  {"en":"estimated 38 %","zh":"推估 38 %","ja":"推定 38 %"},
        "ASML-aligned":    {"en":"ASML-aligned","zh":"ASML 認證夥伴","ja":"ASML 公認パートナー"},
        "≈ 85 %":          {"en":"≈ 85 %","zh":"約 85 %","ja":"約 85 %"},
        "17 mo":           {"en":"17 months","zh":"17 個月","ja":"17 ヶ月"},
    }
    return map_.get(s, {"en":s,"zh":s,"ja":s})

def tr_value(s):
    """Translate metric value (mostly numeric / NT$, leave numeric, only translate units)."""
    if s is None: return None
    m = {
        "NT$ 48.2 B":{"en":"NT$ 48.2 B","zh":"新台幣 482 億","ja":"NT$ 482 億"},
        "NT$ 132.8 B":{"en":"NT$ 132.8 B","zh":"新台幣 1,328 億","ja":"NT$ 1,328 億"},
        "NT$ 79.4 B":{"en":"NT$ 79.4 B","zh":"新台幣 794 億","ja":"NT$ 794 億"},
        "NT$ 18.6 B":{"en":"NT$ 18.6 B","zh":"新台幣 186 億","ja":"NT$ 186 億"},
        "NT$ 38.2 B":{"en":"NT$ 38.2 B","zh":"新台幣 382 億","ja":"NT$ 382 億"},
        "NT$ 188.6 B":{"en":"NT$ 188.6 B","zh":"新台幣 1,886 億","ja":"NT$ 1,886 億"},
        "NT$ 9.8 B":{"en":"NT$ 9.8 B","zh":"新台幣 98 億","ja":"NT$ 98 億"},
        "NT$ 26.4 B":{"en":"NT$ 26.4 B","zh":"新台幣 264 億","ja":"NT$ 264 億"},
        "NT$ 76.2 B":{"en":"NT$ 76.2 B","zh":"新台幣 762 億","ja":"NT$ 762 億"},
        "NT$ 184.2 B":{"en":"NT$ 184.2 B","zh":"新台幣 1,842 億","ja":"NT$ 1,842 億"},
        "NT$ 12.4 B":{"en":"NT$ 12.4 B","zh":"新台幣 124 億","ja":"NT$ 124 億"},
        "NT$ 542.8 B":{"en":"NT$ 542.8 B","zh":"新台幣 5,428 億","ja":"NT$ 5,428 億"},
        "NT$ 4.8 B":{"en":"NT$ 4.8 B","zh":"新台幣 48 億","ja":"NT$ 48 億"},
        "estimated 38 %":{"en":"estimated 38 %","zh":"推估 38 %","ja":"推定 38 %"},
        "17 mo":{"en":"17 months","zh":"17 個月","ja":"17 ヶ月"},
    }
    return m.get(s, {"en":s,"zh":s,"ja":s})

# ---- Scenario label translations ----
SCEN = {
    # 3661 Alchip
    "Hyperscaler capex pause 2027":           {"en":"Hyperscaler capex pause 2027","zh":"2027 雲廠資本支出暫停","ja":"2027 ハイパースケーラ設備投資停止"},
    "Trainium 3 + sovereign ramp on time":    {"en":"Trainium 3 + sovereign ramp on time","zh":"Trainium 3 與主權 AI 如期量產","ja":"Trainium 3 とソブリン AI 計画通り量産"},
    "Two new tier-1 customers + N2 win":      {"en":"Two new tier-1 customers + N2 win","zh":"新增兩家一線客戶 + 拿下 N2","ja":"新規大手 2 社獲得 + N2 受注"},
    # 3037 Unimicron
    "AI capex −25 % in 2027":                 {"en":"AI capex −25 % in 2027","zh":"2027 AI 資本支出 −25 %","ja":"2027 AI 設備投資 −25 %"},
    "Capacity locked, ASP +12 %/yr":          {"en":"Capacity locked, ASP +12 %/yr","zh":"產能鎖定 · ASP 年增 12 %","ja":"能力固定・ASP 年率 +12 %"},
    "Glass-core lead-time advantage":         {"en":"Glass-core lead-time advantage","zh":"玻璃基板交期領先","ja":"ガラスコア・リードタイム優位"},
    # 2383 Elite Material
    "Panasonic capacity reroutes":            {"en":"Panasonic capacity reroutes","zh":"Panasonic 產能轉移分流","ja":"Panasonic 能力転用"},
    "M8 sole-source, 1.6 T win":              {"en":"M8 sole-source, 1.6 T win","zh":"M8 獨家供貨 · 1.6 T 拿單","ja":"M8 単独供給・1.6 T 受注"},
    "CPO design win consolidation":           {"en":"CPO design win consolidation","zh":"共封裝光學設計集中拿單","ja":"CPO 設計受注集中"},
    # 3707 Episil
    "Wolfspeed dump + 8-inch slip":           {"en":"Wolfspeed dump + 8-inch slip","zh":"Wolfspeed 拋售 + 8 吋延後","ja":"Wolfspeed 投売り + 8 インチ遅延"},
    "Capacity sold, margin lift":             {"en":"Capacity sold, margin lift","zh":"產能售罄 · 毛利上升","ja":"能力完売・利益率改善"},
    "800 V DC + 8-inch on time":              {"en":"800 V DC + 8-inch on time","zh":"800 V 直流 + 8 吋如期","ja":"800 V DC + 8 インチ計画通り"},
    # 2449 KYEC
    "Inventory correction Q3 2026":           {"en":"Inventory correction Q3 2026","zh":"2026 Q3 庫存修正","ja":"2026 Q3 在庫調整"},
    "Blackwell + SLT ramp":                   {"en":"Blackwell + SLT ramp","zh":"Blackwell 與 SLT 量產","ja":"Blackwell + SLT 量産"},
    "On-device AI second leg":                {"en":"On-device AI second leg","zh":"裝置端 AI 第二段成長","ja":"オンデバイス AI 第二波"},
    # 2345 Accton
    "Hyperscaler insourcing accelerates":     {"en":"Hyperscaler insourcing accelerates","zh":"雲廠加速自製","ja":"ハイパースケーラ内製加速"},
    "800 G ramp + 1.6 T design wins":         {"en":"800 G ramp + 1.6 T design wins","zh":"800 G 量產 + 1.6 T 設計拿單","ja":"800 G 量産 + 1.6 T 受注"},
    "Sovereign + 1.6 T duopoly":              {"en":"Sovereign + 1.6 T duopoly","zh":"主權 AI + 1.6 T 雙寡占","ja":"ソブリン + 1.6 T 複占"},
    # 8996 High Power
    "HVAC giants undercut on price":          {"en":"HVAC giants undercut on price","zh":"HVAC 大廠價格競爭","ja":"HVAC 大手による価格競争"},
    "Liquid attach 70 %, margin holds":       {"en":"Liquid attach 70 %, margin holds","zh":"液冷導入率 70 % · 毛利穩","ja":"液冷導入 70 %・利益率維持"},
    "Two-phase immersion design wins":        {"en":"Two-phase immersion design wins","zh":"兩相浸沒式設計拿單","ja":"二相液浸の設計受注"},
    # 2049 Hiwin
    "Humanoid pushed to 2030":                {"en":"Humanoid pushed to 2030","zh":"人形機器人延後至 2030","ja":"ヒューマノイド 2030 年に後ろ倒し"},
    "Fab capex + humanoid pilot":             {"en":"Fab capex + humanoid pilot","zh":"晶圓廠資本支出 + 人形試產","ja":"ファブ設備投資 + ヒューマノイド試作"},
    "Humanoid early-volume 2027":             {"en":"Humanoid early-volume 2027","zh":"2027 人形機器人初期量產","ja":"2027 ヒューマノイド初期量産"},
    # 6488 GlobalWafers
    "Memory stays weak through 2027":         {"en":"Memory stays weak through 2027","zh":"記憶體疲弱延續至 2027","ja":"メモリ低迷が 2027 まで継続"},
    "LTA repricing, Texas qualifies":         {"en":"LTA repricing, Texas qualifies","zh":"長約重訂價 · 德州廠通過認證","ja":"長期契約再価格・テキサス工場認証"},
    "300 mm shortage 2028":                   {"en":"300 mm shortage 2028","zh":"2028 年 300 mm 矽晶圓短缺","ja":"2028 年 300 mm シリコン不足"},
    # 4958 Zhen Ding
    "Apple dual-sources to China":            {"en":"Apple dual-sources to China","zh":"Apple 雙供於中國廠","ja":"Apple が中国系へ二重発注"},
    "iPhone 18 + Glasses ramp":               {"en":"iPhone 18 + Glasses ramp","zh":"iPhone 18 + Glasses 量產","ja":"iPhone 18 + Glasses 量産"},
    "AI laptop super-cycle":                  {"en":"AI laptop super-cycle","zh":"AI 筆電換機潮","ja":"AI ノート PC スーパーサイクル"},
    # 3680 Gudeng
    "Export control on ASML to China":        {"en":"Export control on ASML → China","zh":"ASML 對中國輸出管制","ja":"ASML の対中輸出規制"},
    "High-NA double, Hyper-NA pilot":         {"en":"High-NA doubles, Hyper-NA pilot","zh":"High‑NA 翻倍 · Hyper‑NA 試產","ja":"High‑NA 倍増・Hyper‑NA 試作"},
    "Hyper-NA acceleration":                  {"en":"Hyper-NA acceleration","zh":"Hyper‑NA 加速","ja":"Hyper‑NA 加速"},
    # 2454 MediaTek
    "China handset −10 % 2026":               {"en":"China handset −10 % 2026","zh":"2026 中國手機 −10 %","ja":"2026 中国スマホ −10 %"},
    "9500 ramp + auto on track":              {"en":"Dimensity 9500 ramp + auto on track","zh":"Dimensity 9500 量產 · 車用如期","ja":"Dimensity 9500 量産・車載順調"},
    "PC win + auto super-cycle":              {"en":"PC win + auto super-cycle","zh":"拿下 PC + 車用換機潮","ja":"PC 受注 + 車載スーパーサイクル"},
}

# Apply
def already_tri(x):
    return isinstance(x, dict) and {"en","zh","ja"} <= set(x.keys())

for s in data['stocks']:
    # metrics
    for m in s.get('metrics', []):
        if not already_tri(m.get('k')):
            k = m['k']
            m['k'] = METRIC_K.get(k, {"en":k,"zh":k,"ja":k})
        if not already_tri(m.get('v')):
            m['v'] = tr_value(m['v'])
        if not already_tri(m.get('delta')):
            m['delta'] = tr_delta(m['delta'])
    # scenarios
    sc = s.get('scenario', {})
    for k in ['bear','base','bull']:
        node = sc.get(k)
        if node and not already_tri(node.get('label')):
            lbl = node['label']
            node['label'] = SCEN.get(lbl, {"en":lbl,"zh":lbl,"ja":lbl})

P.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print("OK — all metrics and scenario labels translated.")
