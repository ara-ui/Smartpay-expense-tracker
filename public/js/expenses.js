let currentPage = Number(localStorage.getItem("currentPage")) || 1;

let limit = Number(localStorage.getItem("limit")) || 10;

// Add Expense

async function addExpense(e){

    e.preventDefault();

    //show processing in submit button
    const addBtn = form.querySelector('button[type="submit"]');

    addBtn.disabled = true;
    addBtn.textContent = "Processing...";
    addBtn.classList.add("processing");
    //show loading
    document.getElementById("loading").style.display = "block";

    const amountInput = document.getElementById("amount");
    const descriptionInput = document.getElementById("description");

    const numericAmount = Number(amountInput.value);
    const description = descriptionInput.value.trim();

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        addBtn.disabled = false;
        addBtn.textContent = "Add Expense";
        addBtn.classList.remove("processing");
        document.getElementById("loading").style.display = "none";
        alert("Please enter a valid expense amount greater than 0.");
        amountInput.focus();
        return;
    }

    if (!description) {
        addBtn.disabled = false;
        addBtn.textContent = "Add Expense";
        addBtn.classList.remove("processing");
        document.getElementById("loading").style.display = "none";
        alert("Please enter an expense description.");
        descriptionInput.focus();
        return;
    }

    const expense = {
        amount: numericAmount,
        description
    };

    try{
        const token=localStorage.getItem("token");
        const response = await axios.post(
            `${BASE_URL}/expense/addexpense`,

            expense,
            {
                headers:{
                    Authorization:token
                }
            }

        );
        //hide loading
         document.getElementById("loading").style.display = "none";

         addBtn.disabled = false;
        addBtn.textContent = "Add Expense";
        addBtn.classList.remove("processing");

        form.reset();

        getExpenses(currentPage);

    }

    catch(err){
         // HIDE LOADING EVEN IF THERE IS AN ERROR
        document.getElementById("loading").style.display = "none";
        
        addBtn.disabled = false;
        addBtn.textContent = "Add Expense";
        addBtn.classList.remove("processing");

        console.log(err);

        if (err.response?.status === 409 && err.response?.data?.code === "BUDGET_EXCEEDED") {
            const budget = err.response.data.budget;
            const periodLabel = budget?.period
                ? budget.period.charAt(0).toUpperCase() + budget.period.slice(1)
                : "Budget";
            const categoryLabel = budget?.category ? ` (${budget.category})` : "";
            const remaining = Number(budget?.remainingPaise || 0) / 100;
            alert(
                `${periodLabel}${categoryLabel} budget exceeded. ` +
                `Remaining: ₹${remaining.toFixed(2)}`
            );
        } else if (err.response?.data?.message) {
            alert(err.response.data.message);
        }

    }

}

// Get Expenses

async function getExpenses(page = currentPage){

    try{
        currentPage=page;

        localStorage.setItem("currentPage",currentPage);
        const token = localStorage.getItem("token");

        const response = await axios.get(

            `${BASE_URL}/expense/getexpenses?page=${page}&limit=${limit}`,
             {
                headers:{
                    Authorization:token
                }
            }

        );
        renderExpenses(response.data);
    }

    catch(err){

        console.log(err);

    }

}
function renderExpenses(data){

    expenseList.innerHTML = "";

    data.expenses.forEach((expense, index) => {
        showExpense(expense, index, data.totalExpenses);
    });

    showPagination(data);
}


// Show Expense in ui
function showExpense(expense, index, totalExpenses){

    const row = document.createElement("tr");

    const serialNumber =
    totalExpenses - ((currentPage - 1) * limit + index);

    row.innerHTML = `

        <td>${serialNumber}</td>

        <td>
            ${new Date(expense.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric"
            })}
        </td>

        <td>${expense.description}</td>

        <td>${expense.category}</td>

        <td>₹${expense.amount}</td>

        <td>
            <button class="delete-btn"
                onclick="deleteExpense('${expense._id}',this)">
                Delete Expense
            </button>
        </td>

    `;

    expenseList.appendChild(row);
}


// Delete Expense

async function deleteExpense(id, button){

    try{
        const token = localStorage.getItem("token");

        await axios.delete(

            `${BASE_URL}/expense/deleteexpense/${id}`,
            {
    headers:{
        Authorization:token
        }
    }

        );

        button.closest("tr").remove();
        
        // Check if the current page became empty
        const expenseCount = document.querySelectorAll("#expenseList tr").length;

        if(expenseCount === 0 && currentPage > 1){

            currentPage--;

            localStorage.setItem("currentPage", currentPage);

        }

        // Reload expenses and pagination
        getExpenses(currentPage);

    }

    catch(err){

        console.log(err);

    }

}



async function downloadExpenses() {

    try {

        const token = localStorage.getItem("token");

        const response = await axios.get(
            `${BASE_URL}/users/download`,
            {
                headers: {
                    Authorization: token
                },
                responseType: "blob"
            }
        );

        const blobUrl = window.URL.createObjectURL(
            new Blob([response.data], { type: "application/json" })
        );

        const linkDiv = document.getElementById("downloadLink");

        linkDiv.style.display="block";

        linkDiv.innerHTML = `
        <div class="download-success">

            <span>✅ Report Generated Successfully</span>

            <a href="${blobUrl}" download="expenses.json">
                Download Report
            </a>

        </div>
        `;

    }

    catch (err) {

    console.log(err);

    if (err.response) {
        alert(err.response.data.message);
    } else {
        alert(err.message);
    }
}

}