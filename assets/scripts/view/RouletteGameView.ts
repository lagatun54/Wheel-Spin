import { _decorator, Component, easing, EventTarget, Label, Node, tween, Tween, UIOpacity } from 'cc';
import { normalizeAngleDeg360, slotNumberToColor } from '../RedBlackRandom';
import type { RouletteGameSession, SpinFinalizeOutcome } from '../ecs/RouletteEcs';
import { Button } from '../UI/Button';

const { ccclass, property } = _decorator;

@ccclass('RouletteGameView')
export class RouletteGameView extends Component {
    static readonly EventType = {
        SPIN: 'spin',
    } as const;

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

    @property({
        type: UIOpacity,
        tooltip: 'UIOpacity для мигания last result label',
    })
    lastResultLabelOpacity: UIOpacity | null = null;

    @property({ tooltip: 'Сколько полных циклов мигания после закрытия попапа win/lose' })
    lastResultBlinkCount = 3;

    @property({ tooltip: 'Длительность одной фазы мигания (затемнение или возврат), сек' })
    lastResultBlinkPhaseSec = 0.12;

    @property({ tooltip: 'Прозрачность в «провале» мигания (0–255)' })
    lastResultBlinkOpacity = 70;

    private _tween: Tween<Node> | null = null;
    private _busy = false;
    private _game: RouletteGameSession | null = null;
    private readonly _events = new EventTarget();

    onLoad() {
        if (this.spinButton) {
            this.spinButton.on(Button.EventType.CLICK, this.onClickSpin, this);
        }
    }

    onDestroy() {
        if (this.spinButton) {
            this.spinButton.off(Button.EventType.CLICK, this.onClickSpin, this);
        }
        this._tween?.stop();
        this.stopLastResultBlink();
    }

    private stopLastResultBlink(): void {
        const opacity = this.lastResultLabelOpacity;
        if (!opacity) {
            return;
        }
        Tween.stopAllByTarget(opacity);
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
        if (!label) {
            return;
        }
        label.string = this.formatLastResultFromOutcome(outcome);
    }

    private playLastResultBlink(): void {
        const label = this.lastResultLabel;
        const uiOp = this.lastResultLabelOpacity;
        if (!label || !uiOp) {
            return;
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

    private game(): RouletteGameSession | null {
        return this._game;
    }

    bindGame(session: RouletteGameSession | null): void {
        this._game = session;
    }

    on(type: string, callback: (...args: unknown[]) => void, target?: unknown): void {
        this._events.on(type, callback, target);
    }

    off(type: string, callback?: (...args: unknown[]) => void, target?: unknown): void {
        this._events.off(type, callback, target);
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
        this._events.emit(RouletteGameView.EventType.SPIN);
    }

    playSpin(session: RouletteGameSession): void {
        if (this._busy || !session.beginSpinRound()) {
            return;
        }

        this.bindGame(session);
        const target = this.resolveSpinTarget();
        this._busy = true;
        const from = target.angle;

        const slot = session.pickRandomSlot1to8();
        const color = slotNumberToColor(slot);
        const targetAngle = session.wheelAngleForSlot(
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
                const outcome = session.finalizeSpin(color);
                this.setLastResultLabel(outcome);
                const blinkAfterPopUp = outcome.kind === 'win' || outcome.kind === 'lose';
                session.onceSpinUiUnlocked(() => {
                    if (blinkAfterPopUp) {
                        this.playLastResultBlink();
                    }
                    this._busy = false;
                });
            })
            .start();
    }
}
