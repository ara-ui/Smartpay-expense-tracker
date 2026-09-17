requireAuth();

if (!isPremium()) {

    window.location.href = "premium-required.html";

} else {

    document.body.style.visibility = "visible";

}

const tabs = document.querySelectorAll(".tab");


const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const dateLabel = document.querySelector(".date-picker span");

const startDateInput = document.getElementById("startDateInput");
const endDateInput = document.getElementById("endDateInput");
const applyFilterBtn = document.getElementById("applyFilterBtn");
const resetFilterBtn = document.getElementById("resetFilterBtn");

const periodNavControls = document.getElementById("periodNavControls");
const customRangeControls = document.getElementById("customRangeControls");


const token = localStorage.getItem("token");

let currentView = "daily";
let currentDate = new Date();
let currentReportData = {
    expenses: [],
    totalExpense: 0,
    income: 0
};

let lastNonCustomView = "daily";
let customRangeActive = false;
let customStartDate = null;
let customEndDate = null;
let categoryChartInstance = null;
let trendChartInstance = null;



// FORMAT DATE


function formatDate(date) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function toggleFilterControls() {

    if (currentView === "custom") {

        periodNavControls.classList.add("is-hidden");
        customRangeControls.classList.remove("is-hidden");

    }

    else {

        periodNavControls.classList.remove("is-hidden");
        customRangeControls.classList.add("is-hidden");

    }

}


// TAB SWITCHING


tabs.forEach(tab => {

    tab.addEventListener("click", () => {

        customRangeActive = false;

        tabs.forEach(t => t.classList.remove("active"));

        tab.classList.add("active");

        currentView = tab.dataset.view;

        toggleFilterControls();

        if (currentView === "custom") {
  return;

        }

        lastNonCustomView = currentView;

        updateDisplay();

    });

});



// GET MONTHLY INCOME


async function getIncome() {

    try {

        const response = await axios.get(
            `${BASE_URL}/users/income`,
            {
                headers: {
                    Authorization: token
                }
            }
        );

        return response.data.monthlyIncome || 0;

    }
    catch (err) {

        console.log(err);

        return 0;

    }

}


async function updateDisplay() {

    if (currentView === "daily") {

        dateLabel.textContent = currentDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    }

    else if (currentView === "weekly") {

        const start = new Date(currentDate);

        start.setDate(currentDate.getDate() - currentDate.getDay());

        const end = new Date(start);

        end.setDate(start.getDate() + 6);

        dateLabel.textContent =
            `${start.toLocaleDateString("en-GB")} - ${end.toLocaleDateString("en-GB")}`;

    }

    else if (currentView === "monthly") {

        dateLabel.textContent = currentDate.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric"
        });

    }

    else {

        dateLabel.textContent = currentDate.getFullYear();

    }

    return getReport();

}




prevBtn.addEventListener("click", () => {

    customRangeActive = false;

    if (currentView === "daily") {

        currentDate.setDate(currentDate.getDate() - 1);

    }

    else if (currentView === "weekly") {

        currentDate.setDate(currentDate.getDate() - 7);

    }

    else if (currentView === "monthly") {

        currentDate.setMonth(currentDate.getMonth() - 1);

    }

    else {

        currentDate.setFullYear(currentDate.getFullYear() - 1);

    }

    updateDisplay();

});


nextBtn.addEventListener("click", () => {

    customRangeActive = false;

    if (currentView === "daily") {

        currentDate.setDate(currentDate.getDate() + 1);

    }

    else if (currentView === "weekly") {

        currentDate.setDate(currentDate.getDate() + 7);

    }

    else if (currentView === "monthly") {

        currentDate.setMonth(currentDate.getMonth() + 1);

    }

    else {

        currentDate.setFullYear(currentDate.getFullYear() + 1);

    }

    updateDisplay();

});


applyFilterBtn.addEventListener("click", () => {

    const startValue = startDateInput.value;
    const endValue = endDateInput.value;

    if (!startValue || !endValue) {

        alert("Please select both a start date and an end date.");
        return;

    }

    if (new Date(startValue) > new Date(endValue)) {

        alert("Start date cannot be after end date.");
        return;

    }

    customRangeActive = true;
    customStartDate = startValue;
    customEndDate = endValue;

    dateLabel.textContent =
        `${new Date(startValue).toLocaleDateString("en-GB")} - ${new Date(endValue).toLocaleDateString("en-GB")}`;

    getReport();

});

