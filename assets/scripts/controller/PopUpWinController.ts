import { PopUpWinModel } from '../model/PopUpWinModel';
import { PopUpWinView } from '../view/PopUpWinView';
import { PopUpController } from './PopUpController';

export class PopUpWinController extends PopUpController<PopUpWinModel> {
    private _onPopUpDismissed?: () => void;

    constructor(
        model: PopUpWinModel,
        private readonly _winView: PopUpWinView | null,
    ) {
        super(model, _winView);
    }

    showWin(payout: number, onPopUpDismissed?: () => void): void {
        this.onBeforeShow(payout);
        const v = this._winView;
        if (!v) {
            onPopUpDismissed?.();
            this.onAfterShow(payout);
            return;
        }
        this._onPopUpDismissed = onPopUpDismissed;
        v.applyWinAmount(payout);
        this.animateShowPopUp(() => {
            this.onAfterShow(payout);
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
