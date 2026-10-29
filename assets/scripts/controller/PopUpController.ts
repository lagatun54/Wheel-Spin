import type { PopUpModel } from '../model/PopUpModel';
import type { PopUpWinView } from '../view/PopUpWinView';
import type { PopUpLoseView } from '../view/PopUpLoseView';

export interface IPopUpController {
    readonly model: PopUpModel;
    hideWithAnimation(): void;
    onViewHidden(): void;
    dispose(): void;
}

/** Owns popup show/dismiss workflow; the view only renders and runs animations. */
export abstract class PopUpController<TModel extends PopUpModel, TView extends PopUpWinView | PopUpLoseView>
implements IPopUpController {
    private _disposed = false;
    private _phase: 'hidden' | 'showing' | 'visible' | 'hiding' = 'hidden';
    private _revision = 0;
    private _onDismissed?: () => void;
    private readonly _autoClose = () => this.hideWithAnimation();

    constructor(protected readonly _model: TModel, protected readonly _view: TView | null) {
        _view?.setController(this);
    }

    get model(): TModel { return this._model; }
    get isValid(): boolean { return !this._disposed && !!this._view?.isValid; }

    protected onBeforeShow(amount: number): void {}
    protected onAfterShow(amount: number): void {}

    protected showAmount(amount: number, render: (view: TView) => void, onDismissed?: () => void): void {
        this.onViewHidden();
        if (!this.isValid) {
            onDismissed?.();
            return;
        }
        const view = this._view!;
        const revision = ++this._revision;
        this._phase = 'showing';
        this._onDismissed = onDismissed;
        try {
            this.onBeforeShow(amount);
            render(view);
            view.playScaleShowAnimation(view.showAnimDuration, () => {
                if (!this.isValid || revision !== this._revision) return;
                this._phase = 'visible';
                this.onAfterShow(amount);
                if (revision === this._revision && view.autoCloseSeconds > 0) {
                    view.scheduleOnce(this._autoClose, view.autoCloseSeconds);
                }
            });
        } catch (error) {
            this.onViewHidden();
            throw error;
        }
    }

    hideWithAnimation(): void {
        if (this._phase === 'hidden' || this._phase === 'hiding') return;
        this._view?.unschedule(this._autoClose);
        if (!this.isValid) {
            this.onViewHidden();
            return;
        }
        const revision = ++this._revision;
        this._phase = 'hiding';
        try {
            this._view!.playScaleHideAnimation(this._view!.hideAnimDuration, () => {
                if (revision !== this._revision) return;
                this._view?.hideImmediate();
            });
        } catch (error) {
            this.onViewHidden();
            throw error;
        }
    }

    /** View reports a completed immediate hide; callback ownership stays here. */
    onViewHidden(): void {
        this._view?.unschedule(this._autoClose);
        ++this._revision;
        this._phase = 'hidden';
        const callback = this._onDismissed;
        this._onDismissed = undefined;
        callback?.();
    }

    dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        this._view?.setController(null);
        this.onViewHidden();
    }
}