resetFilterBtn.addEventListener("click", () => {

    customRangeActive = false;
    customStartDate = null;
    customEndDate = null;

    startDateInput.value = "";
    endDateInput.value = "";

    currentView = lastNonCustomView;

    tabs.forEach(t => {

        if (t.dataset.view === lastNonCustomView) {

            t.classList.add("active");

        }

        else {

            t.classList.remove("active");

        }

    });

    toggleFilterControls();

    updateDisplay();

});




async function getReport() {

    const tbody = document.getElementById("reportBody");

    let queryString;

    if (customRangeActive) {

        queryString = `startDate=${customStartDate}&endDate=${customEndDate}`;

    }

    else {

        let date;

        if (currentView === "daily") {

            date = formatDate(currentDate);

        }

        else if (currentView === "weekly") {

            const start = new Date(currentDate);

            start.setDate(currentDate.getDate() - currentDate.getDay());

            date = formatDate(start);

        }

        else if (currentView === "monthly") {

            const year = currentDate.getFullYear();

            const month = String(currentDate.getMonth() + 1).padStart(2, "0");

            date = `${year}-${month}-01`;

        }

        else {

            date = `${currentDate.getFullYear()}-01-01`;

        }

        queryString = `type=${currentView}&date=${date}`;

    }

    try {

        const response = await axios.get(
            `${BASE_URL}/expense/report?${queryString}`,
            {
                headers: {
                    Authorization: token
                }
            }
        );

        const income = await getIncome();

        document.getElementById("income").textContent =
            `₹${income}`;

        tbody.innerHTML = "";

        const expenses = response.data.expenses;
        const totalExpense = response.data.totalExpense;


        currentReportData = {
        expenses: expenses,
        totalExpense: totalExpense,
        income: income
        };

        document.getElementById("expense").textContent =
            `₹${totalExpense}`;

        document.getElementById("saving").textContent =
            `₹${income - totalExpense}`;

        
        updateStatistics(expenses, totalExpense);
        updateCategoryChart(expenses);
        updateTrendChart(expenses);

        if (expenses.length === 0) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="report-empty-cell">
                        No expenses found.
                    </td>
                </tr>
            `;

            return;

        }

        expenses.forEach(expense => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    ${new Date(expense.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short"
                    })}
                </td>

                <td>${expense.description}</td>

                <td>${expense.category}</td>

                <td>₹${expense.amount}</td>
            `;

            tbody.appendChild(row);

        });

        console.log(response.data);

    }

    catch (err) {

        console.log(err);

    }

}


toggleFilterControls();

// "Download Again" from Account > Report Download History links here with
// the original report's parameters instead of a stored file, so the exact
// same report is regenerated from live data and then downloaded again.
(function applyRedownloadFromAccount() {
    const query = new URLSearchParams(window.location.search);
    const redownloadFormat = query.get("redownload");
    if (!redownloadFormat) {
        updateDisplay();
        return;
    }

    const type = query.get("type");
    if (type === "custom") {
        customRangeActive = true;
        customStartDate = query.get("startDate");
        customEndDate = query.get("endDate");
        startDateInput.value = customStartDate || "";
        endDateInput.value = customEndDate || "";
        currentView = "custom";
        tabs.forEach((t) => t.classList.remove("active"));
        toggleFilterControls();
    } else if (type) {
        currentView = type;
        lastNonCustomView = type;
        const dateParam = query.get("date");
        if (dateParam) currentDate = new Date(dateParam);
        tabs.forEach((t) => t.classList.toggle("active", t.dataset.view === type));
    }

    updateDisplay().then(() => {
        if (redownloadFormat === "pdf") exportPDF();
        else exportCSV();
        // Clean the URL so refreshing the page doesn't re-trigger a download.
        window.history.replaceState({}, "", "reports.html");
    });
})();



function updateStatistics(expenses, totalExpense) {

    const count = expenses.length;

    const average = count > 0 ? totalExpense / count : 0;

    const highest = count > 0
        ? Math.max(...expenses.map(exp => Number(exp.amount)))
        : 0;

    document.getElementById("statTotalExpenses").textContent =
        `₹${totalExpense}`;

    document.getElementById("statTransactionCount").textContent =
        count;

    document.getElementById("statAverageExpense").textContent =
        `₹${average.toFixed(2)}`;

    document.getElementById("statHighestExpense").textContent =
        `₹${highest}`;

}


function getCategoryTotals(expenses) {

    const totals = {};

    expenses.forEach(expense => {

        const category = expense.category || "Uncategorized";

        totals[category] = (totals[category] || 0) + Number(expense.amount);

    });

    return totals;

}

