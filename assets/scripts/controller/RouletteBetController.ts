import { type RouletteColor } from '../RedBlackRandom';
import type { RouletteGameModel } from '../model/RouletteGameModel';
import { RouletteBetView } from '../view/RouletteBetView';

export class RouletteBetController {
    constructor(
        private readonly view: RouletteBetView,
        private readonly model: RouletteGameModel,
    ) {}

    start(): void {
        this.view.bindBetHandlers({
            onRed: () => this.applyBetColor('red'),
            onBlack: () => this.applyBetColor('black'),
        });
    }

    dispose(): void {
        this.view.unbindBetHandlers();
    }

    private applyBetColor(color: RouletteColor): void {
        this.model.setBetColor(color);
    }
}
