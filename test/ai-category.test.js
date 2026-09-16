const test = require("node:test");
const assert = require("node:assert/strict");
const { getLocalCategory, getCategory } = require("../services/aiService");

test("getLocalCategory does not recurse infinitely and classifies known keywords", () => {
    assert.equal(getLocalCategory("Uber ride to office"), "Travel");
    assert.equal(getLocalCategory("petrol refill"), "Travel");
    assert.equal(getLocalCategory("diesel for generator"), "Travel");
    assert.equal(getLocalCategory("evening tea"), "Food");
    assert.equal(getLocalCategory("Swiggy dinner order"), "Food");
    assert.equal(getLocalCategory("Amazon shopping"), "Shopping");
    assert.equal(getLocalCategory("Netflix subscription"), "Entertainment");
    assert.equal(getLocalCategory("doctor visit"), "Health");
    assert.equal(getLocalCategory("broadband bill"), "Bills");
    assert.equal(getLocalCategory("mobile recharge"), "Bills");
    assert.equal(getLocalCategory(""), null);
    assert.equal(getLocalCategory("something totally unrelated xyz"), null);
});

test("getCategory resolves obvious descriptions locally without needing Gemini", async () => {
    assert.equal(await getCategory("Ola cab to airport"), "Travel");
    assert.equal(await getCategory("Zomato lunch"), "Food");
    assert.equal(await getCategory(""), "Other");
});
