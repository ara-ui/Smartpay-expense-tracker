
const express=require('express');
const router=express.Router();

const {createUser,loginUser,updatedincome,getincome,downloadExpenses,getQuickStats,getMembership}=require('../controller/userController');

const authenticate = require('../middleware/authentication');
const requirePremium = require('../middleware/requirePremium');
const { authLimiter } = require('../middleware/rateLimiter');
router.post('/',authLimiter,createUser);
router.post('/login',authLimiter,loginUser);

router.get("/download",authenticate,requirePremium,downloadExpenses);




router.get("/stats",authenticate,getQuickStats);

router.get("/membership",authenticate,getMembership);

module.exports=router;

