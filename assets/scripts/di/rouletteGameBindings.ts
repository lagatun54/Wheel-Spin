import { _decorator, Component } from 'cc';
import type { RouletteGameSpinApi, RouletteGameStoreApi } from './contracts';
import { RouletteGame } from '../RouletteGame';
import { getContainer } from './container';
import { TYPES } from './types';

const { ccclass, property } = _decorator;

export function getRouletteGameOrNull(): RouletteGame | null {
    const c = getContainer();
    return c.isBound(TYPES.RouletteGame) ? c.get<RouletteGame>(TYPES.RouletteGame) : null;
}

export function getRouletteGameSpinApiOrNull(): RouletteGameSpinApi | null {
    const c = getContainer();
    return c.isBound(TYPES.RouletteGameSpinApi)
        ? c.get<RouletteGameSpinApi>(TYPES.RouletteGameSpinApi)
        : null;
}

export function getRouletteGameStoreApiOrNull(): RouletteGameStoreApi | null {
    const c = getContainer();
    return c.isBound(TYPES.RouletteGameStoreApi)
        ? c.get<RouletteGameStoreApi>(TYPES.RouletteGameStoreApi)
        : null;
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

export function bindRouletteGameSpinApi(api: RouletteGameSpinApi | null): void {
    const c = getContainer();
    if (c.isBound(TYPES.RouletteGameSpinApi)) {
        c.unbind(TYPES.RouletteGameSpinApi);
    }
    if (api) {
        c.bind<RouletteGameSpinApi>(TYPES.RouletteGameSpinApi).toConstantValue(api);
    }
}

export function bindRouletteGameStoreApi(api: RouletteGameStoreApi | null): void {
    const c = getContainer();
    if (c.isBound(TYPES.RouletteGameStoreApi)) {
        c.unbind(TYPES.RouletteGameStoreApi);
    }
    if (api) {
        c.bind<RouletteGameStoreApi>(TYPES.RouletteGameStoreApi).toConstantValue(api);
    }
}

export function unbindRouletteGame(): void {
    const c = getContainer();
    if (c.isBound(TYPES.RouletteGame)) {
        c.unbind(TYPES.RouletteGame);
    }
}

export function unbindRouletteGameSpinApi(): void {
    const c = getContainer();
    if (c.isBound(TYPES.RouletteGameSpinApi)) {
        c.unbind(TYPES.RouletteGameSpinApi);
    }
}

export function unbindRouletteGameStoreApi(): void {
    const c = getContainer();
    if (c.isBound(TYPES.RouletteGameStoreApi)) {
        c.unbind(TYPES.RouletteGameStoreApi);
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
        const game = this.resolveRouletteGame();
        bindRouletteGame(game);
        bindRouletteGameSpinApi(game?.game ?? null);
        bindRouletteGameStoreApi(game?.game ?? null);
    }

    start() {
        this.applyBindings();
    }

    onDestroy() {
        unbindRouletteGame();
        unbindRouletteGameSpinApi();
        unbindRouletteGameStoreApi();
    }
}
