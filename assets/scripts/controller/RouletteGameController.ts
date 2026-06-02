import { pickRandomRouletteSlot5050, type RouletteColor } from '../RedBlackRandom';
import {
    applyAction,
    canBeginSpin,
    createRouletteGameState,
    type ApplyActionResult,
    type RouletteGameAction,
    type RouletteGameState,
    type SpinFinalizeOutcome,
} from '../model/RouletteGameModel';

export type RouletteGameControllerOptions = {
    startingBalance: number;
    onBalanceChanged?: (state: RouletteGameState) => void;
    onBetColorChanged?: (state: RouletteGameState) => void;
    onShowLosePopup?: (stake: number, onDismissed: () => void) => void;
    onShowWinPopup?: (payout: number, onDismissed: () => void) => void;
    onAnimateBalance?: (
        fromBalance: number,
        toBalance: number,
        onComplete: () => void,
    ) => void;
};

export type RouletteGameDispatch = (action: RouletteGameAction) => void;
export type RouletteGameStateReader = () => RouletteGameState;

export interface RouletteGameSpinApi {
    beginSpinRound(): boolean;
    finalizeSpin(resultColor: RouletteColor): SpinFinalizeOutcome;
    onceSpinUiUnlocked(cb: () => void): void;
    wheelAngleForSlot(slot: number, initialWheelAngleDeg: number, slotAngleOffsetDeg: number): number;
    pickRandomSlot1to8(): number;
}

export interface RouletteGameStoreApi extends RouletteGameSpinApi {
    readonly state: RouletteGameState;
    dispatch: RouletteGameDispatch;
    refreshBalanceView(): void;
}

export class RouletteGameController {
    private _state: RouletteGameState;
    private readonly _spinUiUnlockListeners = new Set<() => void>();
    private readonly _onBalanceChanged?: (state: RouletteGameState) => void;
    private readonly _onBetColorChanged?: (state: RouletteGameState) => void;
    private readonly _onShowLosePopup?: (stake: number, onDismissed: () => void) => void;
    private readonly _onShowWinPopup?: (payout: number, onDismissed: () => void) => void;
    private readonly _onAnimateBalance?: (
        fromBalance: number,
        toBalance: number,
        onComplete: () => void,
    ) => void;

    private _spinInputLocked = false;

    constructor(options: RouletteGameControllerOptions) {
        this._state = createRouletteGameState(options.startingBalance);
        this._onBalanceChanged = options.onBalanceChanged;
        this._onBetColorChanged = options.onBetColorChanged;
        this._onShowLosePopup = options.onShowLosePopup;
        this._onShowWinPopup = options.onShowWinPopup;
        this._onAnimateBalance = options.onAnimateBalance;
    }

    get state(): RouletteGameState {
        return this._state;
    }

    start(): void {
        this.refreshBalanceView();
    }

    dispatch(action: RouletteGameAction): void {
        this.applyActionResult(applyAction(this._state, action), action);
    }

    beginSpinRound(): boolean {
        if (this._spinInputLocked) {
            return false;
        }
        if (!canBeginSpin(this._state).ok) {
            return false;
        }
        this.dispatch({ type: 'spin/begin' });
        return true;
    }

    finalizeSpin(resultColor: RouletteColor): SpinFinalizeOutcome {
        const result = applyAction(this._state, { type: 'spin/finalize', resultColor });
        this.applyActionResult(result, { type: 'spin/finalize', resultColor });
        return result.spinOutcome ?? { kind: 'idle' };
    }

    refreshBalanceView(): void {
        this._onBalanceChanged?.(this._state);
    }

    onceSpinUiUnlocked(cb: () => void): void {
        if (!this._spinInputLocked) {
            cb();
        } else {
            this._spinUiUnlockListeners.add(cb);
        }
    }

    wheelAngleForSlot(slot: number, initialWheelAngleDeg: number, slotAngleOffsetDeg: number): number {
        const step = 360 / 8;
        const slotCenterAngle = (slot - 1) * step;
        return slotCenterAngle + initialWheelAngleDeg - slotAngleOffsetDeg;
    }

    pickRandomSlot1to8(): number {
        return pickRandomRouletteSlot5050();
    }

    private applyActionResult(result: ApplyActionResult, action: RouletteGameAction): void {
        this._state = result.state;

        switch (action.type) {
            case 'bet/add':
            case 'bet/reset':
            case 'spin/begin':
            case 'balance/commit_win':
                this.refreshBalanceView();
                break;

            case 'bet/color_set':
            case 'bet/color_clear':
                this.syncBetColorSelectionView();
                break;

            case 'spin/finalize':
                this.syncBetColorSelectionView();
                this.refreshBalanceView();
                this.handleSpinOutcome(result.spinOutcome);
                break;
        }
    }

    private handleSpinOutcome(outcome: SpinFinalizeOutcome | undefined): void {
        if (!outcome) {
            return;
        }

        switch (outcome.kind) {
            case 'idle':
            case 'refund_no_color':
                break;

            case 'lose':
                this.showLosePopup(outcome.stake);
                break;

            case 'win':
                this.showWinPopup(outcome.toBalance - outcome.fromBalance);
                this.animateBalance(outcome.fromBalance, outcome.toBalance);
                break;
        }
    }

    private syncBetColorSelectionView(): void {
        this._onBetColorChanged?.(this._state);
    }

    private showLosePopup(stake: number): void {
        this._spinInputLocked = true;
        if (this._onShowLosePopup) {
            this._onShowLosePopup(stake, () => this.notifySpinUiUnlocked());
        } else {
            this.notifySpinUiUnlocked();
        }
    }

    private showWinPopup(payout: number): void {
        this._spinInputLocked = true;
        if (this._onShowWinPopup) {
            this._onShowWinPopup(payout, () => this.notifySpinUiUnlocked());
        } else {
            this.notifySpinUiUnlocked();
        }
    }

    private animateBalance(fromBalance: number, toBalance: number): void {
        const commitWin = () => this.dispatch({ type: 'balance/commit_win', toBalance });
        if (this._onAnimateBalance) {
            this._onAnimateBalance(fromBalance, toBalance, commitWin);
        } else {
            commitWin();
        }
    }

    private notifySpinUiUnlocked(): void {
        this._spinInputLocked = false;
        for (const fn of this._spinUiUnlockListeners) {
            fn();
        }
        this._spinUiUnlockListeners.clear();
    }
}
