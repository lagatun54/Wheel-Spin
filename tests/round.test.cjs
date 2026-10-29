const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

// Transpile for Node; type checking uses the Cocos project configuration separately.
const output = mkdtempSync(path.join(tmpdir(), 'wheel-spin-tests-'));
try {
    execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'),
        '--noCheck', '--experimentalDecorators', '--target', 'ES2020', '--module', 'commonjs', '--outDir', output,
        'assets/scripts/controller/RouletteGameController.ts',
        'assets/scripts/controller/RoundResultController.ts',
        'assets/scripts/controller/PopUpWinController.ts',
        'assets/scripts/controller/PopUpLoseController.ts',
    ], { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' });
} catch (error) {
    rmSync(output, { recursive: true, force: true });
    throw error;
}
after(() => rmSync(output, { recursive: true, force: true }));
const { RouletteGameModel, canEditBet, canSpin } = require(path.join(output, 'model/RouletteGameModel.js'));
const { RouletteGameController } = require(path.join(output, 'controller/RouletteGameController.js'));
const { showRoundResult } = require(path.join(output, 'controller/RoundResultController.js'));

function deferred() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
}

function modelWithBet() {
    const model = new RouletteGameModel();
    model.setStartingBalance(100);
    model.addToBet(10, true);
    model.setBetColor('red');
    return model;
}

function fixture(overrides = {}) {
    const calls = { wheel: 0, blink: 0, spinEnabled: true, bettingEnabled: true };
    const balanceView = {
        isValid: true,
        setBalanceAndBet(balance) { calls.displayBalance = balance; },
        setButtonsInteractable(enabled) { calls.bettingEnabled = enabled; },
        animateBalanceAsync: async () => {},
        ...overrides.balance,
    };
    const controller = new RouletteGameController({
        balanceView, startingBalance: 100,
        requestSpin: async () => ({ slot: 1 }), showResult: async () => {}, ...overrides.options,
    });
    controller.model.addToBet(10, true);
    controller.model.setBetColor('red');
    const view = {
        isValid: true,
        enabledInHierarchy: true,
        setSpinButtonInteractable(enabled) { calls.spinEnabled = enabled; },
        playWheelAsync: async () => { calls.wheel++; return true; },
        showLastResult(outcome) { calls.outcome = outcome; },
        playLastResultBlink() { calls.blink++; },
        ...overrides.view,
    };
    // Headless views observe the model directly, as the Cocos views do in MVC.
    const offBalance = controller.model.subscribe((state) => {
        balanceView.setButtonsInteractable(canEditBet(state));
        if (state.round.phase !== 'presenting' || state.round.result.kind !== 'win') {
            balanceView.setBalanceAndBet(state.balance, state.bet);
        }
    });
    const offSpin = controller.model.subscribe((state) => view.setSpinButtonInteractable(canSpin(state)));
    return { controller, view, calls, balanceView, disposeViews: () => { offBalance(); offSpin(); } };
}

test('invalid bets do not start a round', () => {
    const model = new RouletteGameModel();
    assert.deepEqual(model.beginSpinRound(), { ok: false, reason: 'no_stake' });
    model.setStartingBalance(5);
    model.addToBet(10, false);
    assert.deepEqual(model.beginSpinRound(), { ok: false, reason: 'no_color' });
    model.setBetColor('red');
    assert.deepEqual(model.beginSpinRound(), { ok: false, reason: 'insufficient_funds' });
    assert.equal(model.phase, 'betting');
});

test('win commits immediately and can only be settled once', () => {
    const model = modelWithBet();
    model.beginSpinRound();
    const outcome = model.finalizeSpin('red');
    assert.deepEqual(outcome, { kind: 'win', stake: 10, fromBalance: 100, toBalance: 110 });
    assert.equal(model.balance, 110);
    assert.deepEqual(model.finalizeSpin('red'), { kind: 'idle' });
    assert.equal(model.balance, 110);
    assert.equal(model.phase, 'presenting');
});

test('stake, color and balance cannot change during spin or presentation', () => {
    const model = modelWithBet();
    model.beginSpinRound();
    for (const phase of ['spinning', 'presenting']) {
        assert.equal(model.phase, phase);
        model.addToBet(50, true);
        model.resetBetAmount();
        model.setBetColor('black');
        model.clearBetColor();
        model.setStartingBalance(999);
        assert.equal(model.bet, 10);
        assert.equal(model.betColor, 'red');
        assert.deepEqual(model.beginSpinRound(), { ok: false, reason: 'round_in_progress' });
        if (phase === 'spinning') model.finalizeSpin('red');
    }
    assert.equal(model.balance, 110);
    model.finishPresentation();
    model.setBetColor('black');
    assert.equal(model.betColor, 'black');
});

