import { PopUpWinModel } from '../model/PopUpWinModel';
import { PopUpController } from './PopUpController';
import type { PopUpWinView } from '../view/PopUpWinView';

export class PopUpWinController extends PopUpController<PopUpWinModel, PopUpWinView> {
    showWin(payout: number, onPopUpDismissed?: () => void): void {
        this.showAmount(payout, (view) => view.applyWinAmount(payout), onPopUpDismissed);
    }
}
