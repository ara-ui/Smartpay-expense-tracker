

function showPagination(data){

    const pagination = document.getElementById("pagination");

    pagination.innerHTML = "";

    function createButton(page, active = false){

        const button = document.createElement("button");

        button.innerText = page;

        button.className = active ? "page-btn active" : "page-btn";

        button.addEventListener("click", () => getExpenses(page));

        pagination.appendChild(button);

    }

    function createDots(){

        const span = document.createElement("span");

        span.innerText = "...";

        span.style.padding = "8px";

        pagination.appendChild(span);

    }

    const current = data.currentPage;

    const last = data.lastPage;

    // First page
    createButton(1, current === 1);

    // Left dots
    if(current > 4){
        createDots();
    }

    // Middle pages
    const start = Math.max(2, current - 2);
    const end = Math.min(last - 1, current + 2);

    for(let i = start; i <= end; i++){

        createButton(i, i === current);

    }

    // Right dots
    if(current < last - 3){
        createDots();
    }

    // Last page
    if(last > 1){

        createButton(last, current === last);

    }

}