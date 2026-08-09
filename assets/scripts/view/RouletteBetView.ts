import { _decorator, Component, UIOpacity } from 'cc';
import type { RouletteColor } from '../RedBlackRandom';
import { Button } from '../UI/Button';

const { ccclass, property } = _decorator;

export type RouletteBetHandlers = {
    onRed: () => void;
    onBlack: () => void;
};

@ccclass('RouletteBetView')
export class RouletteBetView extends Component {
    @property({ type: Button, tooltip: 'Кнопка ставки на красное' })
    redBetButton: Button | null = null;

    @property({ type: Button, tooltip: 'Кнопка ставки на чёрное' })
    blackBetButton: Button | null = null;

    @property({ type: UIOpacity, tooltip: 'UIOpacity на узле красной кнопки (тот же узел, что и у Button)' })
    redBetUIOpacity: UIOpacity | null = null;

    @property({ type: UIOpacity, tooltip: 'UIOpacity на узле чёрной кнопки (тот же узел, что и у Button)' })
    blackBetUIOpacity: UIOpacity | null = null;

    @property({ tooltip: 'Прозрачность кнопки невыбранного цвета (0–255)' })
    dimmedOpacity = 100;

    @property({ tooltip: 'Прозрачность кнопки выбранного цвета' })
    selectedOpacity = 255;

    private _handlers: RouletteBetHandlers | null = null;

    public onClickBetRed(): void {
        this._handlers?.onRed();
    }

    public onClickBetBlack(): void {
        this._handlers?.onBlack();
    }

    bindBetHandlers(handlers: RouletteBetHandlers): void {
        this.unbindBetHandlers();
        this._handlers = handlers;
        if (this.redBetButton) {
            this.redBetButton.node.on(Button.EventType.CLICK, this.onClickBetRed, this);
        }
        if (this.blackBetButton) {
            this.blackBetButton.node.on(Button.EventType.CLICK, this.onClickBetBlack, this);
        }
    }

    applyBetColorHighlight(color: RouletteColor | null): void {
        const noChoiceYet = color === null;
        const redBright = noChoiceYet || color === 'red';
        const blackBright = noChoiceYet || color === 'black';
        this.setButtonOpacity(this.redBetUIOpacity, redBright);
        this.setButtonOpacity(this.blackBetUIOpacity, blackBright);
    }

    private setButtonOpacity(op: UIOpacity | null, fullBrightness: boolean): void {
        if (!op?.isValid) {
            return;
        }
        op.opacity = fullBrightness ? this.selectedOpacity : this.dimmedOpacity;
    }

    unbindBetHandlers(): void {
        this.redBetButton?.node.off(Button.EventType.CLICK, this.onClickBetRed, this);
        this.blackBetButton?.node.off(Button.EventType.CLICK, this.onClickBetBlack, this);
        this._handlers = null;
    }

    setButtonsInteractable(interactable: boolean): void {
        if (this.redBetButton?.isValid) {
            this.redBetButton.interactable = interactable;
        }
        if (this.blackBetButton?.isValid) {
            this.blackBetButton.interactable = interactable;
        }
    }

    onDestroy() {
        this.unbindBetHandlers();
    }
}
