const express=require("express");
const router=express.Router();

const {getReport, recordReportDownload, getReportDownloadHistory}=require('../controller/reportsController');
const authenticate=require('../middleware/authentication');
const requirePremium = require('../middleware/requirePremium');


router.get("/report",authenticate,requirePremium,getReport);
router.post("/report-history",authenticate,requirePremium,recordReportDownload);
router.get("/report-history",authenticate,requirePremium,getReportDownloadHistory);

module.exports=router;
