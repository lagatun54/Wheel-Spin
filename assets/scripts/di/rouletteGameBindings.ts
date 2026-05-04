import { _decorator, Component } from 'cc';
import { RouletteGame } from '../RouletteGame';
import { getContainer } from './container';
import { TYPES } from './types';

const { ccclass, property } = _decorator;

export function getRouletteGameOrNull(): RouletteGame | null {
    const c = getContainer();
    return c.isBound(TYPES.RouletteGame) ? c.get<RouletteGame>(TYPES.RouletteGame) : null;
}

export function bindRouletteGame(game: RouletteGame | null): void {
    const c = getContainer();
    if (c.isBound(TYPES.RouletteGame)) {
        c.unbind(TYPES.RouletteGame);
    }
    if (game) {
        c.bind<RouletteGame>(TYPES.RouletteGame).toConstantValue(game);
    }
}

export function unbindRouletteGame(): void {
    const c = getContainer();
    if (c.isBound(TYPES.RouletteGame)) {
        c.unbind(TYPES.RouletteGame);
    }
}

@ccclass('RouletteGameBindings')
export class RouletteGameBindingsComponent extends Component {
    @property({ type: RouletteGame, tooltip: 'Ссылка на компонент RouletteGame' })
    rouletteGame: RouletteGame | null = null;

    protected resolveRouletteGame(): RouletteGame | null {
        return this.rouletteGame;
    }

    protected applyBindings(): void {
        bindRouletteGame(this.resolveRouletteGame());
    }

    start() {
        this.applyBindings();
    }

    onDestroy() {
        unbindRouletteGame();
    }
}
