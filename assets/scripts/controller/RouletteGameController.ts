import { pickRandomRouletteSlot5050, type RouletteColor } from '../RedBlackRandom';
import { RouletteGameModel, type SpinFinalizeOutcome } from '../model/RouletteGameModel';
import { PlayerBalanceView } from '../view/PlayerBalanceView';
import { RouletteBetView } from '../view/RouletteBetView';
import { RouletteBetController } from './RouletteBetController';

export type RouletteGameControllerOptions = {
    balanceView: PlayerBalanceView;
    betView: RouletteBetView;
    startingBalance: number;
};

export class RouletteGameController {
    private readonly _model = new RouletteGameModel();
    private readonly _balanceView: PlayerBalanceView;
    private readonly _betView: RouletteBetView;
    private _spinInputLocked = false;
    private readonly _spinUiUnlockListeners = new Map<number, () => void>();
    private _spinUiUnlockListenerId = 0;

    constructor(options: RouletteGameControllerOptions) {
        this._balanceView = options.balanceView;
        this._betView = options.betView;
        this._model.setStartingBalance(options.startingBalance);
    }

    get model(): RouletteGameModel {
        return this._model;
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
            view.setBalanceAndBet(this._model.balance, this._model.bet);
        }
    }

    private syncBetColorSelectionView(): void {
        const betView = this._betView;
        if (!betView?.isValid) {
            return;
        }
        betView.applyBetColorHighlight(this._model.betColor);
    }

    beginSpinRound(): boolean {
        if (this._spinInputLocked) {
            return false;
        }
        const result = this._model.beginSpinRound();
        if (result.ok === false) {
            return false;
        }
        this.refreshBalanceView();
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
        const outcome = this._model.finalizeSpin(resultColor);
        this.syncBetColorSelectionView();

        if (outcome.kind === 'idle') {
            return outcome;
        }

        if (outcome.kind === 'refund_no_color') {
            this.refreshBalanceView();
            return outcome;
        }

        if (outcome.kind === 'lose') {
            this.refreshBalanceView();
            this._spinInputLocked = true;
            RouletteBetController.showLosePopUp(outcome.stake, () => this.notifySpinUiUnlocked());
            return outcome;
        }

        const { fromBalance, toBalance } = outcome;
        this.refreshBalanceView();

        this._spinInputLocked = true;
        RouletteBetController.showWinPopUp(toBalance - fromBalance, () => this.notifySpinUiUnlocked());

        const view = this.balanceView;
        if (view) {
            view.animateBalance(fromBalance, toBalance, () => {
                this._model.commitBalanceAfterWin(toBalance);
                view.setBalanceAndBet(this._model.balance, this._model.bet);
            });
        } else {
            this._model.commitBalanceAfterWin(toBalance);
            this.refreshBalanceView();
        }

        return outcome;
    }
}
