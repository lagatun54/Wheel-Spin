import { _decorator, AudioClip, AudioSource, easing, Tween, tween } from 'cc';
import type { PopUpWinController } from '../controller/PopUpWinController';
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

    private readonly _winCountHolder = { value: 0 };

    onDestroy() {
        this.stopWinCountAnimation();
        super.onDestroy();
    }

    private stopWinCountAnimation(): void {
        Tween.stopAllByTarget(this._winCountHolder);
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

    showWin(payout: number, onPopUpDismissed?: () => void): void {
        (this._controller as PopUpWinController | null)?.showWin(payout, onPopUpDismissed);
    }
}
