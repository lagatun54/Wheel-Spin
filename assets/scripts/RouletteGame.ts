import { _decorator, Component } from 'cc';
import {
    bindPlayerBalanceView,
    bindRouletteBetView,
    showLosePopUp,
    showWinPopUp,
    type ViewBindingDispose,
} from './controller/RouletteGameUi';
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
    private _disposeBalanceBinding: ViewBindingDispose | null = null;
    private _disposeBetBinding: ViewBindingDispose | null = null;

    onLoad() {
        const v = this.balanceView;
        if (!v?.isValid) {
            console.error('[RouletteGame] Назначьте PlayerBalanceView в инспекторе.');
            return;
        }

        const betView = this.betView;
        const opts: RouletteGameControllerOptions = {
            startingBalance: this.startingBalance,
            onBalanceChanged: (state) => {
                if (v.isValid) {
                    v.setBalanceAndBet(state.balance, state.bet);
                }
            },
            onBetColorChanged: (state) => {
                if (betView?.isValid) {
                    betView.applyBetColorHighlight(state.betColor);
                }
            },
            onShowLosePopup: (stake, onDismissed) => {
                showLosePopUp(stake, onDismissed);
            },
            onShowWinPopup: (payout, onDismissed) => {
                showWinPopUp(payout, onDismissed);
            },
            onAnimateBalance: (fromBalance, toBalance, onComplete) => {
                if (v.isValid) {
                    v.animateBalance(fromBalance, toBalance, onComplete);
                } else {
                    onComplete();
                }
            },
        };

        this._controller = new RouletteGameController(opts);
    }

    onDestroy() {
        this._disposeBalanceBinding?.();
        this._disposeBetBinding?.();
        this._disposeBalanceBinding = null;
        this._disposeBetBinding = null;
        this._controller = null;
    }

    start() {
        const game = this._controller;
        const balance = this.balanceView;
        const betView = this.betView;
        if (game && balance?.isValid) {
            this._disposeBalanceBinding = bindPlayerBalanceView(balance, {
                dispatch: (action) => game.dispatch(action),
                getState: () => game.state,
            });
        }

        if (game && balance?.isValid && betView?.isValid) {
            this._disposeBetBinding = bindRouletteBetView(betView, {
                dispatch: (action) => game.dispatch(action),
                getState: () => game.state,
            });
        }

        game?.start();
        this.scheduleOnce(() => this._controller?.refreshBalanceView(), 0);
    }

    get game(): RouletteGameController | null {
        return this._controller;
    }
}
