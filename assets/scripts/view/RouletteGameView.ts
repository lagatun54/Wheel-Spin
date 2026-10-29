import { _decorator, Button, Component, easing, Label, Node, tween, Tween, UIOpacity } from 'cc';
import { normalizeAngleDeg360 } from '../RedBlackRandom';
import { getRouletteGameOrNull } from '../di/rouletteGameBindings';
import type { RouletteGameController } from '../controller/RouletteGameController';
import { canSpin, type SpinFinalizeOutcome } from '../model/RouletteGameModel';

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
    private _game: RouletteGameController | null = null;
    private _resolveSpinTween: ((completed: boolean) => void) | null = null;

    onLoad() {
        if (this.spinButton) {
            this.spinButton.node.on(Button.EventType.CLICK, this.onClickSpin, this);
        }
    }

    private _unsubscribeState: (() => void) | null = null;

    private _started = false;

    start() {
        this._started = true;
        if (this.enabledInHierarchy) this.subscribeToModel();
    }

    onEnable(): void {
        if (this._started) this.subscribeToModel();
    }

    onDisable(): void {
        this.unsubscribeFromModel();
        this.finishSpinTween();
        this.stopLastResultBlink();
    }

    private subscribeToModel(): void {
        if (this._unsubscribeState) return;
        const game = this.game();
        this._unsubscribeState = game?.model.subscribe((state) => {
            if (this.isValid) this.setSpinButtonInteractable(canSpin(state));
        }) ?? null;
    }

    private unsubscribeFromModel(): void {
        this._unsubscribeState?.();
        this._unsubscribeState = null;
    }

    onDestroy() {
        this.unsubscribeFromModel();
        if (this.spinButton) {
            this.spinButton.node.off(Button.EventType.CLICK, this.onClickSpin, this);
        }
        this.finishSpinTween();
        this.stopLastResultBlink();
    }

    private finishSpinTween(): void {
        this._tween?.stop();
        this._tween = null;
        const resolve = this._resolveSpinTween;
        this._resolveSpinTween = null;
        resolve?.(false);
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
            case 'idle':
            default:
                return '';
        }
    }

    showLastResult(outcome: SpinFinalizeOutcome): void {
        const label = this.lastResultLabel;
        if (!label?.isValid) {
            return;
        }
        label.string = this.formatLastResultFromOutcome(outcome);
    }

    playLastResultBlink(): void {
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

    onClickSpin(): void {
        const ctrl = this.game();
        if (ctrl) {
            void ctrl.playRoundAsync(this).catch((error) => {
                console.error('[RouletteGameView] Round failed.', error);
            });
        }
    }

    async playWheelAsync(slot: number): Promise<boolean> {
        const target = this.resolveSpinTarget();
        const from = target.angle;
        const step = 360 / 8;
        const targetAngle = (slot - 1) * step + this.initialWheelAngleDeg - this.slotAngleOffsetDeg;
        const normalizedTargetAngle = from + normalizeAngleDeg360(targetAngle - from);
        const turns = Math.max(1, Math.floor(this.fullTurns));
        return this.tweenSpinToAsync(target, normalizedTargetAngle + turns * 360);
    }

    setSpinButtonInteractable(interactable: boolean): void {
        if (this.spinButton?.isValid) {
            this.spinButton.interactable = interactable;
        }
    }

    private tweenSpinToAsync(target: Node, to: number): Promise<boolean> {
        return new Promise((resolve) => {
            if (!target.isValid) {
                resolve(false);
                return;
            }

            const finish = () => {
                this._tween = null;
                this._resolveSpinTween = null;
                resolve(true);
            };

            this.finishSpinTween();
            this._resolveSpinTween = resolve;
            this._tween = tween(target)
                .to(
                    this.duration,
                    { angle: to },
                    { easing: easing.sineOut },
                )
                .call(finish)
                .start();
        });
    }
}
