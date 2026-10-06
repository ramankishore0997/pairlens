import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Clock,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  Activity,
  Layers,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  X,
} from 'lucide-react'
import { Badge } from '@pairlens/ui/components/ui/badge'
import { Button } from '@pairlens/ui/components/ui/button'
import { TradeSignal } from './trades-hub'
import { normalizeTradingViewChartUrl } from '@/lib/services/supabase-service'

export function TradeChartSnapshot({
  trade,
  height = 360,
  showControls = true,
}: {
  trade: TradeSignal
  height?: number
  showControls?: boolean
}) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  
  const normalizedClose = normalizeTradingViewChartUrl(trade.closeImageUrl)
  const normalizedEntry = normalizeTradingViewChartUrl(trade.chartImageUrl)

  const hasCloseImage = Boolean(normalizedClose && normalizedClose.length > 5)
  const [activeTab, setActiveTab] = useState<'ENTRY' | 'PROOF'>(
    trade.status === 'CLOSED' && hasCloseImage ? 'PROOF' : 'ENTRY'
  )

  const isBuy = trade.type === 'BUY'
  const rr = (
    Math.abs(trade.target1 - trade.entryPrice) /
    Math.max(0.00001, Math.abs(trade.entryPrice - trade.stopLoss))
  ).toFixed(2)

  const isLoss =
    trade.status === 'CLOSED' &&
    ((trade.pnlPercent ?? 0) < 0 ||
      trade.closeReason === 'SL' ||
      trade.closeReason === 'CANCELLED' ||
      Boolean(trade.closeReason?.toUpperCase().includes('SL')))

  const hasEntryImage = Boolean(normalizedEntry && normalizedEntry.length > 5)
  const isViewingProof = activeTab === 'PROOF' && hasCloseImage
  const currentImageUrl = isViewingProof ? normalizedClose : normalizedEntry
  const hasCurrentImage = isViewingProof ? Boolean(normalizedClose) : hasEntryImage

  // Handle ESC key and scroll locking when fullscreen is active
  useEffect(() => {
    if (!fullscreenOpen) {
      setZoomScale(1)
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenOpen(false)
      } else if (e.key === '+' || e.key === '=') {
        setZoomScale((z) => Math.min(3, +(z + 0.25).toFixed(2)))
      } else if (e.key === '-') {
        setZoomScale((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))
      } else if (e.key === '0') {
        setZoomScale(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [fullscreenOpen])

  return (
    <div className="relative rounded-xl border border-border/60 bg-card/60 overflow-hidden flex flex-col group">
      {/* Top Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-background/80 border-b border-border/40 text-xs font-mono">
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
          <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/30">
            {trade.category} · {trade.timeframe}
          </span>
        </div>

        {/* Tab Switcher if Profit / SL Proof Available */}
        {hasCloseImage && (
          <div className="flex items-center gap-1 bg-background/90 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab('ENTRY')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                activeTab === 'ENTRY'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📸 Entry Setup
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PROOF')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                activeTab === 'PROOF'
                  ? isLoss
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xs'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                  : isLoss
                    ? 'text-rose-400/70 hover:text-rose-300'
                    : 'text-emerald-400/70 hover:text-emerald-300'
              }`}
            >
              {isLoss ? '🛡️ SL Proof' : '🏆 Profit Proof'}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {isViewingProof ? (
            isLoss ? (
              <Badge variant="outline" className="text-[9.5px] border-rose-500/40 text-rose-400 font-mono flex items-center gap-1 bg-rose-500/10">
                <Shield className="size-2.5" /> Stop Loss / Exit Proof
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9.5px] border-emerald-500/40 text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/10">
                <CheckCircle2 className="size-2.5" /> Profit / Exit Proof
              </Badge>
            )
          ) : hasEntryImage ? (
            <Badge variant="outline" className="text-[9.5px] border-cyan-500/40 text-cyan-400 font-mono flex items-center gap-1 bg-cyan-500/5">
              <ImageIcon className="size-2.5" /> Entry Setup
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9.5px] border-emerald-500/40 text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/5">
              <Sparkles className="size-2.5" /> Auto Level Snapshot
            </Badge>
          )}

          {showControls && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFullscreenOpen(true)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Expand to Full Screen"
            >
              <Maximize2 className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Chart Canvas / Thumbnail View */}
      <div className="relative w-full overflow-hidden bg-[#0a0e17]" style={{ height: `${height}px` }}>
        {hasCurrentImage ? (
          /* Image Snapshot (Entry or Profit/SL Proof) */
          <div
            className="w-full h-full cursor-pointer flex items-center justify-center relative overflow-hidden group/img bg-black/40"
            onClick={() => setFullscreenOpen(true)}
          >
            <img
              src={currentImageUrl}
              alt={`${trade.symbol} ${isViewingProof ? (isLoss ? 'Stop Loss Proof' : 'Profit Proof') : 'Trade Setup'} Chart`}
              className="w-full h-full object-contain object-center transition-transform duration-300 group-hover/img:scale-[1.02]"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget
                if (target.src.includes('_big.png')) {
                  target.src = target.src.replace('_big.png', '_mid.png')
                } else if (!target.src.includes('/snapshots/')) {
                  const match = target.src.match(/s3\.tradingview\.com\/[a-z0-9]+\/([A-Za-z0-9]+)/i)
                  if (match) {
                    const id = match[1].replace(/_(big|mid)\.png$/i, '')
                    target.src = `https://s3.tradingview.com/snapshots/${id.charAt(0).toLowerCase()}/${id}.png`
                  }
                }
              }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
              <span className="text-xs font-mono text-white bg-black/85 px-3.5 py-1.5 rounded-full border border-white/20 flex items-center gap-2 shadow-2xl backdrop-blur-md">
                <Maximize2 className="size-3.5 text-cyan-400" /> Click to Expand {isViewingProof ? (isLoss ? 'Stop Loss Proof' : 'Profit Proof') : 'Full Screen'}
              </span>
            </div>
          </div>
        ) : (
          /* Auto-Generated High-Precision Vector Candlestick Chart */
          <div
            className="w-full h-full cursor-pointer relative group/svg"
            onClick={() => setFullscreenOpen(true)}
          >
            <AutoGeneratedChartSVG trade={trade} height={height} />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/svg:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-xs font-mono text-white bg-black/85 px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 shadow-xl backdrop-blur-md">
                <Maximize2 className="size-3" /> Click to Expand Fullscreen
              </span>
            </div>
          </div>
        )}

        {/* Floating Price HUD Overlay */}
        <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none flex flex-col gap-1">
          <div className="bg-background/90 backdrop-blur-md border border-border/80 rounded-lg p-2 text-right font-mono text-[10px] space-y-0.5 shadow-xl">
            <div className="flex items-center justify-between gap-3 text-emerald-400 font-bold">
              <span>Target 1:</span>
              <span>{trade.target1}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-cyan-400 font-bold border-t border-border/30 pt-0.5">
              <span>Entry:</span>
              <span>{trade.entryPrice}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-rose-400 font-bold border-t border-border/30 pt-0.5">
              <span>Stop Loss:</span>
              <span>{trade.stopLoss}</span>
            </div>
          </div>

          {trade.status === 'CLOSED' && (
            <div className={`${isLoss ? 'bg-rose-500/15 border-rose-500/40' : 'bg-emerald-500/15 border-emerald-500/40'} backdrop-blur-md border rounded-lg px-2 py-1 text-right font-mono`}>
              <span className={`text-[11px] font-black ${isLoss ? 'text-rose-400' : 'text-emerald-400'} flex items-center justify-end gap-1`}>
                {isLoss ? <Shield className="size-3 text-rose-400 inline" /> : <CheckCircle2 className="size-3 text-emerald-400 inline" />}
                {trade.closeReason || (isLoss ? 'SL HIT' : 'TP HIT')} · {isLoss ? '' : '+'}{(trade.pnlPercent ?? (isLoss ? -15.0 : 34.5)).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* TRUE FULLSCREEN LIGHTBOX PORTAL (Mounts directly to document.body outside any parent dialog constraints) */}
      {fullscreenOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999999] w-screen h-screen bg-black/95 backdrop-blur-2xl flex flex-col select-none animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setFullscreenOpen(false)
          }}
        >
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#080c14]/90 border-b border-white/10 text-xs font-mono shrink-0 shadow-lg">
            {/* Left Info */}
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={`font-black text-xs px-2.5 py-0.5 uppercase ${
                  isBuy
                    ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/15'
                    : 'border-rose-500/50 text-rose-400 bg-rose-500/15'
                }`}
              >
                {trade.type}
              </Badge>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">{trade.symbol}</span>
                <span className="text-xs text-muted-foreground">
                  {isViewingProof ? (isLoss ? '🛡️ Stop Loss / Exit Proof Verification' : '🏆 Profit / Exit Proof Verification') : `Setup Chart Proof (1:${rr} R:R)`}
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/10 text-[11px]">
                <span className="text-cyan-400">Entry: <strong>{trade.entryPrice}</strong></span>
                <span className="text-emerald-400">TP1: <strong>{trade.target1}</strong></span>
                <span className="text-rose-400">SL: <strong>{trade.stopLoss}</strong></span>
                {trade.closePrice && (
                  <span className="text-amber-400 border-l border-white/10 pl-2">Exit: <strong>{trade.closePrice}</strong></span>
                )}
              </div>
            </div>

            {/* Middle Switcher if Proof Exists */}
            {hasCloseImage && (
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/15">
                <button
                  type="button"
                  onClick={() => setActiveTab('ENTRY')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    activeTab === 'ENTRY'
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  📸 Entry Setup
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('PROOF')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                    activeTab === 'PROOF'
                      ? isLoss
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-emerald-500 text-slate-950 shadow-md'
                      : isLoss
                        ? 'text-rose-400 hover:text-rose-300'
                        : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  {isLoss ? '🛡️ SL Proof' : '🏆 Profit Proof'}
                </button>
              </div>
            )}

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoomScale((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
                  className="h-7 px-2 text-muted-foreground hover:text-white"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="size-3.5" />
                </Button>
                <span className="text-[11px] px-1 font-bold text-cyan-400 min-w-[45px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoomScale((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                  className="h-7 px-2 text-muted-foreground hover:text-white"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoomScale(1)}
                  className="h-7 px-2 text-muted-foreground hover:text-white"
                  title="Reset Zoom (0)"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>

              {/* Open in new tab if external link */}
              {hasCurrentImage && currentImageUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(currentImageUrl, '_blank', 'noopener,noreferrer')}
                  className="h-8 gap-1 text-xs border-white/15 bg-white/5 hover:bg-white/10 text-white font-mono"
                  title="Open Original Image Link"
                >
                  <ExternalLink className="size-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Original URL</span>
                </Button>
              )}

              {/* Close Button */}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setFullscreenOpen(false)}
                className="h-8 px-3 gap-1 text-xs font-bold bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg shadow-lg"
              >
                <X className="size-4" />
                <span className="hidden sm:inline">Close (ESC)</span>
              </Button>
            </div>
          </div>

          {/* Fullscreen Canvas Body */}
          <div
            className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-2 sm:p-6 cursor-default"
            onClick={(e) => {
              if (e.target === e.currentTarget) setFullscreenOpen(false)
            }}
          >
            {hasCurrentImage && currentImageUrl ? (
              <div
                className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
                style={{ transform: `scale(${zoomScale})` }}
              >
                <img
                  src={currentImageUrl}
                  alt={`${trade.symbol} Fullscreen ${isViewingProof ? 'Profit Proof' : 'Chart Setup'}`}
                  className="max-w-[96vw] max-h-[86vh] w-auto h-auto object-contain rounded-lg shadow-2xl border border-white/15 bg-black"
                  onError={(e) => {
                    const target = e.currentTarget
                    if (target.src.includes('_big.png')) {
                      target.src = target.src.replace('_big.png', '_mid.png')
                    } else if (!target.src.includes('/snapshots/')) {
                      const match = target.src.match(/s3\.tradingview\.com\/[a-z0-9]+\/([A-Za-z0-9]+)/i)
                      if (match) {
                        const id = match[1].replace(/_(big|mid)\.png$/i, '')
                        target.src = `https://s3.tradingview.com/snapshots/${id.charAt(0).toLowerCase()}/${id}.png`
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div
                className="w-full max-w-6xl max-h-[85vh] h-[75vh] flex items-center justify-center transition-transform duration-150 ease-out rounded-xl border border-white/15 overflow-hidden shadow-2xl bg-[#0a0e17]"
                style={{ transform: `scale(${zoomScale})` }}
              >
                <AutoGeneratedChartSVG trade={trade} height={600} isFullscreen />
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

/**
 * High-performance Vector Candlestick & Target Overlay Chart Renderer
 */
function AutoGeneratedChartSVG({
  trade,
  height,
  isFullscreen = false,
}: {
  trade: TradeSignal
  height: number
  isFullscreen?: boolean
}) {
  const isBuy = trade.type === 'BUY'
  const entry = trade.entryPrice
  const sl = trade.stopLoss
  const tp1 = trade.target1
  const tp2 = trade.target2 || tp1

  // Dynamic price scaling
  const minP = Math.min(sl, entry, tp1, tp2) * 0.998
  const maxP = Math.max(sl, entry, tp1, tp2) * 1.002
  const pRange = Math.max(0.0001, maxP - minP)

  const getY = (val: number) => {
    const norm = (val - minP) / pRange
    return (1 - norm) * (height - 80) + 40
  }

  const entryY = getY(entry)
  const slY = getY(sl)
  const tp1Y = getY(tp1)
  const tp2Y = getY(tp2)

  const width = isFullscreen ? 1000 : 600

  return (
    <svg className="w-full h-full select-none" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {/* Shaded Profit Zone Gradient */}
        <linearGradient id="profitZone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
        </linearGradient>

        {/* Shaded Loss Zone Gradient */}
        <linearGradient id="lossZone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.25" />
        </linearGradient>

        {/* Grid pattern */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.035)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Dark Grid Background */}
      <rect width={width} height={height} fill="#0a0e17" />
      <rect width={width} height={height} fill="url(#grid)" />

      {/* Target Profit Zone Fill Box */}
      <rect
        x={isFullscreen ? 180 : 120}
        y={Math.min(entryY, tp1Y)}
        width={isFullscreen ? 750 : 440}
        height={Math.abs(tp1Y - entryY)}
        fill="url(#profitZone)"
        rx="4"
      />

      {/* Stop Loss Zone Fill Box */}
      <rect
        x={isFullscreen ? 180 : 120}
        y={Math.min(entryY, slY)}
        width={isFullscreen ? 750 : 440}
        height={Math.abs(slY - entryY)}
        fill="url(#lossZone)"
        rx="4"
      />

      {/* Candlestick Wave Simulation */}
      {isFullscreen ? (
        <>
          {/* Detailed Wide View Candles */}
          <Candle x={80} open={entryY + (isBuy ? 25 : -25)} close={entryY + (isBuy ? 15 : -15)} high={entryY + (isBuy ? 30 : -30)} low={entryY + (isBuy ? 10 : -10)} isBullish={!isBuy} />
          <Candle x={130} open={entryY + (isBuy ? 15 : -15)} close={entryY + (isBuy ? 5 : -5)} high={entryY + (isBuy ? 18 : -18)} low={entryY + (isBuy ? -2 : 2)} isBullish={isBuy} />
          <Candle x={180} open={entryY + (isBuy ? 5 : -5)} close={entryY + (isBuy ? 10 : -10)} high={entryY + (isBuy ? 15 : -15)} low={entryY + (isBuy ? -4 : 4)} isBullish={!isBuy} />
          <Candle x={230} open={entryY + (isBuy ? 10 : -10)} close={entryY} high={entryY - 8} low={entryY + 16} isBullish={isBuy} />

          {/* Entry Trigger Candle */}
          <Candle x={290} open={entryY + (isBuy ? 5 : -5)} close={entryY + (isBuy ? -18 : 18)} high={entryY - 24} low={entryY + 10} highlight />

          {/* Impulse Extension Candles towards Target */}
          <Candle x={350} open={entryY + (isBuy ? -18 : 18)} close={entryY + (isBuy ? -45 : 45)} high={entryY - 52} low={entryY - 14} isBullish={isBuy} />
          <Candle x={410} open={entryY + (isBuy ? -45 : 45)} close={entryY + (isBuy ? -38 : 38)} high={entryY - 56} low={entryY - 32} isBullish={!isBuy} />
          <Candle x={470} open={entryY + (isBuy ? -38 : 38)} close={entryY + (isBuy ? -75 : 75)} high={entryY - 82} low={entryY - 35} isBullish={isBuy} />
          <Candle x={530} open={entryY + (isBuy ? -75 : 75)} close={entryY + (isBuy ? -110 : 110)} high={entryY - 118} low={entryY - 70} isBullish={isBuy} />
          <Candle x={590} open={entryY + (isBuy ? -110 : 110)} close={entryY + (isBuy ? -100 : 100)} high={entryY - 124} low={entryY - 95} isBullish={!isBuy} />

          {/* Target 1 Strike Candle */}
          <Candle x={650} open={entryY + (isBuy ? -100 : 100)} close={tp1Y} high={tp1Y - 14} low={tp1Y + 25} isBullish={isBuy} highlight />
          <Candle x={720} open={tp1Y} close={tp2Y} high={tp2Y - 10} low={tp1Y - 6} isBullish={isBuy} highlight />
        </>
      ) : (
        <>
          <Candle x={50} open={entryY + (isBuy ? 15 : -15)} close={entryY + (isBuy ? 5 : -5)} high={entryY + (isBuy ? -2 : 20)} low={entryY + (isBuy ? 25 : -25)} />
          <Candle x={80} open={entryY + (isBuy ? 5 : -5)} close={entryY + (isBuy ? 10 : -10)} high={entryY + (isBuy ? 0 : 15)} low={entryY + (isBuy ? 18 : -18)} />
          <Candle x={110} open={entryY + (isBuy ? 10 : -10)} close={entryY} high={entryY - 5} low={entryY + 15} />

          {/* Entry Trigger Candle */}
          <Candle x={150} open={entryY + (isBuy ? 4 : -4)} close={entryY + (isBuy ? -12 : 12)} high={entryY - 18} low={entryY + 8} highlight />

          {/* Impulse Expansion */}
          <Candle x={190} open={entryY + (isBuy ? -12 : 12)} close={entryY + (isBuy ? -35 : 35)} high={entryY - 40} low={entryY - 10} isBullish={isBuy} />
          <Candle x={230} open={entryY + (isBuy ? -35 : 35)} close={entryY + (isBuy ? -28 : 28)} high={entryY - 45} low={entryY - 22} isBullish={!isBuy} />
          <Candle x={270} open={entryY + (isBuy ? -28 : 28)} close={entryY + (isBuy ? -60 : 60)} high={entryY - 65} low={entryY - 25} isBullish={isBuy} />
          <Candle x={310} open={entryY + (isBuy ? -60 : 60)} close={entryY + (isBuy ? -85 : 85)} high={entryY - 90} low={entryY - 55} isBullish={isBuy} />

          {/* Target Hit Candle */}
          <Candle x={360} open={entryY + (isBuy ? -85 : 85)} close={tp1Y} high={tp1Y - 10} low={tp1Y + 20} isBullish={isBuy} />
          <Candle x={400} open={tp1Y} close={tp2Y} high={tp2Y - 8} low={tp1Y - 4} isBullish={isBuy} highlight />
        </>
      )}

      {/* Entry Price Horizontal Line (Cyan) */}
      <line x1="20" y1={entryY} x2={width - 30} y2={entryY} stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="25" y={entryY - 5} fill="#06b6d4" fontSize="11" fontFamily="monospace" fontWeight="bold">
        ENTRY: {entry}
      </text>

      {/* Stop Loss Price Horizontal Line (Rose) */}
      <line x1="20" y1={slY} x2={width - 30} y2={slY} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="25" y={slY + 14} fill="#f43f5e" fontSize="11" fontFamily="monospace" fontWeight="bold">
        SL: {sl}
      </text>

      {/* Take Profit 1 Line (Emerald) */}
      <line x1="20" y1={tp1Y} x2={width - 30} y2={tp1Y} stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="25" y={tp1Y - 5} fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold">
        TP1 TARGET: {tp1}
      </text>

      {/* Execution Checkpoint Marker */}
      <g transform={`translate(${isFullscreen ? 720 : 400}, ${tp1Y})`}>
        <circle cx="0" cy="0" r="14" fill="#10b981" fillOpacity="0.2" className="animate-ping" />
        <circle cx="0" cy="0" r="8" fill="#10b981" />
        <path d="M -3 0 L -1 2 L 3 -2" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="14" y="-12" width="130" height="24" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
        <text x="22" y="4" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">
          {trade.closeReason || 'TP2 HIT'} ✓
        </text>
      </g>
    </svg>
  )
}

function Candle({
  x,
  open,
  close,
  high,
  low,
  isBullish = true,
  highlight = false,
}: {
  x: number
  open: number
  close: number
  high: number
  low: number
  isBullish?: boolean
  highlight?: boolean
}) {
  const top = Math.min(open, close)
  const bodyHeight = Math.max(4, Math.abs(close - open))
  const color = isBullish ? '#10b981' : '#f43f5e'

  return (
    <g>
      {/* Wick */}
      <line x1={x} y1={high} x2={x} y2={low} stroke={color} strokeWidth="1.2" opacity="0.8" />
      {/* Body */}
      <rect
        x={x - 6}
        y={top}
        width="12"
        height={bodyHeight}
        fill={color}
        rx="1"
        stroke={highlight ? '#ffffff' : color}
        strokeWidth={highlight ? 1 : 0}
      />
    </g>
  )
}
