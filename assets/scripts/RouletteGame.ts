import { _decorator, Component } from 'cc';
import { getPopUpLoseViewOrNull, getPopUpWinViewOrNull } from './di/popupBindings';
import { createRouletteEcsSession, type RouletteGameSession } from './ecs/RouletteEcs';
import { PlayerBalanceView } from './view/PlayerBalanceView';
import { RouletteBetView } from './view/RouletteBetView';
import { RouletteGameView } from './view/RouletteGameView';

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

    @property({
        type: RouletteGameView,
        tooltip: 'View колеса/кнопки spin',
    })
    gameView: RouletteGameView | null = null;

    @property({ tooltip: 'Стартовый баланс при первом запуске сцены' })
    startingBalance = 1000;

    private _session: RouletteGameSession | null = null;
    private _resolvedGameView: RouletteGameView | null = null;

    onLoad() {
        const v = this.balanceView;
        if (!v?.isValid) {
            console.error('[RouletteGame] Назначьте PlayerBalanceView в инспекторе.');
            return;
        }

        this._resolvedGameView = this.gameView;
        this._session = createRouletteEcsSession({
            balanceView: v,
            betView: this.betView,
            startingBalance: this.startingBalance,
            winPopUpView: getPopUpWinViewOrNull(),
            losePopUpView: getPopUpLoseViewOrNull(),
        });

        this.bindUiEvents();
    }

    onDestroy() {
        this.unbindUiEvents();
        this._session?.dispose();
        this._session = null;
        this._resolvedGameView = null;
    }

    start() {
        this._session?.start();
    }

    get game(): RouletteGameSession | null {
        return this._session;
    }

    private bindUiEvents(): void {
        const session = this._session;
        if (!session) {
            return;
        }

        this.balanceView?.on(PlayerBalanceView.EventType.ADD_BET_10, this.onAddBet10, this);
        this.balanceView?.on(PlayerBalanceView.EventType.ADD_BET_50, this.onAddBet50, this);
        this.balanceView?.on(PlayerBalanceView.EventType.RESET_BET, this.onResetBet, this);
        this.betView?.on(RouletteBetView.EventType.SELECT_RED, this.onSelectRed, this);
        this.betView?.on(RouletteBetView.EventType.SELECT_BLACK, this.onSelectBlack, this);
        this._resolvedGameView?.bindGame(session);
        this._resolvedGameView?.on(RouletteGameView.EventType.SPIN, this.onSpinRequested, this);
    }

    private unbindUiEvents(): void {
        this.balanceView?.off(PlayerBalanceView.EventType.ADD_BET_10, this.onAddBet10, this);
        this.balanceView?.off(PlayerBalanceView.EventType.ADD_BET_50, this.onAddBet50, this);
        this.balanceView?.off(PlayerBalanceView.EventType.RESET_BET, this.onResetBet, this);
        this.betView?.off(RouletteBetView.EventType.SELECT_RED, this.onSelectRed, this);
        this.betView?.off(RouletteBetView.EventType.SELECT_BLACK, this.onSelectBlack, this);
        this._resolvedGameView?.off(RouletteGameView.EventType.SPIN, this.onSpinRequested, this);
        this._resolvedGameView?.bindGame(null);
    }

    private onAddBet10(): void {
        this._session?.addToBet(10);
    }

    private onAddBet50(): void {
        this._session?.addToBet(50);
    }

    private onResetBet(): void {
        this._session?.resetBet();
    }

    private onSelectRed(): void {
        this._session?.setBetColor('red');
    }

    private onSelectBlack(): void {
        this._session?.setBetColor('black');
    }

    private onSpinRequested(): void {
        const session = this._session;
        if (!session) {
            return;
        }
        this._resolvedGameView?.playSpin(session);
    }
}