function getDailyTotals(expenses) {

    const totals = {};

    expenses.forEach(expense => {

         const key = formatDate(new Date(expense.createdAt));

        totals[key] = (totals[key] || 0) + Number(expense.amount);

    });

    const sortedKeys = Object.keys(totals).sort();

    const labels = sortedKeys.map(key =>
        new Date(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    );

    const values = sortedKeys.map(key => totals[key]);

    return { labels, values };

}


function updateCategoryChart(expenses) {

    const canvas = document.getElementById("categoryBarChart");
    const emptyMessage = document.getElementById("categoryChartEmpty");

    if (categoryChartInstance) {

        categoryChartInstance.destroy();
        categoryChartInstance = null;

    }

    if (expenses.length === 0) {

        canvas.classList.add("is-hidden");
        emptyMessage.classList.remove("is-hidden");
        return;

    }

    canvas.classList.remove("is-hidden");
    emptyMessage.classList.add("is-hidden");

    const totals = getCategoryTotals(expenses);

    categoryChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: Object.keys(totals),
            datasets: [{
                label: "Spending by Category",
                data: Object.values(totals),
                backgroundColor: "#2563eb",
                borderRadius: 4,
                categoryPercentage: 0.5,
                barPercentage: 0.6,
                maxBarThickness: 24
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

}

function updateTrendChart(expenses) {

    const canvas = document.getElementById("trendLineChart");
    const emptyMessage = document.getElementById("trendChartEmpty");

    if (trendChartInstance) {

        trendChartInstance.destroy();
        trendChartInstance = null;

    }

    if (expenses.length === 0) {

        canvas.classList.add("is-hidden");
        emptyMessage.classList.remove("is-hidden");
        return;

    }

    canvas.classList.remove("is-hidden");
    emptyMessage.classList.add("is-hidden");

    const { labels, values } = getDailyTotals(expenses);

    trendChartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Expense Trend",
                data: values,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37,99,235,0.1)",
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

}


const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");

exportPdfBtn.addEventListener("click", exportPDF);
exportCsvBtn.addEventListener("click", exportCSV);



function getReportPeriodLabel() {

    if (customRangeActive) {

        return `${customStartDate} to ${customEndDate}`;

    }

    if (currentView === "daily") {

        return currentDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    }

    if (currentView === "weekly") {

        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() - currentDate.getDay());

        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        return `${start.toLocaleDateString("en-GB")} - ${end.toLocaleDateString("en-GB")}`;

    }

    if (currentView === "monthly") {

        return currentDate.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric"
        });

    }

    return currentDate.getFullYear().toString();
}


// Builds a meaningful, deterministic, filesystem-safe filename based on the
// selected reporting period (never "report.pdf"/"download.pdf").
function buildReportFilename(format) {

    const monthYear = (date) => date.toLocaleDateString("en-US", { month: "long", year: "numeric" }).replace(" ", "-");

    if (customRangeActive) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        const fmt = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).replace(/,/g, "").replace(/ /g, "-");
        return `Expense-Report-${fmt(start)}-to-${fmt(end)}.${format}`;
    }

    if (currentView === "daily") {
        const d = currentDate.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }).replace(/,/g, "").replace(/ /g, "-");
        return `Expense-Report-${d}.${format}`;
    }

    if (currentView === "weekly") {
        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() - currentDate.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const fmt = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).replace(/,/g, "").replace(/ /g, "-");
        return `Expense-Report-Week-${fmt(start)}-to-${fmt(end)}.${format}`;
    }

    if (currentView === "monthly") {
        return `Expense-Report-${monthYear(currentDate)}.${format}`;
    }

    return `Expense-Report-${currentDate.getFullYear()}.${format}`;
}

// Records a successful download in Report Download History (Account page).
// Called only after the file has actually been handed to the browser to
// save - never merely because the report page was viewed. Failures here
// never block or roll back the download itself.
async function recordReportDownload(format) {
    try {
        let dateParam = null;
        if (!customRangeActive) {
            if (currentView === "daily") dateParam = formatDate(currentDate);
            else if (currentView === "weekly") {
                const start = new Date(currentDate);
                start.setDate(currentDate.getDate() - currentDate.getDay());
                dateParam = formatDate(start);
            } else if (currentView === "monthly") {
                dateParam = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;
            } else {
                dateParam = `${currentDate.getFullYear()}-01-01`;
            }
        }

        await axios.post(
            `${BASE_URL}/expense/report-history`,
            {
                reportType: customRangeActive ? "custom" : currentView,
                periodLabel: getReportPeriodLabel(),
                filename: buildReportFilename(format),
                format,
                params: customRangeActive
                    ? { date: null, startDate: customStartDate, endDate: customEndDate }
                    : { date: dateParam, startDate: null, endDate: null }
            },
            { headers: { Authorization: token } }
        );
    } catch (err) {
        // Non-critical: the download itself already succeeded.
        console.log("Could not record report download history:", err.message);
    }
}

