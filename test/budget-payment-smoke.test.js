const test = require("node:test");
const assert = require("node:assert/strict");
const { amountToPaise, getPeriodInfo } = require("../services/budgetService");

test("money conversion uses integer paise", () => {
    assert.equal(amountToPaise(500), 50000);
    assert.equal(amountToPaise("12.34"), 1234);
    assert.throws(() => amountToPaise(0), /positive valid number/);
    assert.throws(() => amountToPaise(12.345), /at most two decimal places/);
});

test("budget period keys are stable for daily, weekly and monthly rules", () => {
    const info = getPeriodInfo(new Date("2026-09-15T12:00:00+05:30"));
    assert.match(info.daily.key, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(info.weekly.key, /^\d{4}-W\d{2}$/);
    assert.equal(info.monthly.key, "2026-09");
});
