import { slotNumberToColor } from '../RedBlackRandom';
import type { SpinRequest, SpinResponse } from '../network/FakeRouletteApi';
import { RouletteGameModel, type SpinFinalizeOutcome } from '../model/RouletteGameModel';

import type { PlayerBalanceView } from '../view/PlayerBalanceView';
import type { RouletteGameView } from '../view/RouletteGameView';

export type RouletteGameControllerOptions = {
    balanceView: PlayerBalanceView;
    startingBalance: number;
    showResult: (outcome: SpinFinalizeOutcome) => Promise<void>;
    requestSpin: (request: SpinRequest) => Promise<SpinResponse>;
};

/** Handles round commands; models own state and views observe it directly. */
export class RouletteGameController {
    readonly model = new RouletteGameModel();
    private _disposed = false;

    constructor(private readonly options: RouletteGameControllerOptions) {
        this.model.setStartingBalance(options.startingBalance);
    }

    async playRoundAsync(view: RouletteGameView): Promise<void> {
        if (this._disposed || !view.isValid || !view.enabledInHierarchy || !this.model.beginSpinRound().ok) {
            return;
        }
        try {
            const round = this.model.getSnapshot().round;
            if (round.phase !== 'spinning') return;
            const { slot } = await this.options.requestSpin({ stake: round.stake, color: round.color });
            if (this._disposed || !view.isValid || !view.enabledInHierarchy) return;
            const color = slotNumberToColor(slot);
            if (!await view.playWheelAsync(slot) || this._disposed || !view.isValid || !view.enabledInHierarchy) {
                return;
            }

            const outcome = this.model.finalizeSpin(color);
            view.showLastResult(outcome);
            const balance = this.options.balanceView;
            // The model has already committed the result. Animation changes display only.
            const failures: unknown[] = [];
            await Promise.all([
                Promise.resolve().then(() => outcome.kind === 'win' && balance.isValid
                    ? balance.animateBalanceAsync(outcome.fromBalance, outcome.toBalance)
                    : undefined),
                Promise.resolve().then(() => this.options.showResult(outcome)),
            ].map((effect) => effect.catch((error) => {
                failures.push(error);
            })));
            if (failures.length > 0) {
                throw failures[0];
            }
            if (!this._disposed && view.isValid) {
                view.playLastResultBlink();
            }
        } finally {
            this.model.cancelSpinRound();
            this.model.finishPresentation();
        }
    }

    dispose(): void {
        this._disposed = true;
        this.model.cancelSpinRound();
        this.model.finishPresentation();
    }
}
