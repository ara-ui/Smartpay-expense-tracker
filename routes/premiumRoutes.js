const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/authentication");
const requirePremium = require('../middleware/requirePremium');

const {getLeaderBoard} = require("../controller/premiumController");

router.get("/leaderboard",authenticate,requirePremium,getLeaderBoard);

module.exports = router;