import { _decorator, Component, Label, sys, warn } from 'cc';
import { WebFontHelper } from './WebFontHelper';

const { ccclass, property } = _decorator;

@ccclass('WebFontLabel')
export class WebFontLabel extends Component {
    @property(Label)
    label: Label | null = null;

    @property({
        tooltip: 'URL CSS с fonts.googleapis.com (Embed Google Fonts), например css2?family=...',
    })
    fontCssUrl = '';

    onLoad(): void {
        this.applyWebFontToLabel();
    }

    private applyWebFontToLabel(): void {
        if (!this.label) {
            return;
        }

        const cssUrl = (this.fontCssUrl || '').trim();
        const wf = WebFontHelper.instance;
        const family = cssUrl ? (wf.familyNameFromGoogleFontsUrl(cssUrl) || '') : '';

        if (this.tryApplyBrowserDocumentFont(cssUrl, family)) {
            return;
        }

        warn('[WebFontLabel] Укажите fontCssUrl — ссылку на CSS с fonts.googleapis.com (embed Google Fonts).');
    }

    private fixLabelLineHeightIfNeeded(): void {
        if (!this.label) {
            return;
        }
        if (this.label.lineHeight > 0 && this.label.lineHeight < this.label.fontSize) {
            this.label.lineHeight = 0;
        }
    }

    private tryApplyBrowserDocumentFont(cssUrl: string, family: string): boolean {
        if (!(sys.isBrowser && typeof document !== 'undefined' && cssUrl && family) || !this.label) {
            return false;
        }

        const wf = WebFontHelper.instance;
        const label = this.label;
        const size = label.fontSize;

        const applyFontToLabel = (): void => {
            if (!this.label) {
                return;
            }
            this.label.cacheMode = Label.CacheMode.NONE;
            this.label.useSystemFont = true;
            this.label.fontFamily = family;
            this.fixLabelLineHeightIfNeeded();
        };

        void wf
            .injectStylesheetInHeadAsync(cssUrl)
            .then(() => {
                if (!document.fonts) {
                    return;
                }

                return document.fonts.ready.then(() => undefined);
            })
            .then(() => {
                if (document.fonts && document.fonts.load) {
                    return document.fonts.load(`${size}px "${family}"`).then(() => undefined);
                }
            })
            .then(() => {
                applyFontToLabel();
            })
            .catch(() => {
                this.scheduleOnce(applyFontToLabel, 0.35);
            });
        return true;
    }
}
