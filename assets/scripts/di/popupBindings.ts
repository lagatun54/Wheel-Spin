import { _decorator, Component } from 'cc';
import { PopUpLoseView } from '../view/PopUpLoseView';
import { PopUpWinView } from '../view/PopUpWinView';
import { getContainer } from './container';
import { TYPES } from './types';

const { ccclass, property } = _decorator;

export function getPopUpWinViewOrNull(): PopUpWinView | null {
    const c = getContainer();
    return c.isBound(TYPES.PopUpWinView) ? c.get<PopUpWinView>(TYPES.PopUpWinView) : null;
}

export function getPopUpLoseViewOrNull(): PopUpLoseView | null {
    const c = getContainer();
    return c.isBound(TYPES.PopUpLoseView) ? c.get<PopUpLoseView>(TYPES.PopUpLoseView) : null;
}

export function bindPopUpWinView(view: PopUpWinView | null): void {
    const c = getContainer();
    if (c.isBound(TYPES.PopUpWinView)) {
        c.unbind(TYPES.PopUpWinView);
    }
    if (view) {
        c.bind<PopUpWinView>(TYPES.PopUpWinView).toConstantValue(view);
    }
}

export function bindPopUpLoseView(view: PopUpLoseView | null): void {
    const c = getContainer();
    if (c.isBound(TYPES.PopUpLoseView)) {
        c.unbind(TYPES.PopUpLoseView);
    }
    if (view) {
        c.bind<PopUpLoseView>(TYPES.PopUpLoseView).toConstantValue(view);
    }
}

export function unbindPopUpWinView(): void {
    const c = getContainer();
    if (c.isBound(TYPES.PopUpWinView)) {
        c.unbind(TYPES.PopUpWinView);
    }
}

export function unbindPopUpLoseView(): void {
    const c = getContainer();
    if (c.isBound(TYPES.PopUpLoseView)) {
        c.unbind(TYPES.PopUpLoseView);
    }
}

@ccclass('PopUpBindings')
export class PopUpBindingsComponent extends Component {
    @property({ type: PopUpWinView, tooltip: 'Ссылка на компонент попапа выигрыша' })
    winPopUp: PopUpWinView | null = null;

    @property({ type: PopUpLoseView, tooltip: 'Ссылка на компонент попапа проигрыша' })
    losePopUp: PopUpLoseView | null = null;

    protected resolveWinView(): PopUpWinView | null {
        return this.winPopUp;
    }

    protected resolveLoseView(): PopUpLoseView | null {
        return this.losePopUp;
    }

    protected applyBindings(): void {
        bindPopUpWinView(this.resolveWinView());
        bindPopUpLoseView(this.resolveLoseView());
    }

    onLoad() {
        this.applyBindings();
    }

    onDestroy() {
        unbindPopUpWinView();
        unbindPopUpLoseView();
    }
}
