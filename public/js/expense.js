

// Load all expenses

window.addEventListener("DOMContentLoaded", ()=>{
    document.getElementById("rowsPerPage").value = limit;

    getExpenses(currentPage);
    showPremiumFeatures();
    
});


// Submit Form

form.addEventListener("submit", addExpense);


//rows per page

document.getElementById("rowsPerPage").addEventListener("change", function(){

    limit = Number(this.value);

    localStorage.setItem("limit", limit);

    currentPage = 1;

    localStorage.setItem("currentPage", currentPage);

    getExpenses(currentPage);

});