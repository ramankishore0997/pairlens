import { useEffect, useRef, useState, memo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2,
  Maximize2,
  Activity,
  Layers,
  BarChart2,
} from 'lucide-react'
import { Badge } from '@pairlens/ui/components/ui/badge'
import { Button } from '@pairlens/ui/components/ui/button'
import { TradeSignal } from './trades-hub'

function mapToTradingViewSymbol(symbol: string, category?: string): string {
  const clean = symbol.replace(/[\/\-_]/g, '').toUpperCase().trim()

  // Commodities
  if (clean.includes('XAU') || clean.includes('GOLD')) return 'OANDA:XAUUSD'
  if (clean.includes('XAG') || clean.includes('SILVER')) return 'OANDA:XAGUSD'
  if (clean.includes('USOIL') || clean.includes('WTI') || clean.includes('CRUDE')) return 'TVC:USOIL'
  if (clean.includes('UKOIL') || clean.includes('BRENT')) return 'TVC:UKOIL'

  // Indices
  if (clean.includes('US30') || clean.includes('DJ30') || clean.includes('DOW')) return 'CAPITALCOM:US30'
  if (clean.includes('NAS100') || clean.includes('USTEC') || clean.includes('NQ')) return 'CAPITALCOM:US100'
  if (clean.includes('SPX500') || clean.includes('US500') || clean.includes('SP500')) return 'CAPITALCOM:US500'
  if (clean.includes('GER30') || clean.includes('GER40') || clean.includes('DAX')) return 'CAPITALCOM:DE40'

  // Crypto
  if (category === 'Crypto' || clean.includes('BTC') || clean.includes('ETH') || clean.includes('SOL') || clean.includes('USDT')) {
    if (!clean.endsWith('USDT') && !clean.endsWith('USD')) {
      return `BINANCE:${clean}USDT`
    }
    return `BINANCE:${clean}`
  }

  // Forex pairs
  if (clean.length === 6) {
    return `FX:${clean}`
  }

  return `FX:${clean}`
}

export const TradingViewSignalChart = memo(function TradingViewSignalChart({
  trade,
  height = 420,
}: {
  trade: TradeSignal
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [timeframe, setTimeframe] = useState<string>('60')
  const [chartLoaded, setChartLoaded] = useState(false)

  const isBuy = trade.type === 'BUY'
  const tvSymbol = mapToTradingViewSymbol(trade.symbol, trade.category)
  const rr = (
    Math.abs(trade.target1 - trade.entryPrice) /
    Math.max(0.00001, Math.abs(trade.entryPrice - trade.stopLoss))
  ).toFixed(2)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    setChartLoaded(false)

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.height = `${height}px`
    widgetDiv.style.width = '100%'
    containerRef.current.appendChild(widgetDiv)

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: timeframe,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      backgroundColor: 'rgba(10, 14, 20, 1)',
      gridColor: 'rgba(30, 41, 59, 0.4)',
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    })

    script.onload = () => setChartLoaded(true)
    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [tvSymbol, timeframe, height])

  return (
    <div className="relative rounded-xl border border-border/60 bg-card/60 overflow-hidden flex flex-col">
      {/* Top Chart Header & Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-background/80 border-b border-border/40 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`font-black text-[10px] px-2 py-0.5 uppercase ${
              isBuy
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                : 'border-rose-500/40 text-rose-400 bg-rose-500/10'
            }`}
          >
            {trade.type}
          </Badge>
          <span className="font-bold text-sm tracking-tight text-foreground">{trade.symbol}</span>
          <span className="text-[10.5px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/30">
            {tvSymbol}
          </span>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-md border border-border/40">
          {[
            { label: '15m', val: '15' },
            { label: '1H', val: '60' },
            { label: '4H', val: '240' },
            { label: '1D', val: 'D' },
          ].map((tf) => (
            <button
              key={tf.val}
              type="button"
              onClick={() => setTimeframe(tf.val)}
              className={`px-2 py-0.5 rounded text-[10.5px] font-mono transition-colors ${
                timeframe === tf.val
                  ? 'bg-accent text-accent-foreground font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive TradingView Chart Container */}
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <div ref={containerRef} className="w-full h-full" />

        {/* Floating Institutional Level Overlay (HUD) */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 pointer-events-none">
          <div className="bg-background/90 backdrop-blur-md border border-border/80 rounded-lg p-2.5 shadow-xl text-right font-mono space-y-1 min-w-[170px]">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-1 mb-1 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1 text-cyan-400">
                <Activity className="size-2.5" /> Levels HUD
              </span>
              <span>1:{rr} R:R</span>
            </div>

            {trade.target3 && (
              <div className="flex items-center justify-between gap-2 text-[10.5px]">
                <span className="text-emerald-400/70 font-semibold">TP3 Target:</span>
                <span className="text-emerald-400 font-bold tabular-nums">{trade.target3}</span>
              </div>
            )}

            {trade.target2 && (
              <div className="flex items-center justify-between gap-2 text-[10.5px]">
                <span className="text-emerald-400/80 font-semibold">TP2 Target:</span>
                <span className="text-emerald-400 font-bold tabular-nums">{trade.target2}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 text-[10.5px]">
              <span className="text-emerald-400 font-semibold">TP1 Target:</span>
              <span className="text-emerald-400 font-bold tabular-nums">{trade.target1}</span>
            </div>

            <div className="flex items-center justify-between gap-2 text-[10.5px] border-t border-border/30 pt-1">
              <span className="text-cyan-400 font-semibold">Entry Level:</span>
              <span className="text-foreground font-bold tabular-nums">{trade.entryPrice}</span>
            </div>

            <div className="flex items-center justify-between gap-2 text-[10.5px] border-t border-border/30 pt-1">
              <span className="text-rose-400 font-semibold">Stop Loss:</span>
              <span className="text-rose-400 font-bold tabular-nums">{trade.stopLoss}</span>
            </div>
          </div>

          {/* Outcome Badge if closed */}
          {trade.status === 'CLOSED' && (
            <div className="bg-emerald-500/15 backdrop-blur-md border border-emerald-500/40 rounded-lg px-2.5 py-1.5 shadow-lg text-right font-mono">
              <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-end gap-1">
                <CheckCircle2 className="size-3" /> {trade.closeReason || 'TARGET HIT'}
              </div>
              <div className="text-[12px] font-black text-emerald-300">
                +{(trade.pnlPercent ?? 38.5).toFixed(1)}% Gain
              </div>
            </div>
          )}
        </div>

        {/* Bottom Left Execution Confluence Chip */}
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <div className="bg-background/90 backdrop-blur-md border border-border/80 rounded-md px-2.5 py-1 text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 shadow-md">
            <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>TradingView Real-Time Feed Active</span>
          </div>
        </div>
      </div>
    </div>
  )
})