test('cancel clears pending stake and cannot charge the abandoned round', () => {
    const model = modelWithBet();
    model.beginSpinRound();
    model.cancelSpinRound();
    assert.equal(model.pendingStake, 0);
    assert.equal(model.phase, 'betting');
    assert.deepEqual(model.finalizeSpin('black'), { kind: 'idle' });
    assert.equal(model.balance, 100);
    assert.deepEqual(model.beginSpinRound(), { ok: true });
    model.finalizeSpin('black');
    assert.equal(model.balance, 90);
});

test('controller keeps win committed and input locked until both effects finish', async () => {
    const animation = deferred();
    const popup = deferred();
    const { controller, view, calls } = fixture({
        balance: { animateBalanceAsync: () => animation.promise },
        options: { showResult: () => popup.promise },
    });
    const round = controller.playRoundAsync(view);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(controller.model.balance, 110);
    assert.equal(calls.bettingEnabled, false);
    await controller.playRoundAsync(view);
    assert.equal(calls.wheel, 1);
    popup.resolve();
    await Promise.resolve();
    assert.equal(controller.model.phase, 'presenting');
    animation.resolve();
    await round;
    assert.equal(calls.blink, 1);
    assert.equal(calls.spinEnabled, true);
    assert.equal(calls.bettingEnabled, true);
    assert.equal(calls.displayBalance, 110);
    assert.equal(controller.model.phase, 'betting');
});

test('request failure unlocks the round without changing balance', async () => {
    const { controller, view, calls } = fixture({ options: {
        requestSpin: async (request) => {
            assert.deepEqual(request, { stake: 10, color: 'red' });
            throw new Error('network failed');
        },
    } });
    await assert.rejects(controller.playRoundAsync(view), /network failed/);
    assert.equal(controller.model.balance, 100);
    assert.equal(controller.model.phase, 'betting');
    assert.equal(calls.wheel, 0);
});

test('disposed controller ignores a pending network response', async () => {
    const response = deferred();
    const { controller, view, calls } = fixture({ options: { requestSpin: () => response.promise } });
    const round = controller.playRoundAsync(view);
    controller.dispose();
    response.resolve({ slot: 1 });
    await round;
    assert.equal(controller.model.balance, 100);
    assert.equal(calls.wheel, 0);
});

test('a response received while the spin view is disabled cancels the round', async () => {
    const response = deferred();
    const { controller, view, calls } = fixture({ options: { requestSpin: () => response.promise } });
    const round = controller.playRoundAsync(view);
    view.enabledInHierarchy = false;
    response.resolve({ slot: 1 });
    await round;
    assert.equal(controller.model.balance, 100);
    assert.equal(controller.model.phase, 'betting');
    assert.equal(calls.wheel, 0);
});

test('interrupted wheel cancels rather than settling a result', async () => {
    const { controller, view, calls } = fixture({ view: { playWheelAsync: async () => false } });
    await controller.playRoundAsync(view);
    assert.equal(controller.model.balance, 100);
    assert.equal(controller.model.pendingStake, 0);
    assert.equal(controller.model.phase, 'betting');
    assert.equal(calls.outcome, undefined);
    assert.equal(calls.spinEnabled, true);
});

test('wheel failure releases the round and allows retry', async () => {
    const { controller, view, calls } = fixture({ view: {
        playWheelAsync: async () => { throw new Error('animation failed'); },
    } });
    await assert.rejects(controller.playRoundAsync(view), /animation failed/);
    assert.equal(controller.model.pendingStake, 0);
    assert.equal(controller.model.phase, 'betting');
    assert.equal(calls.bettingEnabled, true);
    view.playWheelAsync = async () => true;
    await controller.playRoundAsync(view);
    assert.equal(controller.model.balance, 110);
});

test('disposed controller does not settle or accept another round', async () => {
    const wheel = deferred();
    const { controller, view, calls } = fixture({ view: { playWheelAsync: () => wheel.promise } });
    const round = controller.playRoundAsync(view);
    controller.dispose();
    wheel.resolve(true);
    await round;
    assert.equal(controller.model.balance, 100);
    assert.equal(controller.model.pendingStake, 0);
    assert.equal(calls.outcome, undefined);
    await controller.playRoundAsync(view);
    assert.equal(controller.model.phase, 'betting');
});

