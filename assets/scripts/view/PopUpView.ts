import { _decorator, Component, easing, Label, Node, Tween, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

const COLLAPSED_EPS = 1e-3;

@ccclass('PopUpView')
export class PopUpView extends Component {
    @property({ type: Label, tooltip: 'Сумма выигрыша (например 100). В попапе проигрыша можно не задавать.' })
    winAmountLabel: Label | null = null;

    @property({
        type: Node,
        tooltip:
            'Опционально: узел, к которому применяется scale-анимация. Если пусто — анимируется корень попапа. '
            + 'Укажите дочерний узел, если родительский scale перезаписывается (Widget/Layout и т.п.).',
    })
    animScaleNode: Node | null = null;

    @property({ tooltip: 'Длительность появления (scale 0→1), сек' })
    showAnimDuration = 0.32;

    @property({ tooltip: 'Длительность скрытия (scale 1→0), сек' })
    hideAnimDuration = 0.18;

    onLoad(): void {
        this.hideImmediate();
    }

    onDestroy(): void {
        this.stopScaleTweens();
    }

    protected getAnimScaleNode(): Node {
        return this.animScaleNode ?? this.node;
    }

    protected isAnimCollapsed(): boolean {
        const anim = this.getAnimScaleNode();
        const s = anim.scale;
        return s.x < COLLAPSED_EPS && s.y < COLLAPSED_EPS;
    }

    protected stopScaleTweens(): void {
        const anim = this.getAnimScaleNode();
        Tween.stopAllByTarget(anim);
    }

    playScaleShowAnimation(duration: number, onComplete?: () => void): void {
        const anim = this.getAnimScaleNode();
        if (!this.node.isValid || !anim.isValid) {
            onComplete?.();
            return;
        }

        this.stopScaleTweens();
        anim.setScale(0, 0, 1);

        this.scheduleOnce(() => {
            if (!this.isValid || !anim.isValid) {
                onComplete?.();
                return;
            }
            Tween.stopAllByTarget(anim);
            tween(anim)
                .to(duration, { scale: new Vec3(1, 1, 1) }, { easing: easing.backOut })
                .call(() => onComplete?.())
                .start();
        }, 0);
    }

    playScaleHideAnimation(duration: number, onComplete?: () => void): void {
        const anim = this.getAnimScaleNode();
        if (!this.node.isValid || !anim.isValid) {
            onComplete?.();
            return;
        }
        if (this.isAnimCollapsed()) {
            onComplete?.();
            return;
        }

        this.stopScaleTweens();

        this.scheduleOnce(() => {
            if (!this.isValid || !anim.isValid) {
                onComplete?.();
                return;
            }
            Tween.stopAllByTarget(anim);
            tween(anim)
                .to(duration, { scale: new Vec3(0, 0, 1) }, { easing: easing.quadIn })
                .call(() => onComplete?.())
                .start();
        }, 0);
    }

    showImmediate(): void {
        this.stopScaleTweens();
        this.getAnimScaleNode().setScale(1, 1, 1);
        this.onAfterShow();
    }

    hideImmediate(): void {
        this.stopScaleTweens();
        this.getAnimScaleNode().setScale(0, 0, 1);
        this.onAfterHide();
    }

    show(): void {
        this.showImmediate();
    }

    hide(): void {
        this.hideImmediate();
    }

    protected setWinAmount(amount: number): void {
        if (this.winAmountLabel) {
            this.winAmountLabel.string = `${Math.floor(amount)}`;
        }
    }

    protected onAfterShow(): void {}

    protected onAfterHide(): void {}
}
