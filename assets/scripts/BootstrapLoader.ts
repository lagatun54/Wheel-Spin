import { _decorator, Component, director, Label } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('BootstrapLoader')
export class BootstrapLoader extends Component {
    @property({ tooltip: 'Имя основной сцены, которая будет открыта после preload' })
    targetSceneName = 'scene';

    @property({ tooltip: 'Текст во время подготовки' })
    initialStatusText = 'Preparing game...';

    @property({ tooltip: 'Текст во время preload основной сцены' })
    preloadStatusText = 'Loading assets...';

    @property({ tooltip: 'Текст перед переходом в игру' })
    completeStatusText = 'Starting game...';

    @property(Label)
    statusLabel: Label | null = null;

    @property(Label)
    progressLabel: Label | null = null;

    private _started = false;

    start(): void {
        if (this._started) {
            return;
        }
        this._started = true;
        this.setStatus(this.initialStatusText);
        this.setProgress(0);
        this.preloadAndLaunch();
    }

    private setStatus(text: string): void {
        if (this.statusLabel?.isValid) {
            this.statusLabel.string = text;
        }
    }

    private setProgress(value: number): void {
        const normalized = Math.max(0, Math.min(1, value));
        if (this.progressLabel?.isValid) {
            this.progressLabel.string = `${Math.round(normalized * 100)}%`;
        }
    }

    private preloadAndLaunch(): void {
        this.setStatus(this.preloadStatusText);

        director.preloadScene(
            this.targetSceneName,
            (completedCount: number, totalCount: number) => {
                if (totalCount <= 0) {
                    this.setProgress(0);
                    return;
                }
                this.setProgress(completedCount / totalCount);
            },
            (error: Error | null) => {
                if (error) {
                    console.error(`[BootstrapLoader] Failed to preload scene "${this.targetSceneName}".`, error);
                    this.setStatus('Failed to load game');
                    return;
                }

                this.setStatus(this.completeStatusText);
                this.setProgress(1);
                director.loadScene(this.targetSceneName);
            },
        );
    }
}
