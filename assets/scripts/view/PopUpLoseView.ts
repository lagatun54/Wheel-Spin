import { _decorator, AudioClip, AudioSource, easing, Label, Tween, tween } from 'cc';
import type { PopUpLoseController } from '../controller/PopUpLoseController';
import { PopUpView } from './PopUpView';

const { ccclass, property } = _decorator;

@ccclass('PopUpLoseView')
export class PopUpLoseView extends PopUpView {
    @property({ type: Label, tooltip: 'Текст суммы / сообщения' })
    messageLabel: Label | null = null;

    @property({ tooltip: 'Через сколько секунд скрыть попап (0 — не закрывать автоматически)' })
    autoCloseSeconds = 2.5;

    @property({ tooltip: 'Сколько секунд длится набор суммы проигрыша от 0 до значения' })
    loseCountDuration = 2;

    @property({ type: AudioClip, tooltip: 'Звук при открытии окна проигрыша (не задан — без звука)' })
    openSound: AudioClip | null = null;

    private _controller: PopUpLoseController | null = null;

    private readonly _loseCountHolder = { value: 0 };

    private readonly _autoClose = () => {
        this.hide();
    };

    private _spinUnlockOnDismiss?: () => void;

    setController(controller: PopUpLoseController | null): void {
        this._controller = controller;
    }

    onDestroy() {
        this.stopLoseCountAnimation();
        this.unschedule(this._autoClose);
        super.onDestroy();
    }

    private stopLoseCountAnimation(): void {
        Tween.stopAllByTarget(this._loseCountHolder);
    }

    private playOpenSound(): void {
        if (!this.openSound) {
            return;
        }
        let source = this.node.getComponent(AudioSource);
        if (!source) {
            source = this.node.addComponent(AudioSource);
        }
        source.playOneShot(this.openSound);
    }

    playScaleShowAnimation(duration: number, onComplete?: () => void): void {
        this.playOpenSound();
        super.playScaleShowAnimation(duration, onComplete);
    }

    private applyLoseStakeAnimated(stake: number): void {
        this.stopLoseCountAnimation();
        const label = this.messageLabel;
        if (!label) {
            return;
        }
        if (stake <= 0 || this.loseCountDuration <= 0) {
            label.string = `-${Math.floor(stake)}`;
            return;
        }
        this._loseCountHolder.value = 0;
        label.string = '-0';
        tween(this._loseCountHolder)
            .to(
                this.loseCountDuration,
                { value: stake },
                {
                    easing: easing.quadOut,
                    onUpdate: () => {
                        if (label.isValid) {
                            label.string = `-${Math.floor(this._loseCountHolder.value)}`;
                        }
                    },
                },
            )
            .call(() => {
                if (label.isValid) {
                    label.string = `-${Math.floor(stake)}`;
                }
            })
            .start();
    }

    protected onAfterHide(): void {
        this.stopLoseCountAnimation();
    }

    applyLoseStake(stake: number): void {
        this.applyLoseStakeAnimated(stake);
    }

    hide(): void {
        this.unschedule(this._autoClose);
        if (this._controller) {
            this._controller.hideWithAnimation();
        } else {
            this.playScaleHideAnimation(this.hideAnimDuration, () => {
                this.hideImmediate();
                const cb = this._spinUnlockOnDismiss;
                this._spinUnlockOnDismiss = undefined;
                cb?.();
            });
        }
    }

    hideImmediate(): void {
        this.unschedule(this._autoClose);
        super.hideImmediate();
    }

    showLose(stake: number, onPopUpDismissed?: () => void): void {
        if (this._controller) {
            this._controller.showLose(stake, onPopUpDismissed);
        } else {
            this.renderLose(stake, onPopUpDismissed);
        }
    }

    renderLose(stake: number, onPopUpDismissed?: () => void): void {
        this._spinUnlockOnDismiss = onPopUpDismissed;
        this.applyLoseStake(stake);
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
