import type { RouletteColor } from '../RedBlackRandom';

export type BeginSpinFailureReason = 'no_stake' | 'no_color' | 'insufficient_funds';

export type BeginSpinResult =
    | { ok: true }
    | { ok: false; reason: BeginSpinFailureReason };

export class RouletteGameModel {
    private _balance = 0;
    private _bet = 0;
    private _pendingStake = 0;
    private _betColor: RouletteColor | null = null;

    get balance(): number {
        return this._balance;
    }

    get bet(): number {
        return this._bet;
    }

    get pendingStake(): number {
        return this._pendingStake;
    }

    get betColor(): RouletteColor | null {
        return this._betColor;
    }

    setStartingBalance(value: number): void {
        this._balance = value;
    }

    setBetColor(color: RouletteColor): void {
        this._betColor = color;
    }

    clearBetColor(): void {
        this._betColor = null;
    }

    addToBet(delta: number, maxByBalance: boolean): void {
        if (delta <= 0) {
            return;
        }
        if (this._balance <= 0) {
            return;
        }
        this._bet = maxByBalance ? Math.min(this._bet + delta, this._balance) : this._bet + delta;
    }

    resetBetAmount(): void {
        this._bet = 0;
    }

    beginSpinRound(): BeginSpinResult {
        if (this._bet <= 0) {
            return { ok: false, reason: 'no_stake' };
        }
        if (this._betColor == null) {
            return { ok: false, reason: 'no_color' };
        }
        if (this._bet > this._balance) {
            return { ok: false, reason: 'insufficient_funds' };
        }
        this._pendingStake = this._bet;
        return { ok: true };
    }

    finalizeSpin(resultColor: RouletteColor): SpinFinalizeOutcome {
        const stake = this._pendingStake;
        if (stake <= 0) {
            return { kind: 'idle' };
        }

        const betColor = this._betColor;
        if (betColor == null) {
            this._pendingStake = 0;
            return { kind: 'refund_no_color', refund: 0 };
        }

        this._pendingStake = 0;
        const won = betColor === resultColor;

        if (!won) {
            this._balance -= stake;
            return { kind: 'lose', stake };
        }

        const from = this._balance;
        const to = from + stake;
        return { kind: 'win', stake, fromBalance: from, toBalance: to };
    }

    commitBalanceAfterWin(toBalance: number): void {
        this._balance = toBalance;
    }
}

export type SpinFinalizeOutcome =
    | { kind: 'idle' }
    | { kind: 'refund_no_color'; refund: number }
    | { kind: 'lose'; stake: number }
    | { kind: 'win'; stake: number; fromBalance: number; toBalance: number };
