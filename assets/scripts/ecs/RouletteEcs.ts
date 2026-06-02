import { World } from './MiniWorld';
import { pickRandomRouletteSlot5050, type RouletteColor } from '../RedBlackRandom';
import type { PopUpLoseView } from '../view/PopUpLoseView';
import type { PopUpWinView } from '../view/PopUpWinView';
import type { PlayerBalanceView } from '../view/PlayerBalanceView';
import type { RouletteBetView } from '../view/RouletteBetView';

export type BeginSpinFailureReason = 'no_stake' | 'no_color' | 'insufficient_funds';

export type BeginSpinResult =
    | { ok: true }
    | { ok: false; reason: BeginSpinFailureReason };

export type SpinFinalizeOutcome =
    | { kind: 'idle' }
    | { kind: 'refund_no_color'; refund: number }
    | { kind: 'lose'; stake: number }
    | { kind: 'win'; stake: number; fromBalance: number; toBalance: number };

type GameState = {
    balance: number;
    bet: number;
    pendingStake: number;
    betColor: RouletteColor | null;
    spinInputLocked: boolean;
    spinUiUnlockListenerId: number;
    spinUiUnlockListeners: Map<number, () => void>;
};

type UiBindings = {
    balanceView: PlayerBalanceView | null;
    betView: RouletteBetView | null;
    winPopUpView: PopUpWinView | null;
    losePopUpView: PopUpLoseView | null;
};

type PopupRequest =
    | { kind: 'win'; amount: number }
    | { kind: 'lose'; amount: number };

type RouletteEntity = {
    gameState?: GameState;
    uiBindings?: UiBindings;
    popupRequest?: PopupRequest;
};

export type RouletteEcsOptions = {
    startingBalance: number;
    balanceView: PlayerBalanceView | null;
    betView: RouletteBetView | null;
    winPopUpView: PopUpWinView | null;
    losePopUpView: PopUpLoseView | null;
};

export type RouletteGameSession = ReturnType<typeof createRouletteEcsSession>;

