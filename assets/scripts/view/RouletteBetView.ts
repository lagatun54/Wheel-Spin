import { _decorator, Component, EventTarget, UIOpacity } from 'cc';
import type { RouletteColor } from '../RedBlackRandom';
import { Button } from '../UI/Button';

const { ccclass, property } = _decorator;

@ccclass('RouletteBetView')
export class RouletteBetView extends Component {
    static readonly EventType = {
        SELECT_RED: 'select-red',
        SELECT_BLACK: 'select-black',
    } as const;

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

    private readonly _events = new EventTarget();

    public onClickBetRed(): void {
        this._events.emit(RouletteBetView.EventType.SELECT_RED);
    }

    public onClickBetBlack(): void {
        this._events.emit(RouletteBetView.EventType.SELECT_BLACK);
    }

    on(type: string, callback: (...args: unknown[]) => void, target?: unknown): void {
        this._events.on(type, callback, target);
    }

    off(type: string, callback?: (...args: unknown[]) => void, target?: unknown): void {
        this._events.off(type, callback, target);
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

    onLoad(): void {
        this.redBetButton?.on(Button.EventType.CLICK, this.onClickBetRed, this);
        this.blackBetButton?.on(Button.EventType.CLICK, this.onClickBetBlack, this);
    }

    onDestroy() {
        this.redBetButton?.off(Button.EventType.CLICK, this.onClickBetRed, this);
        this.blackBetButton?.off(Button.EventType.CLICK, this.onClickBetBlack, this);
    }

}
