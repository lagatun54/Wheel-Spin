import { pickRandomRouletteSlot5050, type RouletteColor } from '../RedBlackRandom';
import {
    createRouletteGameState,
    reduceRouletteGame,
    type RouletteGameAction,
    type RouletteGameCommand,
    type RouletteGameState,
    type SpinFinalizeOutcome,
} from '../model/RouletteGameModel';
import { PlayerBalanceView } from '../view/PlayerBalanceView';
import { RouletteBetView } from '../view/RouletteBetView';
import { RouletteBetController } from './RouletteBetController';

export type RouletteGameControllerOptions = {
    balanceView: PlayerBalanceView;
    betView: RouletteBetView;
    startingBalance: number;
};

export class RouletteGameController {
    private _state: RouletteGameState;
    private readonly _balanceView: PlayerBalanceView;
    private readonly _betView: RouletteBetView;
    private _spinInputLocked = false;
    private readonly _spinUiUnlockListeners = new Map<number, () => void>();
    private _spinUiUnlockListenerId = 0;

    constructor(options: RouletteGameControllerOptions) {
        this._balanceView = options.balanceView;
        this._betView = options.betView;
        this._state = createRouletteGameState(options.startingBalance);
    }

    get state(): RouletteGameState {
        return this._state;
    }

    dispatch(action: RouletteGameAction): void {
        const reduced = reduceRouletteGame(this._state, action);
        this._state = reduced.state;
        this.executeCommands(reduced.commands);
    }

    start(): void {
        this.refreshBalanceView();
    }

    private get balanceView(): PlayerBalanceView | null {
        return this._balanceView.isValid ? this._balanceView : null;
    }

    refreshBalanceView(): void {
        const view = this.balanceView;
        if (view) {
            view.setBalanceAndBet(this._state.balance, this._state.bet);
        }
    }

    private syncBetColorSelectionView(): void {
        const betView = this._betView;
        if (!betView?.isValid) {
            return;
        }
        betView.applyBetColorHighlight(this._state.betColor);
    }

    private executeCommands(commands: RouletteGameCommand[]): void {
        for (const command of commands) {
            switch (command.type) {
                case 'none':
                    break;
                case 'refresh_balance':
                    this.refreshBalanceView();
                    break;
                case 'sync_bet_color':
                    this.syncBetColorSelectionView();
                    break;
                case 'show_lose_popup':
                    this._spinInputLocked = true;
                    RouletteBetController.showLosePopUp(command.stake, () => this.notifySpinUiUnlocked());
                    break;
                case 'show_win_popup':
                    this._spinInputLocked = true;
                    RouletteBetController.showWinPopUp(command.payout, () => this.notifySpinUiUnlocked());
                    break;
                case 'animate_balance': {
                    const view = this.balanceView;
                    if (view) {
                        view.animateBalance(command.fromBalance, command.toBalance, () => {
                            this.dispatch({
                                type: 'balance/commit_win',
                                toBalance: command.toBalance,
                            });
                        });
                    } else {
                        this.dispatch({
                            type: 'balance/commit_win',
                            toBalance: command.toBalance,
                        });
                    }
                    break;
                }
            }
        }
    }

    beginSpinRound(): boolean {
        if (this._spinInputLocked) {
            return false;
        }
        const reduced = reduceRouletteGame(this._state, { type: 'spin/begin' });
        if (reduced.effect.type !== 'begin_spin' || reduced.effect.result.ok === false) {
            return false;
        }
        this._state = reduced.state;
        this.executeCommands(reduced.commands);
        return true;
    }

    onceSpinUiUnlocked(cb: () => void): void {
        if (!this._spinInputLocked) {
            cb();
        } else {
            const id = ++this._spinUiUnlockListenerId;
            this._spinUiUnlockListeners.set(id, cb);
        }
    }

    private notifySpinUiUnlocked(): void {
        this._spinInputLocked = false;
        for (const fn of this._spinUiUnlockListeners.values()) {
            fn();
        }
        this._spinUiUnlockListeners.clear();
    }

    wheelAngleForSlot(slot: number, initialWheelAngleDeg: number, slotAngleOffsetDeg: number): number {
        const step = 360 / 8;
        const slotCenterAngle = (slot - 1) * step;
        return slotCenterAngle + initialWheelAngleDeg - slotAngleOffsetDeg;
    }

    pickRandomSlot1to8(): number {
        return pickRandomRouletteSlot5050();
    }

    finalizeSpin(resultColor: RouletteColor): SpinFinalizeOutcome {
        const reduced = reduceRouletteGame(this._state, { type: 'spin/finalize', resultColor });
        this._state = reduced.state;
        const outcome =
            reduced.effect.type === 'finalize_spin' ? reduced.effect.outcome : { kind: 'idle' as const };
        this.executeCommands(reduced.commands);
        return outcome;
    }
}
