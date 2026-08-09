import {
    _decorator,
    Button as CcButton,
    Component,
    Node,
    easing,
    tween,
    Tween,
    Vec3,
} from 'cc';

const { ccclass, property } = _decorator;

function callButtonSuperLifecycle(
    self: Component,
    method: 'onLoad' | 'onEnable' | 'onDestroy' | 'onDisable',
): void {
    let proto: object | null = CcButton.prototype;
    while (proto) {
        const fn = (proto as Record<string, unknown>)[method];
        if (typeof fn === 'function') {
            (fn as (this: Component) => void).call(self);
            return;
        }
        proto = Object.getPrototypeOf(proto);
    }
}

@ccclass('Button')
export class Button extends CcButton {
    @property({ type: Node, tooltip: 'Узел для анимации масштаба; пусто = этот узел' })
    animateTarget: Node | null = null;

    @property({ tooltip: 'Множитель scale при удержании (0.9–0.97 — мягкое «казуальное» сжатие)' })
    pressedScale = 0.93;

    @property({
        tooltip:
            '0 — равномерный scale; 0.02–0.05 — лёгкий «желейный» сквиш (X чуть шире, Y ниже)',
    })
    squish = 0.035;

    @property({ tooltip: 'Длительность нажатия (вдавливание), сек' })
    pressDuration = 0.11;

    @property({ tooltip: 'Длительность отпускания (с лёгким отскоком), сек' })
    releaseDuration = 0.28;

    private _baseScale = new Vec3(1, 1, 1);
    private _scaleTween: Tween<Node> | null = null;
    private _showingPressedVisual = false;

    onLoad() {
        callButtonSuperLifecycle(this, 'onLoad');
        this.transition = CcButton.Transition.NONE;
        const target = this.animateTarget ?? this.node;
        this._baseScale = target.scale.clone();
    }

    onEnable() {
        callButtonSuperLifecycle(this, 'onEnable');
        this.node.on(CcButton.EventType.CLICK, this.onClick, this);
    }

    onDestroy() {
        this.removeClickListeners();
        this._scaleTween?.stop();
        callButtonSuperLifecycle(this, 'onDestroy');
    }

    onDisable() {
        this.removeClickListeners();
        this._releaseVisual();
        callButtonSuperLifecycle(this, 'onDisable');
    }

    private onClick(): void {
        if (!this.interactable || !this.enabledInHierarchy) {
            return;
        }

        this._showingPressedVisual = true;
        this._tweenToPressed(() => {
            this._showingPressedVisual = false;
            this._tweenToReleased();
        });
    }

    private removeClickListeners(): void {
        this.node.off(CcButton.EventType.CLICK, this.onClick, this);
    }

    private _releaseVisual() {
        this._scaleTween?.stop();
        this._scaleTween = null;
        this._showingPressedVisual = false;
        const target = this.animateTarget ?? this.node;
        target.setScale(this._baseScale);
    }

    private _tweenToPressed(onComplete?: () => void) {
        const target = this.animateTarget ?? this.node;
        const p = this.pressedScale;
        const s = this._baseScale;
        const sq = this.squish;
        const to =
            sq > 0
                ? new Vec3(s.x * p * (1 + sq), s.y * p * (1 - sq), s.z * p)
                : new Vec3(s.x * p, s.y * p, s.z * p);
        this._scaleTween?.stop();
        this._scaleTween = tween(target)
            .to(this.pressDuration, { scale: to }, { easing: easing.sineOut })
            .call(() => onComplete?.())
            .start();
    }

    private _tweenToReleased() {
        const target = this.animateTarget ?? this.node;
        this._scaleTween?.stop();
        this._scaleTween = tween(target)
            .to(
                this.releaseDuration,
                { scale: this._baseScale.clone() },
                { easing: easing.backOut },
            )
            .start();
    }
}
