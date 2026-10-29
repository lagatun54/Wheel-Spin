import type { RouletteColor } from '../RedBlackRandom';

export type BeginSpinFailureReason = 'no_stake' | 'no_color' | 'insufficient_funds' | 'round_in_progress';
export type BeginSpinResult = { ok: true } | { ok: false; reason: BeginSpinFailureReason };
export type RoundResult =
    | { readonly kind: 'lose'; readonly stake: number }
    | { readonly kind: 'win'; readonly stake: number; readonly fromBalance: number; readonly toBalance: number };
export type SpinFinalizeOutcome = { kind: 'idle' } | RoundResult;

export type RoundState =
    | { readonly phase: 'betting' }
    | { readonly phase: 'spinning'; readonly stake: number; readonly color: RouletteColor }
    | { readonly phase: 'presenting'; readonly result: RoundResult };

export interface GameState {
    readonly balance: number;
    readonly bet: number;
    readonly betColor: RouletteColor | null;
    readonly round: RoundState;
}

export function canEditBet(state: GameState): boolean {
    return state.round.phase === 'betting';
}

export function canSpin(state: GameState): boolean {
    return canEditBet(state) && state.bet > 0 && state.betColor !== null && state.bet <= state.balance;
}

type StateListener = (state: GameState) => void;

/** Owns session state. Subscribers render snapshots; commands own all transitions. */
export class RouletteGameModel {
    private _state: GameState = Object.freeze({
        balance: 0, bet: 0, betColor: null, round: Object.freeze({ phase: 'betting' as const }),
    });
    private readonly listeners = new Set<StateListener>();
    private notifying = false;

    getSnapshot(): GameState { return this._state; }
    get phase(): RoundState['phase'] { return this._state.round.phase; }
    get balance(): number { return this._state.balance; }
    get bet(): number { return this._state.bet; }
    get betColor(): RouletteColor | null { return this._state.betColor; }
    get pendingStake(): number {
        return this._state.round.phase === 'spinning' ? this._state.round.stake : 0;
    }

    /** Immediately delivers the current snapshot; unsubscribe is idempotent. */
    subscribe(listener: StateListener): () => void {
        // Separate registrations may use the same callback.
        const registration: StateListener = (state) => listener(state);
        this.listeners.add(registration);
        const wasNotifying = this.notifying;
        this.notifying = true;
        try {
            registration(this._state);
        } catch (error) {
            this.listeners.delete(registration);
            throw error;
        } finally {
            this.notifying = wasNotifying;
        }
        return () => { this.listeners.delete(registration); };
    }

    private commit(state: GameState): void {
        if (this.notifying) {
            throw new Error('State subscribers must not issue synchronous commands.');
        }
        if (state.balance === this.balance && state.bet === this.bet
            && state.betColor === this.betColor && state.round === this._state.round) return;
        if (state.round.phase === 'presenting') Object.freeze(state.round.result);
        Object.freeze(state.round);
        this._state = Object.freeze(state);
        this.notifying = true;
        try {
            for (const listener of [...this.listeners]) {
                if (!this.listeners.has(listener)) continue;
                try {
                    listener(this._state);
                } catch (error) {
                    // A broken renderer must not undo a committed result or skip other renderers.
                    console.error('[RouletteGameModel] State subscriber failed.', error);
                }
            }
        } finally {
            this.notifying = false;
        }
    }

    setStartingBalance(value: number): void {
        if (canEditBet(this._state) && Number.isFinite(value) && value >= 0) {
            this.commit({ ...this._state, balance: value });
        }
    }

    setBetColor(color: RouletteColor): void {
        if (canEditBet(this._state)) this.commit({ ...this._state, betColor: color });
    }

    clearBetColor(): void {
        if (canEditBet(this._state)) this.commit({ ...this._state, betColor: null });
    }

    addToBet(delta: number, maxByBalance: boolean): void {
        if (!canEditBet(this._state) || !Number.isFinite(delta) || delta <= 0 || this.balance <= 0) return;
        const bet = maxByBalance ? Math.min(this.bet + delta, this.balance) : this.bet + delta;
        if (Number.isFinite(bet)) this.commit({ ...this._state, bet });
    }

    resetBetAmount(): void {
        if (canEditBet(this._state)) this.commit({ ...this._state, bet: 0 });
    }

    beginSpinRound(): BeginSpinResult {
        if (!canEditBet(this._state)) return { ok: false, reason: 'round_in_progress' };
        if (this.bet <= 0) return { ok: false, reason: 'no_stake' };
        if (this.betColor === null) return { ok: false, reason: 'no_color' };
        if (this.bet > this.balance) return { ok: false, reason: 'insufficient_funds' };
        this.commit({ ...this._state, round: { phase: 'spinning', stake: this.bet, color: this.betColor } });
        return { ok: true };
    }

    finalizeSpin(resultColor: RouletteColor): SpinFinalizeOutcome {
        const round = this._state.round;
        if (round.phase !== 'spinning') return { kind: 'idle' };
        const won = round.color === resultColor;
        const balance = this.balance + (won ? round.stake : -round.stake);
        const result: RoundResult = won
            ? { kind: 'win', stake: round.stake, fromBalance: this.balance, toBalance: balance }
            : { kind: 'lose', stake: round.stake };
        this.commit({ ...this._state, balance, round: { phase: 'presenting', result } });
        return result;
    }

    cancelSpinRound(): void {
        if (this.phase === 'spinning') this.commit({ ...this._state, round: { phase: 'betting' } });
    }

    finishPresentation(): void {
        if (this.phase === 'presenting') this.commit({ ...this._state, round: { phase: 'betting' } });
    }
}
