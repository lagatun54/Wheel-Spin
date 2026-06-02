import {
    _decorator,
    Button as CcButton,
    Component,
    EventTarget,
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
    private readonly _events = new EventTarget();
    private _scaleTween: Tween<Node> | null = null;
    private _showingPressedVisual = false;

    onLoad() {
        callButtonSuperLifecycle(this, 'onLoad');
        this.transition = CcButton.Transition.NONE;
        this.node.on(Button.EventType.CLICK, this.onClick, this);
        const target = this.animateTarget ?? this.node;
        this._baseScale = target.scale.clone();
    }

    onEnable() {
        callButtonSuperLifecycle(this, 'onEnable');
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    onDestroy() {
        this.removeTouchListeners();
        this.node.off(Button.EventType.CLICK, this.onClick, this);
        this._scaleTween?.stop();
        callButtonSuperLifecycle(this, 'onDestroy');
    }

    on(type: string, callback: (...args: unknown[]) => void, target?: unknown): void {
        this._events.on(type, callback, target);
    }

    off(type: string, callback?: (...args: unknown[]) => void, target?: unknown): void {
        this._events.off(type, callback, target);
    }

    onDisable() {
        this.removeTouchListeners();
        this._releaseVisual();
        callButtonSuperLifecycle(this, 'onDisable');
    }

    private onTouchStart(): void {
        if (!this.interactable || !this.enabledInHierarchy) {
            return;
        }
        this._showingPressedVisual = true;
        this._tweenToPressed();
    }

    private onTouchEnd(): void {
        this._showingPressedVisual = false;
        this._tweenToReleased();
    }

    private onTouchCancel(): void {
        this._showingPressedVisual = false;
        this._tweenToReleased();
    }

    private removeTouchListeners(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    private onClick(event?: Event): void {
        this._events.emit(Button.EventType.CLICK, event);
    }

    private _releaseVisual() {
        this._scaleTween?.stop();
        this._scaleTween = null;
        this._showingPressedVisual = false;
        const target = this.animateTarget ?? this.node;
        target.setScale(this._baseScale);
    }

    private _tweenToPressed() {
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
