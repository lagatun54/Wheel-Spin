import { PlayerBalanceView } from '../view/PlayerBalanceView';
import type { RouletteGameController } from './RouletteGameController';

export class PlayerBalanceController {
    constructor(
        private readonly view: PlayerBalanceView,
        private readonly game: RouletteGameController,
    ) {}

    start(): void {
        this.view.bindBetHandlers({
            onAdd10: () => this.addToBet(10),
            onAdd50: () => this.addToBet(50),
            onResetBet: () => this.resetBet(),
        });
        const state = this.game.state;
        this.view.setBalanceAndBet(state.balance, state.bet);
    }

    dispose(): void {
        this.view.unbindBetHandlers();
    }

    private resetBet(): void {
        this.game.dispatch({ type: 'bet/reset' });
    }

    private addToBet(delta: number): void {
        if (delta <= 0) {
            return;
        }
        if (this.game.state.balance <= 0) {
            return;
        }
        this.game.dispatch({ type: 'bet/add', delta, maxByBalance: true });
    }
}
