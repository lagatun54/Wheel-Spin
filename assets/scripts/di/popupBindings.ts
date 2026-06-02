import { _decorator, Component } from 'cc';
import { PopUpLoseView } from '../view/PopUpLoseView';
import { PopUpWinView } from '../view/PopUpWinView';
import { getBinding, hasBinding, removeBinding, setBinding } from './container';
import { TYPES } from './types';

const { ccclass, property } = _decorator;

export function getPopUpWinViewOrNull(): PopUpWinView | null {
    return getBinding<PopUpWinView>(TYPES.PopUpWinView);
}

export function getPopUpLoseViewOrNull(): PopUpLoseView | null {
    return getBinding<PopUpLoseView>(TYPES.PopUpLoseView);
}

export function bindPopUpWinView(view: PopUpWinView | null): void {
    setBinding(TYPES.PopUpWinView, view);
}

export function bindPopUpLoseView(view: PopUpLoseView | null): void {
    setBinding(TYPES.PopUpLoseView, view);
}

export function unbindPopUpWinView(): void {
    if (hasBinding(TYPES.PopUpWinView)) {
        removeBinding(TYPES.PopUpWinView);
    }
}

export function unbindPopUpLoseView(): void {
    if (hasBinding(TYPES.PopUpLoseView)) {
        removeBinding(TYPES.PopUpLoseView);
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
