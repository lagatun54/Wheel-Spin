import {
    _decorator,
    Component,
    Enum,
    Layout,
    Node,
    ResolutionPolicy,
    screen,
    UITransform,
    view,
    Widget,
    sys,
} from 'cc';

const { ccclass, property } = _decorator;
const ResponsiveResolutionPolicy = Enum({
    EXACT_FIT: ResolutionPolicy.EXACT_FIT,
    NO_BORDER: ResolutionPolicy.NO_BORDER,
    SHOW_ALL: ResolutionPolicy.SHOW_ALL,
    FIXED_HEIGHT: ResolutionPolicy.FIXED_HEIGHT,
    FIXED_WIDTH: ResolutionPolicy.FIXED_WIDTH,
});

@ccclass('ResponsiveScreenAdapter')
export class ResponsiveScreenAdapter extends Component {
    private _uiTransform: UITransform | null = null;

    @property({ tooltip: 'Базовая ширина дизайна (Project Settings -> Design Resolution)' })
    designWidth = 1280;

    @property({ tooltip: 'Базовая высота дизайна' })
    designHeight = 720;

    @property({
        type: ResponsiveResolutionPolicy,
        tooltip: 'Политика для мобильного в portrait (обычно FIXED_WIDTH)',
    })
    mobilePortraitPolicy = ResolutionPolicy.FIXED_WIDTH;

    @property({
        type: ResponsiveResolutionPolicy,
        tooltip: 'Политика для мобильного в landscape (обычно SHOW_ALL или FIXED_HEIGHT)',
    })
    mobileLandscapePolicy = ResolutionPolicy.SHOW_ALL;

    @property({ tooltip: 'Подгонять размер Canvas под видимую область после resize' })
    syncCanvasSizeOnResize = true;

    @property({
        tooltip:
            'Держать одинаковый визуальный масштаб UI в portrait/landscape (компенсирует разницу policy)',
    })
    matchVisualScaleAcrossOrientations = true;

    onLoad() {
        for (const c of this.node.components) {
            if (c instanceof UITransform) {
                this._uiTransform = c;
                break;
            }
        }
        this.applyAdaptiveResolution();
        view.on('canvas-resize', this.onCanvasResize, this);
    }

    onDestroy() {
        view.off('canvas-resize', this.onCanvasResize, this);
    }

    private onCanvasResize() {
        this.applyAdaptiveResolution();
    }

    private applyAdaptiveResolution(): void {
        const policy = this.pickPolicy();
        view.setDesignResolutionSize(this.designWidth, this.designHeight, policy);

        this.scheduleOnce(() => {
            if (this.syncCanvasSizeOnResize && this._uiTransform) {
                const visible = view.getVisibleSize();
                this._uiTransform.setContentSize(visible.width, visible.height);
            }
            this.applyVisualScaleCompensation(policy);
            this.refreshWidgetsAndLayouts();
        }, 0);
    }

    private pickPolicy(): number {
        const frameSize = screen.windowSize;
        const isPortrait = frameSize.height > frameSize.width;
        const mobile = sys.isMobile;

        if (!mobile) {
            return ResolutionPolicy.SHOW_ALL;
        }
        return isPortrait ? this.mobilePortraitPolicy : this.mobileLandscapePolicy;
    }

    private refreshWidgetsAndLayouts(): void {
        this.forEachNodeDepthFirst(this.node, (node) => {
            for (const c of node.components) {
                if (c instanceof Widget) {
                    c.updateAlignment();
                }
            }
        });
        this.forEachNodeDepthFirst(this.node, (node) => {
            for (const c of node.components) {
                if (c instanceof Layout) {
                    c.updateLayout();
                }
            }
        });
    }

    private forEachNodeDepthFirst(root: Node, visit: (node: Node) => void): void {
        if (!root.active) {
            return;
        }
        visit(root);
        const children = root.children;
        for (let i = 0; i < children.length; i++) {
            this.forEachNodeDepthFirst(children[i], visit);
        }
    }

    private applyVisualScaleCompensation(policy: number): void {
        if (!this.matchVisualScaleAcrossOrientations) {
            this.node.setScale(1, 1, 1);
            return;
        }

        const frame = screen.windowSize;
        const actual = this.getUniformScaleByPolicy(policy, frame.width, frame.height);
        if (actual <= 0) {
            return;
        }

        const target = this.getAutoTargetUniformScale(frame.width, frame.height);
        if (target <= 0) {
            return;
        }

        const compensation = target / actual;
        this.node.setScale(compensation, compensation, 1);
    }

    private getUniformScaleByPolicy(policy: number, w: number, h: number): number {
        switch (policy) {
            case ResolutionPolicy.NO_BORDER:
                return Math.max(w / this.designWidth, h / this.designHeight);
            case ResolutionPolicy.FIXED_WIDTH:
                return w / this.designWidth;
            case ResolutionPolicy.FIXED_HEIGHT:
                return h / this.designHeight;
            case ResolutionPolicy.EXACT_FIT:
                return Math.min(w / this.designWidth, h / this.designHeight);
            case ResolutionPolicy.SHOW_ALL:
            default:
                return Math.min(w / this.designWidth, h / this.designHeight);
        }
    }

    private getAutoTargetUniformScale(w: number, h: number): number {
        const current = Math.min(w / this.designWidth, h / this.designHeight);
        const rotated = Math.min(h / this.designWidth, w / this.designHeight);
        return Math.min(current, rotated);
    }
}
