import { _decorator, Component, screen, sys } from 'cc';

const { ccclass } = _decorator;

@ccclass('BrowserFullscreen')
export class BrowserFullscreen extends Component {
    enterFullscreen(): void {
        if (!sys.isBrowser) {
            return;
        }
        if (screen.fullScreen()) {
            void screen.exitFullScreen().catch(() => {});
            return;
        }
        void screen.requestFullScreen().catch(() => {});
    }
}
