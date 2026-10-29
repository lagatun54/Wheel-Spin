import { _decorator, Component } from 'cc';
import { PopUpLoseView } from '../view/PopUpLoseView';
import { PopUpWinView } from '../view/PopUpWinView';
import { PopUpWinController } from '../controller/PopUpWinController';
import { PopUpLoseController } from '../controller/PopUpLoseController';
import { PopUpWinModel } from '../model/PopUpWinModel';
import { PopUpLoseModel } from '../model/PopUpLoseModel';
import { getContainer } from './container';
import { TYPES } from './types';

const { ccclass, property } = _decorator;

export function getPopUpWinControllerOrNull(): PopUpWinController | null {
    const c = getContainer();
    return c.isBound(TYPES.PopUpWinController) ? c.get<PopUpWinController>(TYPES.PopUpWinController) : null;
}

export function getPopUpLoseControllerOrNull(): PopUpLoseController | null {
    const c = getContainer();
    return c.isBound(TYPES.PopUpLoseController) ? c.get<PopUpLoseController>(TYPES.PopUpLoseController) : null;
}

export function getPopUpWinViewOrNull(): PopUpWinView | null {
    const c = getContainer();
    return c.isBound(TYPES.PopUpWinView) ? c.get<PopUpWinView>(TYPES.PopUpWinView) : null;
}

export function getPopUpLoseViewOrNull(): PopUpLoseView | null {
    const c = getContainer();
    return c.isBound(TYPES.PopUpLoseView) ? c.get<PopUpLoseView>(TYPES.PopUpLoseView) : null;
}

export function bindPopUpWinView(view: PopUpWinView | null): void {
    unbindPopUpWinView();
    const c = getContainer();
    if (view) {
        const controller = new PopUpWinController(new PopUpWinModel(), view);
        c.bind<PopUpWinView>(TYPES.PopUpWinView).toConstantValue(view);
        c.bind<PopUpWinController>(TYPES.PopUpWinController).toConstantValue(controller);
    }
}

export function bindPopUpLoseView(view: PopUpLoseView | null): void {
    unbindPopUpLoseView();
    const c = getContainer();
    if (view) {
        const controller = new PopUpLoseController(new PopUpLoseModel(), view);
        c.bind<PopUpLoseView>(TYPES.PopUpLoseView).toConstantValue(view);
        c.bind<PopUpLoseController>(TYPES.PopUpLoseController).toConstantValue(controller);
    }
}

export function unbindPopUpWinView(): void {
    const c = getContainer();
    if (c.isBound(TYPES.PopUpWinController)) {
        c.get<PopUpWinController>(TYPES.PopUpWinController).dispose();
        c.unbind(TYPES.PopUpWinController);
    }
    if (c.isBound(TYPES.PopUpWinView)) {
        c.unbind(TYPES.PopUpWinView);
    }
}

export function unbindPopUpLoseView(): void {
    const c = getContainer();
    if (c.isBound(TYPES.PopUpLoseController)) {
        c.get<PopUpLoseController>(TYPES.PopUpLoseController).dispose();
        c.unbind(TYPES.PopUpLoseController);
    }
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
