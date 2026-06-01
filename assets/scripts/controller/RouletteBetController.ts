import { getPopUpLoseViewOrNull, getPopUpWinViewOrNull } from '../di/popupBindings';
import { type RouletteColor } from '../RedBlackRandom';
import { RouletteBetView } from '../view/RouletteBetView';
import type { RouletteGameController } from './RouletteGameController';

export class RouletteBetController {
    constructor(
        private readonly view: RouletteBetView,
        private readonly game: RouletteGameController,
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
        this.game.dispatch({ type: 'bet/color_set', color });
    }
}
