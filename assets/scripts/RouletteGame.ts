import { _decorator, Component } from 'cc';
import { PlayerBalanceController } from './controller/PlayerBalanceController';
import { RouletteBetController } from './controller/RouletteBetController';
import { RouletteGameController, type RouletteGameControllerOptions } from './controller/RouletteGameController';
import { PlayerBalanceView } from './view/PlayerBalanceView';
import { RouletteBetView } from './view/RouletteBetView';

const { ccclass, property } = _decorator;

@ccclass('RouletteGame')
export class RouletteGame extends Component {
    @property({ type: PlayerBalanceView, tooltip: 'Обязательно: View баланса для этой игры' })
    balanceView: PlayerBalanceView | null = null;

    @property({
        type: RouletteBetView,
        tooltip: 'View ставок (красное/чёрное); как balanceView — явная ссылка, без поиска по сцене',
    })
    betView: RouletteBetView | null = null;

    @property({ tooltip: 'Стартовый баланс при первом запуске сцены' })
    startingBalance = 1000;

    private _controller: RouletteGameController | null = null;
    private _balanceController: PlayerBalanceController | null = null;
    private _betController: RouletteBetController | null = null;

    onLoad() {
        const v = this.balanceView;
        if (!v?.isValid) {
            console.error('[RouletteGame] Назначьте PlayerBalanceView в инспекторе.');
            return;
        }

        const opts: RouletteGameControllerOptions = {
            balanceView: v,
            betView: this.betView,
            startingBalance: this.startingBalance,
        };

        this._controller = new RouletteGameController(opts);
    }

    onDestroy() {
        this._balanceController?.dispose();
        this._betController?.dispose();
        this._balanceController = null;
        this._betController = null;
        this._controller = null;
    }

    start() {
        const game = this._controller;
        const balance = this.balanceView;
        if (game && balance?.isValid) {
            this._balanceController = new PlayerBalanceController(balance, game);
            this._balanceController.start();
        }

        const betView = this.betView;
        if (game && balance?.isValid && betView?.isValid) {
            this._betController = new RouletteBetController(betView, game);
            this._betController.start();
        }

        game?.start();
        this.scheduleOnce(() => this._controller?.refreshBalanceView(), 0);
    }

    get game(): RouletteGameController | null {
        return this._controller;
    }
}