let isExporting = false;

function exportCSV() {

    if (isExporting) return;

    const expenses = currentReportData.expenses;

    if (!expenses || expenses.length === 0) {

        alert("There are no expenses to export for the selected period.");
        return;

    }

    // Lock the CSV export immediately so double-clicks cannot trigger
    // duplicate downloads/history records.
    isExporting = true;
    exportCsvBtn.disabled = true;

    try {

    const totalExpense = currentReportData.totalExpense;
    const income = currentReportData.income;

    const count = expenses.length;

    const average =
        count > 0
            ? totalExpense / count
            : 0;

    const highest =
        count > 0
            ? Math.max(...expenses.map(exp => Number(exp.amount)))
            : 0;


  
    const rows = [];


    // Report information

    rows.push(["EXPENSE REPORT"]);
    rows.push(["Report Type", currentView]);
    rows.push(["Period", getReportPeriodLabel()]);
    rows.push([]);


    // Summary

    rows.push(["SUMMARY"]);
    rows.push(["Total Spent", totalExpense]);
    rows.push(["Transactions", count]);
    rows.push(["Average Expense", average.toFixed(2)]);
    rows.push(["Highest Expense", highest]);
    rows.push(["Income", income]);
    rows.push(["Savings", income - totalExpense]);
    rows.push([]);


    // Category analytics

    rows.push(["SPENDING BY CATEGORY"]);
    rows.push(["Category", "Amount"]);

    const categoryTotals = getCategoryTotals(expenses);

    Object.entries(categoryTotals).forEach(([category, amount]) => {

        rows.push([
            category,
            amount
        ]);

    });

    rows.push([]);


    // Expense trend

    rows.push(["EXPENSE TREND"]);
    rows.push(["Date", "Amount"]);

    const trendData = getDailyTotals(expenses);

    trendData.labels.forEach((label, index) => {

        rows.push([
            label,
            trendData.values[index]
        ]);

    });

    rows.push([]);


    // Transactions

    rows.push(["TRANSACTIONS"]);

    rows.push([
        "Date",
        "Description",
        "Category",
        "Amount"
    ]);


    expenses.forEach(expense => {

        rows.push([
            new Date(expense.createdAt).toLocaleDateString("en-GB"),
            expense.description,
            expense.category,
            expense.amount
        ]);

    });


  
    const csvContent = rows
        .map(row =>
            row.map(value => {

                const text = String(value ?? "");

                return `"${text.replace(/"/g, '""')}"`;

            }).join(",")
        )
        .join("\n");


    
    const blob = new Blob(
        ["\uFEFF" + csvContent],
        {
            type: "text/csv;charset=utf-8;"
        }
    );


    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = buildReportFilename("csv");

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    recordReportDownload("csv").finally(() => {
        isExporting = false;
        exportCsvBtn.disabled = false;
    });

    } catch (err) {
        console.log("CSV export failed:", err);
        isExporting = false;
        exportCsvBtn.disabled = false;
        alert("Could not create the CSV report. Please try again.");
    }

}


