import { _decorator, Component } from 'cc';
import { RouletteGame } from '../RouletteGame';
import { getBinding, hasBinding, removeBinding, setBinding } from './container';
import { TYPES } from './types';

const { ccclass, property } = _decorator;

type RouletteGameBinding = Component & {
    game: unknown;
};

export function getRouletteGameOrNull(): RouletteGameBinding | null {
    return getBinding<RouletteGameBinding>(TYPES.RouletteGame);
}

export function bindRouletteGame(game: RouletteGameBinding | null): void {
    setBinding(TYPES.RouletteGame, game);
}

export function unbindRouletteGame(): void {
    if (hasBinding(TYPES.RouletteGame)) {
        removeBinding(TYPES.RouletteGame);
    }
}

@ccclass('RouletteGameBindings')
export class RouletteGameBindingsComponent extends Component {
    @property({ type: RouletteGame, tooltip: 'Ссылка на компонент RouletteGame' })
    rouletteGame: RouletteGame | null = null;

    protected applyBindings(): void {
        bindRouletteGame(this.rouletteGame as RouletteGameBinding | null);
    }

    start() {
        this.applyBindings();
    }

    onDestroy() {
        unbindRouletteGame();
    }
}