test('loss is committed without requiring a balance animation', async () => {
    const { controller, view, calls } = fixture({
        options: { requestSpin: async () => ({ slot: 2 }) },
        balance: { animateBalanceAsync: () => { throw new Error('must not animate loss'); } },
    });
    await controller.playRoundAsync(view);
    assert.equal(controller.model.balance, 90);
    assert.equal(calls.displayBalance, 90);
    assert.equal(calls.outcome.kind, 'lose');
});

test('missing or destroyed popup resolves and valid popup waits for dismissal', async () => {
    await showRoundResult({ kind: 'lose', stake: 10 }, () => null, () => null);
    await showRoundResult({ kind: 'lose', stake: 10 }, () => null, () => ({ isValid: false }));
    let dismiss;
    let completed = false;
    const shown = showRoundResult({ kind: 'lose', stake: 10 }, () => null, () => ({
        isValid: true, showLose(stake, done) { assert.equal(stake, 10); dismiss = done; },
    })).then(() => { completed = true; });
    await Promise.resolve();
    assert.equal(completed, false);
    dismiss();
    await shown;
    assert.equal(completed, true);
});

test('presentation failure preserves payout and waits for remaining effects', async () => {
    const popup = deferred();
    const { controller, view, calls } = fixture({
        balance: { animateBalanceAsync: () => { throw new Error('counter failed'); } },
        options: { showResult: () => popup.promise },
    });
    const round = controller.playRoundAsync(view);
    // Observe the rejection immediately, even if the test fails before releasing the popup.
    const rejected = assert.rejects(round, /counter failed/);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(controller.model.balance, 110);
    assert.equal(controller.model.phase, 'presenting');
    assert.equal(calls.bettingEnabled, false);
    popup.resolve();
    await rejected;
    assert.equal(controller.model.balance, 110);
    assert.equal(controller.model.phase, 'betting');
    assert.equal(calls.bettingEnabled, true);
});

test('subscribers receive one atomic snapshot per transition and old snapshots stay immutable', () => {
    const model = modelWithBet();
    const states = [];
    model.subscribe((state) => states.push(state));
    const initial = states[0];
    model.beginSpinRound();
    model.finalizeSpin('red');
    assert.equal(states.length, 3);
    assert.deepEqual(states[1].round, { phase: 'spinning', stake: 10, color: 'red' });
    assert.equal(states[2].balance, 110);
    assert.equal(states[2].round.result.kind, 'win');
    assert.equal(initial.balance, 100);
    assert.equal(initial.round.phase, 'betting');
    assert.equal(Reflect.set(states[2], 'balance', 999), false);
    assert.equal(Reflect.set(states[2].round, 'phase', 'betting'), false);
    assert.equal(Reflect.set(states[2].round.result, 'stake', 999), false);
});

test('no-op and rejected commands do not notify; unsubscribe is independent and idempotent', () => {
    const model = modelWithBet();
    let notifications = 0;
    const listener = () => { notifications++; };
    const off = model.subscribe(listener);
    const offSecond = model.subscribe(listener);
    model.setBetColor('red');
    model.addToBet(NaN, true);
    model.setStartingBalance(Infinity);
    assert.equal(notifications, 2);
    off();
    off();
    model.beginSpinRound();
    assert.equal(notifications, 3);
    model.setBetColor('black');
    assert.equal(notifications, 3);
    offSecond();
    model.finalizeSpin('red');
    assert.equal(notifications, 3);
});

test('derived permissions follow validity of the bet and round phase', () => {
    const model = new RouletteGameModel();
    assert.equal(canEditBet(model.getSnapshot()), true);
    assert.equal(canSpin(model.getSnapshot()), false);
    model.setStartingBalance(5);
    model.addToBet(10, false);
    model.setBetColor('red');
    assert.equal(canSpin(model.getSnapshot()), false);
    model.resetBetAmount();
    model.addToBet(5, true);
    assert.equal(canSpin(model.getSnapshot()), true);
    model.beginSpinRound();
    assert.equal(canEditBet(model.getSnapshot()), false);
    assert.equal(canSpin(model.getSnapshot()), false);
    model.finalizeSpin('black');
    model.finishPresentation();
    assert.equal(canEditBet(model.getSnapshot()), true);
    assert.equal(canSpin(model.getSnapshot()), false);
});

test('MVC view observers follow model commands and can unsubscribe independently', () => {
    const { controller, calls, disposeViews } = fixture();
    controller.model.resetBetAmount();
    assert.equal(calls.spinEnabled, false);
    controller.model.addToBet(50, true);
    assert.equal(calls.spinEnabled, true);
    assert.equal(calls.displayBalance, 100);
    controller.model.clearBetColor();
    assert.equal(calls.spinEnabled, false);
    disposeViews();
    controller.dispose();
    controller.model.setStartingBalance(999);
    controller.model.setBetColor('black');
    assert.equal(calls.displayBalance, 100);
    assert.equal(calls.spinEnabled, false);
});

