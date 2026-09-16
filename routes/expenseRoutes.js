const express=require('express');
const router=express.Router();

const {
    addExpense,
    getExpenses,
    deleteExpense
}=require('../controller/expenseController');

const authenticate=require('../middleware/authentication');



router.post('/addexpense',authenticate,addExpense);

router.get('/getexpenses',authenticate,getExpenses);

router.delete('/deleteexpense/:id',authenticate,deleteExpense);

module.exports=router;