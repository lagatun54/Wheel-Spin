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
    }

    dispose(): void {
        this.view.unbindBetHandlers();
    }

    private resetBet(): void {
        this.model.resetBetAmount();
    }

    private addToBet(delta: number): void {
        this.model.addToBet(delta, true);
    }
}