test('win snapshot does not overwrite the running display counter', async () => {
    const counter = deferred();
    const displayed = [];
    const { controller, view } = fixture({
        balance: {
            setBalanceAndBet(value) { displayed.push(value); },
            animateBalanceAsync: () => counter.promise,
        },
    });
    const round = controller.playRoundAsync(view);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(controller.model.balance, 110);
    assert.equal(displayed.includes(110), false);
    counter.resolve();
    await round;
    assert.equal(displayed.at(-1), 110);
});

test('subscriber errors and synchronous feedback cannot corrupt a committed transition', (t) => {
    const errors = [];
    t.mock.method(console, 'error', (...args) => errors.push(args));
    const model = modelWithBet();
    model.subscribe((state) => {
        if (state.round.phase === 'spinning') model.cancelSpinRound();
    });
    const states = [];
    model.subscribe((state) => states.push(state));
    assert.deepEqual(model.beginSpinRound(), { ok: true });
    assert.equal(errors.length, 1);
    assert.equal(model.phase, 'spinning');
    assert.equal(states.at(-1).round.phase, 'spinning');
    model.finalizeSpin('red');
    assert.equal(model.balance, 110);
});

// Run real View binding/lifecycle code with only the Cocos component shell stubbed.
function loadView(name) {
    const ts = require('typescript');
    const { readFileSync } = require('node:fs');
    const { runInNewContext } = require('node:vm');
    const source = readFileSync(path.join(__dirname, '..', 'assets/scripts/view', `${name}.ts`), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: {
        target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, experimentalDecorators: true,
    } }).outputText;
    const exports = {};
    runInNewContext(js, {
        exports,
        require(id) {
            if (id === 'cc') return {
                _decorator: { ccclass: () => () => {}, property: () => () => {} },
                Component: class { isValid = true; enabledInHierarchy = true; },
                Button: { EventType: { CLICK: 'click' } },
            };
            if (id === '../UI/Button') return { Button: { EventType: { CLICK: 'click' } } };
            if (id === '../di/rouletteGameBindings') return { getRouletteGameOrNull: () => null };
            return require(path.resolve(output, 'view', id));
        },
        console,
    });
    return exports[name];
}

test('actual MVC balance and color views observe model directly and detach on destroy', () => {
    const PlayerBalanceView = loadView('PlayerBalanceView');
    const RouletteBetView = loadView('RouletteBetView');
    const balance = new PlayerBalanceView();
    const bet = new RouletteBetView();
    const model = modelWithBet();
    balance.balanceLabel = { string: '' };
    balance.betLabel = { string: '' };
    let selectedColor;
    let enabled;
    bet.applyBetColorHighlight = (color) => { selectedColor = color; };
    bet.setButtonsInteractable = (value) => { enabled = value; };
    balance.bindModel(model);
    bet.bindModel(model);
    model.addToBet(10, true);
    model.setBetColor('black');
    assert.equal(balance.betLabel.string, '20');
    assert.equal(selectedColor, 'black');
    model.beginSpinRound();
    assert.equal(enabled, false);
    model.finalizeSpin('black');
    assert.equal(model.balance, 120);
    assert.equal(balance.balanceLabel.string, '100');
    model.finishPresentation();
    assert.equal(balance.balanceLabel.string, '120');
    assert.equal(enabled, true);
    balance.onDisable();
    bet.onDisable();
    model.resetBetAmount();
    model.setBetColor('red');
    assert.equal(balance.betLabel.string, '20');
    assert.equal(selectedColor, 'black');
    balance.onEnable();
    bet.onEnable();
    assert.equal(balance.betLabel.string, '0');
    assert.equal(selectedColor, 'red');
    model.addToBet(20, true);
    model.setBetColor('black');
    balance.onDestroy();
    bet.onDestroy();
    model.resetBetAmount();
    model.setBetColor('red');
    assert.equal(balance.betLabel.string, '20');
    assert.equal(selectedColor, 'black');
});

