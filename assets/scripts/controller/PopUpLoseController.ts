import { PopUpLoseModel } from '../model/PopUpLoseModel';
import { PopUpController } from './PopUpController';
import type { PopUpLoseView } from '../view/PopUpLoseView';

export class PopUpLoseController extends PopUpController<PopUpLoseModel, PopUpLoseView> {
    showLose(stake: number, onPopUpDismissed?: () => void): void {
        this.showAmount(stake, (view) => view.applyLoseStake(stake), onPopUpDismissed);
    }
}
