const express=require("express");
const router=express.Router();

const {getReport}=require('../controller/reportsController');
const authenticate=require('../middleware/authentication');
const requirePremium = require('../middleware/requirePremium');


router.get("/report",authenticate,requirePremium,getReport);

module.exports=router;