test('actual spin view observes permissions without controller rendering or subscriptions', () => {
    const RouletteGameView = loadView('RouletteGameView');
    const view = new RouletteGameView();
    const model = modelWithBet();
    view._game = { model };
    view.spinButton = { isValid: true, interactable: false, node: { off() {} } };
    view.start();
    assert.equal(view.spinButton.interactable, true);
    model.beginSpinRound();
    assert.equal(view.spinButton.interactable, false);
    model.cancelSpinRound();
    assert.equal(view.spinButton.interactable, true);
    view.onDisable();
    model.clearBetColor();
    assert.equal(view.spinButton.interactable, true);
    view.onEnable();
    assert.equal(view.spinButton.interactable, false);
    view.onDestroy();
    model.setBetColor('red');
    assert.equal(view.spinButton.interactable, false);
});

function popupFixture(kind) {
    const { [`PopUp${kind}Controller`]: Controller } = require(path.join(output, `controller/PopUp${kind}Controller.js`));
    const { [`PopUp${kind}Model`]: Model } = require(path.join(output, `model/PopUp${kind}Model.js`));
    const calls = { hidden: 0, show: [], hide: [], scheduled: new Map() };
    const view = {
        isValid: true, showAnimDuration: 0.3, hideAnimDuration: 0.2, autoCloseSeconds: 2.5,
        setController(controller) { this.controller = controller; },
        applyWinAmount(value) { calls.amount = value; },
        applyLoseStake(value) { calls.amount = value; },
        playScaleShowAnimation(duration, done) { calls.show.push(done); },
        playScaleHideAnimation(duration, done) { calls.hide.push(done); },
        hideImmediate() { calls.hidden++; this.controller?.onViewHidden(); },
        scheduleOnce(callback, delay) { calls.scheduled.set(callback, delay); },
        unschedule(callback) { calls.scheduled.delete(callback); },
    };
    const model = new Model();
    const controller = new Controller(model, view);
    return { controller, model, view, calls, show: (amount, done) => controller[`show${kind}`](amount, done) };
}

for (const kind of ['Win', 'Lose']) {
    test(`${kind} popup controller owns showing, auto close, and exactly-once dismissal`, () => {
        const { controller, model, view, calls, show } = popupFixture(kind);
        let dismissed = 0;
        assert.equal(controller.model, model);
        assert.equal(view.controller, controller);
        show(25, () => { dismissed++; });
        assert.equal(calls.amount, 25);
        assert.equal(calls.scheduled.size, 0);
        assert.equal(dismissed, 0);
        calls.show[0]();
        const [close, delay] = [...calls.scheduled][0];
        assert.equal(delay, 2.5);
        close();
        assert.equal(calls.scheduled.size, 0);
        assert.equal(dismissed, 0);
        controller.hideWithAnimation();
        assert.equal(calls.hide.length, 1);
        calls.hide[0]();
        assert.equal(calls.hidden, 1);
        assert.equal(dismissed, 1);
        controller.dispose();
        assert.equal(dismissed, 1);
    });

    test(`${kind} popup cancellation invalidates pending animation callbacks and resolves on destruction`, () => {
        const { controller, view, calls, show } = popupFixture(kind);
        let first = 0;
        let second = 0;
        show(10, () => { first++; });
        controller.hideWithAnimation();
        show(20, () => { second++; });
        assert.equal(first, 1);
        calls.show[0]();
        calls.hide[0]();
        assert.equal(calls.hidden, 0);
        assert.equal(calls.scheduled.size, 0);
        calls.show[1]();
        assert.equal(calls.scheduled.size, 1);
        view.isValid = false;
        controller.dispose();
        controller.dispose();
        assert.equal(second, 1);
        assert.equal(calls.scheduled.size, 0);
        assert.equal(view.controller, null);
        calls.show[1]();
        assert.equal(calls.scheduled.size, 0);
    });
}

test('a popup reopened in its dismissal callback stays open', () => {
    const { controller, calls } = popupFixture('Win');
    let secondDismissed = 0;
    controller.showWin(10, () => controller.showWin(20, () => { secondDismissed++; }));
    calls.show[0]();
    controller.hideWithAnimation();
    calls.hide[0]();
    assert.equal(secondDismissed, 0);
    calls.show[1]();
    controller.hideWithAnimation();
    calls.hide[1]();
    assert.equal(secondDismissed, 1);
});

test('round result waits on the popup controller and completes when its view is destroyed', async () => {
    const { controller, calls, view } = popupFixture('Win');
    let completed = false;
    const shown = showRoundResult({ kind: 'win', stake: 10, fromBalance: 100, toBalance: 110 }, () => controller, () => null)
        .then(() => { completed = true; });
    calls.show[0]();
    await Promise.resolve();
    assert.equal(completed, false);
    view.isValid = false;
    controller.dispose();
    await shown;
    assert.equal(completed, true);
});
