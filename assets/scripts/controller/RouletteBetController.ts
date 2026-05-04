import { getPopUpLoseViewOrNull, getPopUpWinViewOrNull } from '../di/popupBindings';
import { type RouletteColor } from '../RedBlackRandom';
import type { RouletteGameModel } from '../model/RouletteGameModel';
import { RouletteBetView } from '../view/RouletteBetView';

export class RouletteBetController {
    constructor(
        private readonly view: RouletteBetView,
        private readonly model: RouletteGameModel,
    ) {}

    static showWinPopUp(payout: number, onPopUpDismissed?: () => void): void {
        const v = getPopUpWinViewOrNull();
        if (!v) {
            onPopUpDismissed?.();
            return;
        }
        v.showWin(payout, onPopUpDismissed);
    }

    static showLosePopUp(stake: number, onPopUpDismissed?: () => void): void {
        const v = getPopUpLoseViewOrNull();
        if (!v) {
            onPopUpDismissed?.();
            return;
        }
        v.showLose(stake, onPopUpDismissed);
    }

    start(): void {
        this.view.bindBetHandlers({
            onRed: () => this.applyBetColor('red'),
            onBlack: () => this.applyBetColor('black'),
        });
    }

    dispose(): void {
        this.view.unbindBetHandlers();
    }

    private applyBetColor(color: RouletteColor): void {
        const m = this.model;
        m.setBetColor(color);
        this.view.applyBetColorHighlight(m.betColor);
    }
}
