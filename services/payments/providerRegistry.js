const cashfreeProvider = require("./providers/cashfreeProvider");

const providers = {
    cashfree: cashfreeProvider
};

const getProvider = (name) => {
    const provider = providers[name];
    if (!provider) throw new Error(`Unsupported payment provider: ${name}`);
    return provider;
};

module.exports = { getProvider };
