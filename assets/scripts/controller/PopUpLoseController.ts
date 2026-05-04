import { PopUpLoseModel } from '../model/PopUpLoseModel';
import { PopUpLoseView } from '../view/PopUpLoseView';
import { PopUpController } from './PopUpController';

export class PopUpLoseController extends PopUpController<PopUpLoseModel> {
    private _onPopUpDismissed?: () => void;

    constructor(
        model: PopUpLoseModel,
        private readonly _loseView: PopUpLoseView | null,
    ) {
        super(model, _loseView);
    }

    showLose(stake: number, onPopUpDismissed?: () => void): void {
        this.onBeforeShow(stake);
        const v = this._loseView;
        if (!v) {
            onPopUpDismissed?.();
            this.onAfterShow(stake);
            return;
        }
        this._onPopUpDismissed = onPopUpDismissed;
        v.applyLoseStake(stake);
        this.animateShowPopUp(() => {
            this.onAfterShow(stake);
            v.scheduleAutoClose();
        });
    }

    hideWithAnimation(): void {
        this.animateHidePopUp(() => {
            this._view?.hideImmediate();
            const cb = this._onPopUpDismissed;
            this._onPopUpDismissed = undefined;
            cb?.();
        });
    }
}
