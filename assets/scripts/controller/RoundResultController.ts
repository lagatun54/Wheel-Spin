import type { SpinFinalizeOutcome } from '../model/RouletteGameModel';

import type { PopUpWinController } from './PopUpWinController';
import type { PopUpLoseController } from './PopUpLoseController';

/** Shows the result and resolves when its popup closes. */
export function showRoundResult(
    outcome: SpinFinalizeOutcome,
    winController: () => PopUpWinController | null,
    loseController: () => PopUpLoseController | null,
): Promise<void> {
    return new Promise((resolve) => {
        if (outcome.kind === 'win') {
            const controller = winController();
            if (controller?.isValid) {
                controller.showWin(outcome.stake, resolve);
                return;
            }
        } else if (outcome.kind === 'lose') {
            const controller = loseController();
            if (controller?.isValid) {
                controller.showLose(outcome.stake, resolve);
                return;
            }
        }
        resolve();
    });
}
