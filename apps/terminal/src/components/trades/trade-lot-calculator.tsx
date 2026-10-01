import { useState, useMemo } from 'react'
import {
  Calculator,
  Shield,
  Target,
  DollarSign,
  Percent,
  Copy,
  Check,
  Zap,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react'
import { Button } from '@pairlens/ui/components/ui/button'
import { Input } from '@pairlens/ui/components/ui/input'
import { Badge } from '@pairlens/ui/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@pairlens/ui/components/ui/dialog'
import { toast } from 'sonner'
import { TradeSignal } from './trades-hub'

export function TradeLotCalculatorModal({
  trade,
  open,
  onOpenChange,
}: {
  trade: TradeSignal | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [accountBalance, setAccountBalance] = useState<number>(1000)
  const [riskPercent, setRiskPercent] = useState<number>(1)
  const [copied, setCopied] = useState(false)

  if (!trade) return null

  const isBuy = trade.type === 'BUY'
  const isJpy = trade.symbol.includes('JPY')
  const isGold = trade.symbol.includes('XAU') || trade.symbol.includes('GOLD')
  const isCrypto = trade.category === 'Crypto' || trade.symbol.includes('BTC') || trade.symbol.includes('ETH')

  // Calculate SL distance
  const slDistance = Math.abs(trade.entryPrice - trade.stopLoss)

  // Calculate Pips
  const pipsDistance = useMemo(() => {
    if (isJpy) return Number((slDistance * 100).toFixed(1))
    if (isGold) return Number((slDistance * 10).toFixed(1))
    if (isCrypto) return Number((slDistance).toFixed(2))
    return Number((slDistance * 10000).toFixed(1))
  }, [slDistance, isJpy, isGold, isCrypto])

  // Dollar amount at risk
  const riskAmountDollars = useMemo(() => {
    return (accountBalance * riskPercent) / 100
  }, [accountBalance, riskPercent])

  // Standard Lot Size Calculation
  const calculatedLotSize = useMemo(() => {
    if (pipsDistance <= 0) return 0.01

    if (isGold) {
      // 1 standard lot = 100 oz. $1 move = $100 per lot.
      const lot = riskAmountDollars / Math.max(0.01, slDistance * 100)
      return Math.max(0.01, Number(lot.toFixed(2)))
    }

    if (isCrypto) {
      // Direct contract / coin units
      const units = riskAmountDollars / Math.max(0.01, slDistance)
      return Math.max(0.001, Number(units.toFixed(3)))
    }

    // Forex: Standard Lot = 100,000 units ($10/pip). Pip value = $10 * lot
    const lot = riskAmountDollars / (pipsDistance * 10)
    return Math.max(0.01, Number(lot.toFixed(2)))
  }, [riskAmountDollars, slDistance, pipsDistance, isGold, isCrypto])

  // Reward Calculations
  const tp1Distance = Math.abs(trade.target1 - trade.entryPrice)
  const tp1Pips = isJpy ? tp1Distance * 100 : isGold ? tp1Distance * 10 : isCrypto ? tp1Distance : tp1Distance * 10000
  const tp1RewardDollars = ((tp1Distance / Math.max(0.00001, slDistance)) * riskAmountDollars).toFixed(2)
  const tp1Rr = (tp1Distance / Math.max(0.00001, slDistance)).toFixed(2)

  const tp2Distance = trade.target2 ? Math.abs(trade.target2 - trade.entryPrice) : 0
  const tp2RewardDollars = trade.target2 ? ((tp2Distance / Math.max(0.00001, slDistance)) * riskAmountDollars).toFixed(2) : null
  const tp2Rr = trade.target2 ? (tp2Distance / Math.max(0.00001, slDistance)).toFixed(2) : null

  const handleCopySetupWithRisk = async () => {
    const text = `📊 PAIRLENS RISK & LOT PLAN
Pair: ${trade.symbol} (${trade.type})
Account Balance: $${accountBalance.toLocaleString()}
Risk: ${riskPercent}% ($${riskAmountDollars.toFixed(2)})
Recommended Lot Size: ${calculatedLotSize} ${isCrypto ? 'Units' : 'Lots'}
----------------------------
Entry: ${trade.entryPrice}
Stop Loss: ${trade.stopLoss} (${pipsDistance} pips)
Target 1: ${trade.target1} (+$${tp1RewardDollars} · 1:${tp1Rr} R:R)
${trade.target2 ? `Target 2: ${trade.target2} (+$${tp2RewardDollars} · 1:${tp2Rr} R:R)` : ''}
⚡ Calculated on Pairlens Terminal`

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      }
      setCopied(true)
      toast.success('Risk & Lot Size calculation copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border/80 font-mono">
        <DialogHeader>
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  isBuy
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                    : 'border-rose-500 text-rose-400 bg-rose-500/10'
                }
              >
                {trade.type}
              </Badge>
              <span className="font-bold text-base text-foreground">{trade.symbol}</span>
            </div>
            <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 text-xs">
              <Shield className="size-3 mr-1 inline" /> Risk Manager
            </Badge>
          </div>

          <DialogTitle className="text-base font-bold mt-2 flex items-center gap-2">
            <Calculator className="size-4 text-cyan-400" /> Lot Size & Risk Calculator
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Instantly calculate exact lot sizing and profit projection based on your account balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Inputs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Account Balance ($)</label>
              <Input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Math.max(10, Number(e.target.value)))}
                className="font-bold text-foreground bg-background/80"
              />
              <div className="flex items-center gap-1 mt-1.5">
                {[500, 1000, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAccountBalance(preset)}
                    className="text-[9.5px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground hover:text-foreground border border-border/30"
                  >
                    ${preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Risk Percentage (%)</label>
              <Input
                type="number"
                step="0.25"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Math.max(0.1, Number(e.target.value)))}
                className="font-bold text-rose-400 bg-background/80"
              />
              <div className="flex items-center gap-1 mt-1.5">
                {[0.5, 1, 2, 3].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRiskPercent(preset)}
                    className={`text-[9.5px] px-1.5 py-0.5 rounded border transition-colors ${
                      riskPercent === preset
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold'
                        : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border/30'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sizing Output Hero Box */}
          <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 via-card/70 to-card/90 p-4 text-center space-y-2 shadow-lg">
            <span className="text-[10px] uppercase tracking-wider text-cyan-400/90 font-bold block">
              Recommended Position Size
            </span>
            <div className="text-3xl font-black text-foreground tracking-tight flex items-baseline justify-center gap-1.5">
              <span>{calculatedLotSize}</span>
              <span className="text-sm font-normal text-muted-foreground font-sans">
                {isCrypto ? 'Units' : 'Standard Lots'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-4 text-[11px] pt-1 border-t border-border/40 text-muted-foreground">
              <span>SL Distance: <strong className="text-foreground">{pipsDistance} pips</strong></span>
              <span>Max Loss: <strong className="text-rose-400">-${riskAmountDollars.toFixed(2)}</strong></span>
            </div>
          </div>

          {/* Potential Reward Breakdown */}
          <div className="space-y-1.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="size-3 text-emerald-400" /> Target 1 Return:
              </span>
              <span className="font-bold text-emerald-400">
                +${tp1RewardDollars} (1:{tp1Rr} R:R)
              </span>
            </div>

            {trade.target2 && (
              <div className="flex items-center justify-between border-t border-emerald-500/10 pt-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Target className="size-3 text-emerald-400" /> Target 2 Return:
                </span>
                <span className="font-bold text-emerald-400">
                  +${tp2RewardDollars} (1:{tp2Rr} R:R)
                </span>
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleCopySetupWithRisk}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-9 gap-1.5 text-xs shadow-md"
          >
            {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied Calculation!' : 'Copy Risk Plan for Broker'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
