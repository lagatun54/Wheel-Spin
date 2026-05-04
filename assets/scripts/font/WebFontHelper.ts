import { sys } from 'cc';

export class WebFontHelper {
    private static _instance: WebFontHelper | null = null;

    static get instance(): WebFontHelper {
        if (!WebFontHelper._instance) {
            WebFontHelper._instance = new WebFontHelper();
        }
        return WebFontHelper._instance;
    }

    private constructor() {}

    private ensureGooglePreconnect(cssUrl: string): void {
        if (!/^https?:\/\/fonts\.googleapis\.com\//i.test(cssUrl)) {
            return;
        }
        if (!document.querySelector('link[href="https://fonts.googleapis.com"][rel="preconnect"]')) {
            const a = document.createElement('link');
            a.rel = 'preconnect';
            a.href = 'https://fonts.googleapis.com';
            document.head.appendChild(a);
        }
        if (!document.querySelector('link[href="https://fonts.gstatic.com"][rel="preconnect"]')) {
            const b = document.createElement('link');
            b.rel = 'preconnect';
            b.href = 'https://fonts.gstatic.com';
            b.crossOrigin = 'anonymous';
            document.head.appendChild(b);
        }
    }

    private getOrCreateStylesheetLink(cssUrl: string): HTMLLinkElement | null {
        if (!cssUrl || !sys.isBrowser || typeof document === 'undefined') {
            return null;
        }
        this.ensureGooglePreconnect(cssUrl);
        let link = document.querySelector(`link[rel="stylesheet"][href="${cssUrl}"]`) as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssUrl;
            document.head.appendChild(link);
        }
        return link;
    }

    injectStylesheetInHead(cssUrl: string): void {
        this.getOrCreateStylesheetLink(cssUrl);
    }

    private styleElementIdForUrl(cssUrl: string): string {
        let h = 0;
        for (let i = 0; i < cssUrl.length; i++) {
            h = (Math.imul(31, h) + cssUrl.charCodeAt(i)) | 0;
        }
        return `cc-webfont-css-${(h >>> 0).toString(16)}`;
    }

    private injectGoogleFontsCssViaFetch(cssUrl: string): Promise<void> {
        if (!cssUrl || !sys.isBrowser || typeof document === 'undefined') {
            return Promise.resolve();
        }
        this.ensureGooglePreconnect(cssUrl);
        const id = this.styleElementIdForUrl(cssUrl);
        if (document.getElementById(id)) {
            return Promise.resolve();
        }
        return fetch(cssUrl, { mode: 'cors', credentials: 'omit' })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`Google Fonts CSS: HTTP ${res.status}`);
                }
                return res.text();
            })
            .then((css) => {
                if (document.getElementById(id)) {
                    return;
                }
                const style = document.createElement('style');
                style.id = id;
                style.textContent = css;
                document.head.appendChild(style);
            });
    }

    private whenStylesheetLinkLoaded(link: HTMLLinkElement): Promise<void> {
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (): void => {
                if (!settled) {
                    settled = true;
                    resolve();
                }
            };
            const fail = (): void => {
                if (!settled) {
                    settled = true;
                    reject(new Error('stylesheet load failed'));
                }
            };
            link.addEventListener('load', finish, { once: true });
            link.addEventListener('error', fail, { once: true });
            queueMicrotask(() => {
                try {
                    if (link.sheet) {
                        finish();
                    }
                } catch {
                }
            });
        });
    }

    injectStylesheetInHeadAsync(cssUrl: string): Promise<void> {
        if (!cssUrl || !sys.isBrowser || typeof document === 'undefined') {
            return Promise.resolve();
        }
        if (this.isGoogleFontsCssUrl(cssUrl)) {
            return this.injectGoogleFontsCssViaFetch(cssUrl).catch(() => {
                const link = this.getOrCreateStylesheetLink(cssUrl);
                return link ? this.whenStylesheetLinkLoaded(link) : Promise.resolve();
            });
        }
        const link = this.getOrCreateStylesheetLink(cssUrl);
        if (!link) {
            return Promise.resolve();
        }
        return this.whenStylesheetLinkLoaded(link);
    }

    isGoogleFontsCssUrl(url: string): boolean {
        return /^https?:\/\/fonts\.googleapis\.com\/css/i.test((url || '').trim());
    }

    familyNameFromGoogleFontsUrl(url: string): string | null {
        const s = (url || '').trim();
        if (!s) {
            return null;
        }
        try {
            const u = new URL(s.indexOf('//') >= 0 ? s : 'https:' + s);
            const raw = u.searchParams.get('family');
            if (!raw) {
                return null;
            }
            const beforeWeights = raw.split(':')[0];
            const decoded = decodeURIComponent(beforeWeights.replace(/\+/g, ' ')).trim();
            return decoded || null;
        } catch {
            const m = /[?&]family=([^&]+)/i.exec(s);
            if (!m) {
                return null;
            }
            const beforeWeights = decodeURIComponent(m[1]).split(':')[0];
            return beforeWeights.replace(/\+/g, ' ').trim() || null;
        }
    }

    pickFontUrlFromCss(css: string): string | null {
        const urls: string[] = [];
        const re = /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(css)) !== null) {
            urls.push(m[1].trim());
        }
        if (urls.length === 0) {
            return null;
        }
        const pick = (ext: string) =>
            urls.find((u) => u.replace(/\?.*$/, '').toLowerCase().endsWith('.' + ext));
        return pick('ttf') || pick('otf') || pick('woff2') || urls[0];
    }

    remoteFontExt(url: string): string {
        const path = url.replace(/\?.*$/, '');
        const m = path.match(/\.(ttf|otf|woff2)$/i);
        if (m) {
            return '.' + m[1].toLowerCase();
        }
        return '.ttf';
    }
}
