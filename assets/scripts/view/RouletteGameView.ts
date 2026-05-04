import { _decorator, Button, Component, easing, Label, Node, tween, Tween, UIOpacity } from 'cc';
import { normalizeAngleDeg360, slotNumberToColor } from '../RedBlackRandom';
import { getRouletteGameOrNull } from '../di/rouletteGameBindings';
import type { RouletteGameController } from '../controller/RouletteGameController';
import type { SpinFinalizeOutcome } from '../model/RouletteGameModel';

const { ccclass, property } = _decorator;

@ccclass('RouletteGameView')
export class RouletteGameView extends Component {
    @property({
        type: Button,
        tooltip: 'Кнопка спина',
    })
    spinButton: Button | null = null;

    @property({ type: Node, tooltip: 'Что крутить; пусто = узел кнопки спина или этот узел' })
    spinTarget: Node | null = null;

    @property({ tooltip: 'Длительность вращения, сек (2–3)' })
    duration = 2.5;

    @property({ tooltip: 'Фиксированное количество полных оборотов за спин' })
    fullTurns = 3;

    @property({
        tooltip:
            'Угол `angle` колеса в начале (когда под маркером сектор 1). Например -25, если в редакторе rotation -25.',
    })
    initialWheelAngleDeg = -25;

    @property({
        tooltip:
            'Доп. сдвиг (°) к углу после вычета начального — тонкая подгонка под арт.',
    })
    slotAngleOffsetDeg = 0;

    @property({
        type: Label,
        tooltip: 'Последний исход раунда: выигрыш/проигрыш и сумма; привяжите в редакторе',
    })
    lastResultLabel: Label | null = null;

    @property({ tooltip: 'Сколько полных циклов мигания после закрытия попапа win/lose' })
    lastResultBlinkCount = 3;

    @property({ tooltip: 'Длительность одной фазы мигания (затемнение или возврат), сек' })
    lastResultBlinkPhaseSec = 0.12;

    @property({ tooltip: 'Прозрачность в «провале» мигания (0–255)' })
    lastResultBlinkOpacity = 70;

    private _tween: Tween<Node> | null = null;
    private _busy = false;
    private _game: RouletteGameController | null = null;

    onLoad() {
        if (this.spinButton) {
            this.spinButton.node.on(Button.EventType.CLICK, this.onClickSpin, this);
        }
    }

    onDestroy() {
        if (this.spinButton) {
            this.spinButton.node.off(Button.EventType.CLICK, this.onClickSpin, this);
        }
        this._tween?.stop();
        this.stopLastResultBlink();
    }

    private stopLastResultBlink(): void {
        const label = this.lastResultLabel;
        if (label?.isValid) {
            const op = label.node.getComponent(UIOpacity);
            if (op) {
                Tween.stopAllByTarget(op);
            }
        }
    }

    private formatLastResultFromOutcome(outcome: SpinFinalizeOutcome): string {
        switch (outcome.kind) {
            case 'win': {
                const payout = Math.floor(outcome.toBalance - outcome.fromBalance);
                return `Win: ${payout}`;
            }
            case 'lose':
                return `Loss: ${Math.floor(outcome.stake)}`;
            case 'refund_no_color':
                return `Refund: ${Math.floor(outcome.refund)}`;
            case 'idle':
            default:
                return '';
        }
    }

    private setLastResultLabel(outcome: SpinFinalizeOutcome): void {
        const label = this.lastResultLabel;
        if (!label?.isValid) {
            return;
        }
        label.string = this.formatLastResultFromOutcome(outcome);
    }

    private playLastResultBlink(): void {
        const label = this.lastResultLabel;
        if (!label?.isValid) {
            return;
        }
        let uiOp = label.node.getComponent(UIOpacity);
        if (!uiOp) {
            uiOp = label.node.addComponent(UIOpacity);
        }
        Tween.stopAllByTarget(uiOp);
        const full = 255;
        const dim = Math.max(0, Math.min(255, Math.floor(this.lastResultBlinkOpacity)));
        const phase = Math.max(0.02, this.lastResultBlinkPhaseSec);
        const n = Math.max(1, Math.floor(this.lastResultBlinkCount));
        uiOp.opacity = full;
        let chain = tween(uiOp);
        for (let i = 0; i < n; i++) {
            chain = chain.to(phase, { opacity: dim }).to(phase, { opacity: full });
        }
        chain.start();
    }

    private game(): RouletteGameController | null {
        if (this._game) {
            return this._game;
        }
        const session = getRouletteGameOrNull();
        if (session?.isValid) {
            const ctrl = session.game;
            if (ctrl) {
                this._game = ctrl;
                return ctrl;
            }
        }
        return null;
    }

    private resolveSpinTarget(): Node {
        if (this.spinTarget?.isValid) {
            return this.spinTarget;
        }
        const btn = this.spinButton;
        if (btn) {
            return btn.node;
        }
        return this.node;
    }

    onClickSpin() {
        if (this._busy) {
            return;
        }
        const ctrl = this.game();
        if (!ctrl || !ctrl.beginSpinRound()) {
            return;
        }
        const target = this.resolveSpinTarget();
        this._busy = true;
        const from = target.angle;

        const slot = ctrl.pickRandomSlot1to8();
        const color = slotNumberToColor(slot);
        const targetAngle = ctrl.wheelAngleForSlot(
            slot,
            this.initialWheelAngleDeg,
            this.slotAngleOffsetDeg,
        );
        const normalizedTargetAngle = from + normalizeAngleDeg360(targetAngle - from);
        const minTurns = Math.max(1, Math.floor(this.fullTurns));
        const to = normalizedTargetAngle + minTurns * 360;

        this._tween?.stop();
        this._tween = tween(target)
            .to(
                this.duration,
                { angle: to },
                { easing: easing.sineOut },
            )
            .call(() => {
                this._tween = null;
                const ctrl = this.game();
                if (!ctrl) {
                    this._busy = false;
                    return;
                }
                const outcome = ctrl.finalizeSpin(color);
                this.setLastResultLabel(outcome);
                const blinkAfterPopUp = outcome.kind === 'win' || outcome.kind === 'lose';
                ctrl.onceSpinUiUnlocked(() => {
                    if (blinkAfterPopUp) {
                        this.playLastResultBlink();
                    }
                    this._busy = false;
                });
            })
            .start();
    }
}
