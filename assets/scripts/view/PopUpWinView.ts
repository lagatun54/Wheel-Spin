import { _decorator, AudioClip, AudioSource, easing, Tween, tween } from 'cc';
import { PopUpView } from './PopUpView';

const { ccclass, property } = _decorator;

@ccclass('PopUpWinView')
export class PopUpWinView extends PopUpView {
    @property({ tooltip: 'Через сколько секунд скрыть попап (0 — не закрывать автоматически)' })
    autoCloseSeconds = 2.5;

    @property({ tooltip: 'Сколько секунд длится набор суммы выигрыша от 0 до значения' })
    winCountDuration = 2;

    @property({ type: AudioClip, tooltip: 'Звук при открытии окна победы (не задан — без звука)' })
    openSound: AudioClip | null = null;

    @property({ type: AudioSource, tooltip: 'Источник для воспроизведения звука открытия' })
    openSoundSource: AudioSource | null = null;

    private readonly _winCountHolder = { value: 0 };

    private readonly _autoClose = () => {
        this.hide();
    };

    private _spinUnlockOnDismiss?: () => void;

    onDestroy() {
        this.stopWinCountAnimation();
        this.unschedule(this._autoClose);
        super.onDestroy();
    }

    private stopWinCountAnimation(): void {
        Tween.stopAllByTarget(this._winCountHolder);
    }

    private playOpenSound(): void {
        if (!this.openSound || !this.openSoundSource) {
            return;
        }
        this.openSoundSource.playOneShot(this.openSound);
    }

    playScaleShowAnimation(duration: number, onComplete?: () => void): void {
        this.playOpenSound();
        super.playScaleShowAnimation(duration, onComplete);
    }

    private applyWinAmountAnimated(payout: number): void {
        this.stopWinCountAnimation();
        if (!this.winAmountLabel) {
            return;
        }
        if (payout <= 0 || this.winCountDuration <= 0) {
            this.setWinAmount(payout);
            return;
        }
        this._winCountHolder.value = 0;
        this.winAmountLabel.string = '0';
        tween(this._winCountHolder)
            .to(
                this.winCountDuration,
                { value: payout },
                {
                    easing: easing.quadOut,
                    onUpdate: () => {
                        if (this.winAmountLabel?.isValid) {
                            this.winAmountLabel.string = `${Math.floor(this._winCountHolder.value)}`;
                        }
                    },
                },
            )
            .call(() => {
                if (this.winAmountLabel?.isValid) {
                    this.winAmountLabel.string = `${Math.floor(payout)}`;
                }
            })
            .start();
    }

    applyWinAmount(payout: number): void {
        this.applyWinAmountAnimated(payout);
    }

    protected onAfterHide(): void {
        this.stopWinCountAnimation();
    }

    hide(): void {
        this.unschedule(this._autoClose);
        this.playScaleHideAnimation(this.hideAnimDuration, () => {
            this.hideImmediate();
            const cb = this._spinUnlockOnDismiss;
            this._spinUnlockOnDismiss = undefined;
            cb?.();
        });
    }

    hideImmediate(): void {
        this.unschedule(this._autoClose);
        super.hideImmediate();
    }

    showWin(payout: number, onPopUpDismissed?: () => void): void {
        this.renderWin(payout, onPopUpDismissed);
    }

    renderWin(payout: number, onPopUpDismissed?: () => void): void {
        this._spinUnlockOnDismiss = onPopUpDismissed;
        this.applyWinAmountAnimated(payout);
        this.playScaleShowAnimation(this.showAnimDuration, () => {
            this.scheduleAutoClose();
        });
    }

    scheduleAutoClose(): void {
        this.unschedule(this._autoClose);
        if (this.autoCloseSeconds <= 0) {
            return;
        }
        this.scheduleOnce(this._autoClose, this.autoCloseSeconds);
    }
}
