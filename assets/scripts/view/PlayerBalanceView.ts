import { _decorator, Component, easing, Label, tween, Tween } from 'cc';
import { Button } from '../UI/Button';
import { canEditBet, type RouletteGameModel } from '../model/RouletteGameModel';

const { ccclass, property } = _decorator;

export type PlayerBalanceBetHandlers = {
    onAdd10: () => void;
    onAdd50: () => void;
    onResetBet: () => void;
};

@ccclass('PlayerBalanceView')
export class PlayerBalanceView extends Component {
    @property({ type: Label, tooltip: 'Текущий баланс' })
    balanceLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Текущая ставка' })
    betLabel: Label | null = null;

    @property({ type: Button, tooltip: 'Увеличить ставку на 10' })
    addBet10Button: Button | null = null;

    @property({ type: Button, tooltip: 'Увеличить ставку на 50' })
    addBet50Button: Button | null = null;

    @property({ type: Button, tooltip: 'Сбросить ставку в 0' })
    resetBetButton: Button | null = null;

    @property({ tooltip: 'Длительность анимации прибавления выигрыша к балансу, сек' })
    winCountUpDuration = 0.85;

    private _balanceTween: Tween<{ v: number }> | null = null;
    private _resolveBalanceTween: (() => void) | null = null;
    private _betHandlers: PlayerBalanceBetHandlers | null = null;

    private _model: RouletteGameModel | null = null;
    private _unsubscribeModel: (() => void) | null = null;

    bindModel(model: RouletteGameModel): void {
        this.unbindModel();
        this._model = model;
        if (this.enabledInHierarchy) this.subscribeToModel();
    }

    onEnable(): void {
        this.subscribeToModel();
    }

    onDisable(): void {
        this.unsubscribeFromModel();
        this.stopBalanceAnimation();
    }

    private subscribeToModel(): void {
        if (!this._model || this._unsubscribeModel) return;
        let initial = true;
        this._unsubscribeModel = this._model.subscribe((state) => {
            if (!this.isValid) return;
            this.setButtonsInteractable(canEditBet(state));
            // The win tween owns the displayed number until presentation finishes.
            if ((initial && !this._balanceTween) || state.round.phase !== 'presenting' || state.round.result.kind !== 'win') {
                this.setBalanceAndBet(state.balance, state.bet);
            }
            initial = false;
        });
    }

    unbindModel(): void {
        this.unsubscribeFromModel();
        this._model = null;
    }

    private unsubscribeFromModel(): void {
        this._unsubscribeModel?.();
        this._unsubscribeModel = null;
    }

    public onClickBetAdd10(): void {
        this._betHandlers?.onAdd10();
    }

    public onClickBetAdd50(): void {
        this._betHandlers?.onAdd50();
    }

    public onClickBetReset(): void {
        this._betHandlers?.onResetBet();
    }

    bindBetHandlers(handlers: PlayerBalanceBetHandlers): void {
        this.unbindBetHandlers();
        this._betHandlers = handlers;
        if (this.addBet10Button) {
            this.addBet10Button.node.on(Button.EventType.CLICK, this.onClickBetAdd10, this);
        }
        if (this.addBet50Button) {
            this.addBet50Button.node.on(Button.EventType.CLICK, this.onClickBetAdd50, this);
        }
        if (this.resetBetButton) {
            this.resetBetButton.node.on(Button.EventType.CLICK, this.onClickBetReset, this);
        }
    }

    unbindBetHandlers(): void {
        this.addBet10Button?.node.off(Button.EventType.CLICK, this.onClickBetAdd10, this);
        this.addBet50Button?.node.off(Button.EventType.CLICK, this.onClickBetAdd50, this);
        this.resetBetButton?.node.off(Button.EventType.CLICK, this.onClickBetReset, this);
        this._betHandlers = null;
    }

    setButtonsInteractable(interactable: boolean): void {
        if (this.addBet10Button?.isValid) {
            this.addBet10Button.interactable = interactable;
        }
        if (this.addBet50Button?.isValid) {
            this.addBet50Button.interactable = interactable;
        }
        if (this.resetBetButton?.isValid) {
            this.resetBetButton.interactable = interactable;
        }
    }

    onDestroy() {
        this.unbindModel();
        this.unbindBetHandlers();
        this.stopBalanceAnimation();
    }

    setBalanceAndBet(balance: number, bet: number): void {
        if (this.balanceLabel) {
            this.balanceLabel.string = `${Math.floor(balance)}`;
        }
        if (this.betLabel) {
            this.betLabel.string = `${Math.floor(bet)}`;
        }
    }

    private stopBalanceAnimation(): void {
        this._balanceTween?.stop();
        this._balanceTween = null;
        const resolve = this._resolveBalanceTween;
        this._resolveBalanceTween = null;
        resolve?.();
    }

    animateBalanceAsync(from: number, to: number): Promise<void> {
        this.stopBalanceAnimation();
        return new Promise((resolve) => {
            const label = this.balanceLabel;
            if (!this.isValid || !this.enabledInHierarchy || !label?.isValid) {
                resolve();
                return;
            }
            const state = { v: from };
            label.string = `${Math.floor(from)}`;
            this._resolveBalanceTween = resolve;
            this._balanceTween = tween(state)
                .to(this.winCountUpDuration, { v: to }, {
                    easing: easing.quadOut,
                    onUpdate: () => {
                        if (label.isValid) {
                            label.string = `${Math.floor(state.v)}`;
                        }
                    },
                })
                .call(() => {
                    if (label.isValid) {
                        label.string = `${Math.floor(to)}`;
                    }
                    this._balanceTween = null;
                    this._resolveBalanceTween = null;
                    resolve();
                })
                .start();
        });
    }
}
