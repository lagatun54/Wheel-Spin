import type { RouletteGameModel } from '../model/RouletteGameModel';
import { PlayerBalanceView } from '../view/PlayerBalanceView';

export class PlayerBalanceController {
    constructor(
        private readonly view: PlayerBalanceView,
        private readonly model: RouletteGameModel,
    ) {}

    start(): void {
        this.view.bindBetHandlers({
            onAdd10: () => this.addToBet(10),
            onAdd50: () => this.addToBet(50),
            onResetBet: () => this.resetBet(),
        });
        const m = this.model;
        this.view.setBalanceAndBet(m.balance, m.bet);
    }

    dispose(): void {
        this.view.unbindBetHandlers();
    }

    private resetBet(): void {
        const m = this.model;
        m.resetBetAmount();
        this.view.setBalanceAndBet(m.balance, m.bet);
    }

    private addToBet(delta: number): void {
        const m = this.model;
        if (delta <= 0) {
            return;
        }
        if (m.balance <= 0) {
            return;
        }
        m.addToBet(delta, true);
        this.view.setBalanceAndBet(m.balance, m.bet);
    }
}
