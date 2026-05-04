import type { PopUpModel } from '../model/PopUpModel';
import type { PopUpView } from '../view/PopUpView';

export interface IPopUpController {
    readonly model: PopUpModel;
}

export abstract class PopUpController<TModel extends PopUpModel> implements IPopUpController {
    constructor(
        protected readonly _model: TModel,
        protected readonly _view: PopUpView | null,
    ) {}

    get model(): TModel {
        return this._model;
    }

    protected onBeforeShow(amount: number): void {}

    protected onAfterShow(amount: number): void {}

    hideWithAnimation(): void {
        this.animateHidePopUp(() => {
            this._view?.hideImmediate();
        });
    }

    protected animateShowPopUp(onComplete?: () => void): void {
        const view = this._view;
        if (!view?.node?.isValid) {
            onComplete?.();
            return;
        }
        view.playScaleShowAnimation(view.showAnimDuration, onComplete);
    }

    protected animateHidePopUp(onComplete?: () => void): void {
        const view = this._view;
        if (!view?.node?.isValid) {
            onComplete?.();
            return;
        }
        view.playScaleHideAnimation(view.hideAnimDuration, onComplete);
    }
}
