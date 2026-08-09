import { _decorator, Component, easing, Label, tween, Tween } from 'cc';
import { Button } from '../UI/Button';

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
    private _betHandlers: PlayerBalanceBetHandlers | null = null;

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
        this.unbindBetHandlers();
        this._balanceTween?.stop();
    }

    setBalanceAndBet(balance: number, bet: number): void {
        if (this.balanceLabel) {
            this.balanceLabel.string = `${Math.floor(balance)}`;
        }
        if (this.betLabel) {
            this.betLabel.string = `${Math.floor(bet)}`;
        }
    }

    animateBalance(from: number, to: number, onComplete?: () => void): void {
        this._balanceTween?.stop();
        if (!this.balanceLabel) {
            onComplete?.();
            return;
        }

        const state = { v: from };
        this._balanceTween = tween(state)
            .to(
                this.winCountUpDuration,
                { v: to },
                {
                    easing: easing.quadOut,
                    onUpdate: () => {
                        this.balanceLabel!.string = `${Math.floor(state.v)}`;
                    },
                },
            )
            .call(() => {
                this.balanceLabel!.string = `${Math.floor(to)}`;
                this._balanceTween = null;
                onComplete?.();
            })
            .start() as Tween<{ v: number }>;
    }
}
