import { _decorator, Component, easing, EventTarget, Label, tween, Tween } from 'cc';
import { Button } from '../UI/Button';

const { ccclass, property } = _decorator;

@ccclass('PlayerBalanceView')
export class PlayerBalanceView extends Component {
    static readonly EventType = {
        ADD_BET_10: 'add-bet-10',
        ADD_BET_50: 'add-bet-50',
        RESET_BET: 'reset-bet',
    } as const;

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

    private readonly _events = new EventTarget();
    private _balanceTween: Tween<{ v: number }> | null = null;

    public onClickBetAdd10(): void {
        this._events.emit(PlayerBalanceView.EventType.ADD_BET_10);
    }

    public onClickBetAdd50(): void {
        this._events.emit(PlayerBalanceView.EventType.ADD_BET_50);
    }

    public onClickBetReset(): void {
        this._events.emit(PlayerBalanceView.EventType.RESET_BET);
    }

    on(type: string, callback: (...args: unknown[]) => void, target?: unknown): void {
        this._events.on(type, callback, target);
    }

    off(type: string, callback?: (...args: unknown[]) => void, target?: unknown): void {
        this._events.off(type, callback, target);
    }

    onLoad(): void {
        this.addBet10Button?.on(Button.EventType.CLICK, this.onClickBetAdd10, this);
        this.addBet50Button?.on(Button.EventType.CLICK, this.onClickBetAdd50, this);
        this.resetBetButton?.on(Button.EventType.CLICK, this.onClickBetReset, this);
    }

    onDestroy() {
        this.addBet10Button?.off(Button.EventType.CLICK, this.onClickBetAdd10, this);
        this.addBet50Button?.off(Button.EventType.CLICK, this.onClickBetAdd50, this);
        this.resetBetButton?.off(Button.EventType.CLICK, this.onClickBetReset, this);
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