export function createRouletteEcsSession(options: RouletteEcsOptions) {
    const world = new World<RouletteEntity>();
    const gameEntity = world.add({
        gameState: {
            balance: options.startingBalance,
            bet: 0,
            pendingStake: 0,
            betColor: null,
            spinInputLocked: false,
            spinUiUnlockListenerId: 0,
            spinUiUnlockListeners: new Map<number, () => void>(),
        },
    });

    const uiEntity = world.add({
        uiBindings: {
            balanceView: options.balanceView,
            betView: options.betView,
            winPopUpView: options.winPopUpView,
            losePopUpView: options.losePopUpView,
        },
    });

    const gameQuery = world.with('gameState');
    const uiQuery = world.with('uiBindings');
    const popupQuery = world.with('popupRequest');

    function getGameState(): GameState {
        const entity = gameQuery.entities[0];
        if (!entity?.gameState) {
            throw new Error('Roulette ECS game state entity is missing.');
        }
        return entity.gameState;
    }

    function getUiBindings(): UiBindings | null {
        return uiQuery.entities[0]?.uiBindings ?? null;
    }

    function syncBalanceView(): void {
        const ui = getUiBindings();
        const state = getGameState();
        const view = ui?.balanceView;
        if (view?.isValid) {
            view.setBalanceAndBet(state.balance, state.bet);
        }
    }

    function syncBetView(): void {
        const ui = getUiBindings();
        const state = getGameState();
        const view = ui?.betView;
        if (view?.isValid) {
            view.applyBetColorHighlight(state.betColor);
        }
    }

    function notifySpinUiUnlocked(): void {
        const state = getGameState();
        state.spinInputLocked = false;
        for (const fn of state.spinUiUnlockListeners.values()) {
            fn();
        }
        state.spinUiUnlockListeners.clear();
    }

    function presentPopupRequests(): void {
        const ui = getUiBindings();
        for (const entity of popupQuery.entities.slice()) {
            const request = entity.popupRequest;
            if (!request) {
                continue;
            }

            if (request.kind === 'win') {
                if (ui?.winPopUpView?.isValid) {
                    ui.winPopUpView.showWin(request.amount, notifySpinUiUnlocked);
                } else {
                    notifySpinUiUnlocked();
                }
            } else {
                if (ui?.losePopUpView?.isValid) {
                    ui.losePopUpView.showLose(request.amount, notifySpinUiUnlocked);
                } else {
                    notifySpinUiUnlocked();
                }
            }

            world.removeComponent(entity, 'popupRequest');
        }
    }

    function queuePopupRequest(request: PopupRequest): void {
        world.addComponent(gameEntity, 'popupRequest', request);
        presentPopupRequests();
    }

    function start(): void {
        syncBalanceView();
        syncBetView();
    }

    function dispose(): void {
        const state = getGameState();
        state.spinUiUnlockListeners.clear();
        world.remove(gameEntity);
        world.remove(uiEntity);
    }

    function addToBet(delta: number): void {
        const state = getGameState();
        if (delta <= 0 || state.balance <= 0) {
            return;
        }
        state.bet = Math.min(state.bet + delta, state.balance);
        syncBalanceView();
    }

    function resetBet(): void {
        const state = getGameState();
        state.bet = 0;
        syncBalanceView();
    }

    function setBetColor(color: RouletteColor): void {
        const state = getGameState();
        state.betColor = color;
        syncBetView();
    }

    function beginSpinRound(): boolean {
        const state = getGameState();
        if (state.spinInputLocked) {
            return false;
        }
        if (state.bet <= 0) {
            return false;
        }
        if (state.betColor == null) {
            return false;
        }
        if (state.bet > state.balance) {
            return false;
        }

        state.pendingStake = state.bet;
        syncBalanceView();
        return true;
    }

    function onceSpinUiUnlocked(cb: () => void): void {
        const state = getGameState();
        if (!state.spinInputLocked) {
            cb();
            return;
        }
        const id = ++state.spinUiUnlockListenerId;
        state.spinUiUnlockListeners.set(id, cb);
    }

    function finalizeSpin(resultColor: RouletteColor): SpinFinalizeOutcome {
        const state = getGameState();
        const stake = state.pendingStake;

        if (stake <= 0) {
            return { kind: 'idle' };
        }

        if (state.betColor == null) {
            state.pendingStake = 0;
            syncBetView();
            syncBalanceView();
            return { kind: 'refund_no_color', refund: 0 };
        }

        state.pendingStake = 0;
        syncBetView();

        if (state.betColor !== resultColor) {
            state.balance -= stake;
            state.spinInputLocked = true;
            syncBalanceView();
            queuePopupRequest({ kind: 'lose', amount: stake });
            return { kind: 'lose', stake };
        }

        const fromBalance = state.balance;
        const toBalance = fromBalance + stake;
        const balanceView = getUiBindings()?.balanceView;

        state.spinInputLocked = true;
        syncBalanceView();
        queuePopupRequest({ kind: 'win', amount: toBalance - fromBalance });

        if (balanceView?.isValid) {
            balanceView.animateBalance(fromBalance, toBalance, () => {
                state.balance = toBalance;
                syncBalanceView();
            });
        } else {
            state.balance = toBalance;
            syncBalanceView();
        }

        return { kind: 'win', stake, fromBalance, toBalance };
    }

    function wheelAngleForSlot(slot: number, initialWheelAngleDeg: number, slotAngleOffsetDeg: number): number {
        const step = 360 / 8;
        const slotCenterAngle = (slot - 1) * step;
        return slotCenterAngle + initialWheelAngleDeg - slotAngleOffsetDeg;
    }

    function pickRandomSlot1to8(): number {
        return pickRandomRouletteSlot5050();
    }

    function getSnapshot() {
        const state = getGameState();
        return {
            balance: state.balance,
            bet: state.bet,
            pendingStake: state.pendingStake,
            betColor: state.betColor,
            spinInputLocked: state.spinInputLocked,
        };
    }

    return {
        world,
        start,
        dispose,
        addToBet,
        resetBet,
        setBetColor,
        beginSpinRound,
        onceSpinUiUnlocked,
        finalizeSpin,
        wheelAngleForSlot,
        pickRandomSlot1to8,
        getSnapshot,
    };
}