function exportPDF() {

    if (isExporting) return;

    const expenses = currentReportData.expenses;

    if (!expenses || expenses.length === 0) {

        alert("There are no expenses to export for the selected period.");
        return;

    }

    isExporting = true;
    exportPdfBtn.disabled = true;


    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();


    const totalExpense = currentReportData.totalExpense;

    const income = currentReportData.income;

    const count = expenses.length;

    const average =
        count > 0
            ? totalExpense / count
            : 0;

    const highest =
        count > 0
            ? Math.max(...expenses.map(exp => Number(exp.amount)))
            : 0;


   
    doc.setFontSize(20);

    doc.setFont("helvetica", "bold");

    doc.text(
        "Expense Report",
        14,
        20
    );


    doc.setFontSize(11);

    doc.setFont("helvetica", "normal");

    doc.text(
        `Report Type: ${currentView}`,
        14,
        30
    );

    doc.text(
        `Period: ${getReportPeriodLabel()}`,
        14,
        37
    );


   
    doc.setFontSize(14);

    doc.setFont("helvetica", "bold");

    doc.text(
        "Summary",
        14,
        50
    );


    doc.autoTable({

        startY: 55,

        head: [
            [
                "Metric",
                "Value"
            ]
        ],

        body: [
            [
                "Total Spent",
                `INR ${totalExpense}`
            ],
            [
                "Transactions",
                count
            ],
            [
                "Average Expense",
                `INR ${average.toFixed(2)}`
            ],
            [
                "Highest Expense",
                `INR ${highest}`
            ],
            [
                "Income",
                `INR ${income}`
            ],
            [
                "Savings",
                `INR ${income - totalExpense}`
            ]
        ],

        theme: "grid",

        headStyles: {
            fillColor: [37, 99, 235]
        }

    });


   
    let nextY =
        doc.lastAutoTable.finalY + 15;


    doc.setFontSize(14);

    doc.setFont("helvetica", "bold");

    doc.text(
        "Spending by Category",
        14,
        nextY
    );


    const categoryTotals =
        getCategoryTotals(expenses);


    doc.autoTable({

        startY: nextY + 5,

        head: [
            [
                "Category",
                "Amount"
            ]
        ],

        body:
            Object.entries(categoryTotals)
                .map(([category, amount]) => [
                    category,
                    `INR ${amount}`
                ]),

        theme: "grid",

        headStyles: {
            fillColor: [37, 99, 235]
        }

    });

    nextY =
        doc.lastAutoTable.finalY + 15;



nextY = doc.lastAutoTable.finalY + 15;

doc.setFontSize(14);
doc.setFont("helvetica", "bold");

doc.text(
    "Expense Trend",
    14,
    nextY
);

const trendCanvas = document.getElementById("trendLineChart");

if (trendCanvas && trendCanvas.style.display !== "none") {

    
    if (nextY + 90 > 270) {
        doc.addPage();
        nextY = 20;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");

        doc.text(
            "Expense Trend",
            14,
            nextY
        );
    }

    const trendImage = trendCanvas.toDataURL("image/png", 1.0);

    doc.addImage(
        trendImage,
        "PNG",
        14,
        nextY + 5,
        180,
        70
    );

    nextY += 85;
} else {
    nextY += 10;
}


    const trendData =
        getDailyTotals(expenses);


    doc.autoTable({

        startY: nextY + 5,

        head: [
            [
                "Date",
                "Amount"
            ]
        ],

        body:
            trendData.labels.map((label, index) => [
                label,
                `INR ${trendData.values[index]}`
            ]),

        theme: "grid",

        headStyles: {
            fillColor: [37, 99, 235]
        }

    });


  
    nextY =
        doc.lastAutoTable.finalY + 15;


    doc.setFontSize(14);

    doc.setFont("helvetica", "bold");

    doc.text(
        "Transactions",
        14,
        nextY
    );


    const transactionRows =
        expenses.map(expense => [

            new Date(expense.createdAt)
                .toLocaleDateString("en-GB"),

            expense.description,

            expense.category,

            `INR ${expense.amount}`

        ]);


    doc.autoTable({

        startY: nextY + 5,

        head: [
            [
                "Date",
                "Description",
                "Category",
                "Amount"
            ]
        ],

        body: transactionRows,

        theme: "striped",

        headStyles: {
            fillColor: [37, 99, 235]
        },

        styles: {
            fontSize: 9
        },

        columnStyles: {

            0: {
                cellWidth: 30
            },

            1: {
                cellWidth: 70
            },

            2: {
                cellWidth: 35
            },

            3: {
                cellWidth: 35
            }

        }

    });


  
    const pageCount =
        doc.internal.getNumberOfPages();


    for (
        let page = 1;
        page <= pageCount;
        page++
    ) {

        doc.setPage(page);

        doc.setFontSize(9);

        doc.setFont("helvetica", "normal");

        doc.text(
            `Page ${page} of ${pageCount}`,
            190,
            287,
            {
                align: "right"
            }
        );

    }


const pdfBlob = doc.output("blob");

const pdfUrl = URL.createObjectURL(pdfBlob);

const downloadLink = document.createElement("a");

downloadLink.href = pdfUrl;
downloadLink.download = buildReportFilename("pdf");

document.body.appendChild(downloadLink);

downloadLink.click();

document.body.removeChild(downloadLink);

setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
}, 1000);

recordReportDownload("pdf").finally(() => {
    isExporting = false;
    exportPdfBtn.disabled = false;
});

}