// ============================================
// CHARTS MANAGEMENT - Chart.js Integration
// ============================================

const ChartManager = {
    charts: {
        incomeExpense: null,
        expensePie: null,
        savingsLine: null,
        savingsBar: null
    },

    // Chart.js dark theme configuration
    darkTheme: {
        backgroundColor: '#1e2a3a',
        borderColor: '#2a3441',
        textColor: '#b8c5d1',
        gridColor: '#2a3441',
        pointColor: '#00d4ff'
    },

    // Check if Chart.js is available
    isChartJsAvailable() {
        return typeof Chart !== 'undefined' && typeof Chart === 'function';
    },

    // Initialize all charts
    initCharts() {
        if (!this.isChartJsAvailable()) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('Chart.js not loaded, charts will not initialize');
            }
            return;
        }
        
        try {
            this.initIncomeExpenseChart();
            this.initExpensePieChart();
            this.initSavingsLineChart();
            this.initSavingsBarChart();
            this.setupResizeHandlers();
        } catch (e) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('Chart initialization error:', e.message);
            }
        }
    },

    // Setup resize handlers for responsive charts
    setupResizeHandlers() {
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.updateAllCharts();
            }, 250); // Debounce resize
        };

        window.addEventListener('resize', handleResize);
        
        // Also handle orientation change on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateAllCharts();
            }, 500);
        });
    },

    // Update all charts with current data
    updateAllCharts() {
        if (!this.isChartJsAvailable()) {
            return;
        }
        try {
            if (!window.DataManager) return;
            this.updateIncomeExpenseChart();
            this.updateExpensePieChart();
            this.updateSavingsLineChart();
            this.updateSavingsBarChart();
        } catch (e) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('Chart update error:', e.message);
            }
        }
    },

    // Income vs Expenses Bar Chart (Improved Visualization)
    initIncomeExpenseChart() {
        if (!this.isChartJsAvailable()) return;
        const ctx = document.getElementById('incomeExpenseChart');
        if (!ctx) return;

        try {
            this.charts.incomeExpense = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Income',
                    data: [],
                    backgroundColor: 'rgba(46, 213, 115, 0.8)',
                    borderColor: '#2ed573',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }, {
                    label: 'Expenses',
                    data: [],
                    backgroundColor: 'rgba(255, 71, 87, 0.8)',
                    borderColor: '#ff4757',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: '#b8c5d1',
                            font: {
                                size: 13,
                                weight: '600'
                            },
                            padding: 18,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e2a3a',
                        titleColor: '#ffffff',
                        bodyColor: '#b8c5d1',
                        borderColor: '#2a3441',
                        borderWidth: 1,
                        padding: 14,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed && context.parsed.y != null ? context.parsed.y : 0;
                                const sign = context.dataset && context.dataset.label === 'Expenses' ? '−' : '+';
                                return `${(context.dataset && context.dataset.label) || ''}: ${sign}₹${Math.abs(Number(value)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            },
                            footer: function(tooltipItems) {
                                if (tooltipItems && tooltipItems.length === 2) {
                                    const income = (tooltipItems[0].parsed && tooltipItems[0].parsed.y != null) ? tooltipItems[0].parsed.y : 0;
                                    const expenses = (tooltipItems[1].parsed && tooltipItems[1].parsed.y != null) ? tooltipItems[1].parsed.y : 0;
                                    const net = income - expenses;
                                    return `Net: ${net >= 0 ? '+' : ''}₹${Number(net).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: false,
                        ticks: {
                            color: '#b8c5d1',
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: '#2a3441',
                            display: false
                        }
                    },
                    y: {
                        stacked: false,
                        beginAtZero: true,
                        ticks: {
                            color: '#b8c5d1',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        },
                        grid: {
                            color: '#2a3441',
                            lineWidth: 1
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
        } catch (e) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('Income expense chart initialization error:', e.message);
            }
        }
    },

    updateIncomeExpenseChart() {
        if (!this.charts.incomeExpense || !window.DataManager) return;
        try {
            const rawHistory = DataManager.getHistory ? DataManager.getHistory() : [];
            const history = Array.isArray(rawHistory) ? rawHistory : [];
        const incomeHistory = [];
        const expenseHistory = [];
        const labels = [];

        // Group by month from history
        const monthlyData = {};
        history.forEach(entry => {
            if (!entry.timestamp) return;
            const date = new Date(entry.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { income: 0, expenses: 0 };
            }

            const type = entry.type || '';
            if (type.includes('income')) {
                monthlyData[monthKey].income += entry.amount || 0;
            } else if (type.includes('expense')) {
                monthlyData[monthKey].expenses += entry.amount || 0;
            }
        });

        // Get current month data
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[currentMonthKey]) {
            monthlyData[currentMonthKey] = { income: 0, expenses: 0 };
        }
            monthlyData[currentMonthKey].income = DataManager.getTotalIncome ? DataManager.getTotalIncome() : 0;
            monthlyData[currentMonthKey].expenses = (DataManager.getTotalFixedExpenses ? DataManager.getTotalFixedExpenses() : 0) + (DataManager.getTotalFlexibleSpending ? DataManager.getTotalFlexibleSpending() : 0);

        // Sort by month and get last 6 months
        const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
        
        sortedMonths.forEach(monthKey => {
            const [year, month] = monthKey.split('-');
            const date = new Date(year, parseInt(month) - 1);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            incomeHistory.push(monthlyData[monthKey].income);
            expenseHistory.push(monthlyData[monthKey].expenses);
        });

            this.charts.incomeExpense.data.labels = labels.length > 0 ? labels : ['Current Month'];
            this.charts.incomeExpense.data.datasets[0].data = incomeHistory.length > 0 ? incomeHistory : [0];
            this.charts.incomeExpense.data.datasets[1].data = expenseHistory.length > 0 ? expenseHistory : [0];
            this.charts.incomeExpense.update('active');
        } catch (e) {
            console.warn('Income expense chart update error:', e.message);
        }
    },

    // Expense Breakdown Pie Chart
    initExpensePieChart() {
        if (!this.isChartJsAvailable()) return;
        const ctx = document.getElementById('expensePieChart');
        if (!ctx) return;

        try {
            this.charts.expensePie = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(0, 212, 255, 0.8)',
                        'rgba(255, 107, 53, 0.8)',
                        'rgba(46, 213, 115, 0.8)',
                        'rgba(165, 94, 234, 0.8)',
                        'rgba(255, 71, 87, 0.8)',
                        'rgba(83, 82, 237, 0.8)'
                    ],
                    borderColor: [
                        '#00d4ff',
                        '#ff6b35',
                        '#2ed573',
                        '#a55eea',
                        '#ff4757',
                        '#5352ed'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1200,
                    easing: 'easeOutCubic'
                },
                animations: {
                    colors: {
                        duration: 1200
                    },
                    x: {
                        duration: 1200,
                        easing: 'easeOutCubic'
                    },
                    y: {
                        duration: 1200,
                        easing: 'easeOutCubic'
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#b8c5d1',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e2a3a',
                        titleColor: '#ffffff',
                        bodyColor: '#b8c5d1',
                        borderColor: '#2a3441',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed != null ? context.parsed : 0;
                                const dataArr = context.dataset && context.dataset.data;
                                const total = Array.isArray(dataArr) ? dataArr.reduce((a, b) => a + (Number(b) || 0), 0) : 0;
                                const percentage = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0;
                                return `${label}: ₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        } catch (e) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('Expense pie chart initialization error:', e.message);
            }
        }
    },

    updateExpensePieChart() {
        if (!this.charts.expensePie || !window.DataManager) return;
        try {
            const rawFixed = DataManager.getFixedExpenses ? DataManager.getFixedExpenses() : [];
            const fixedExpenses = Array.isArray(rawFixed) ? rawFixed : [];
            const rawFlex = DataManager.getFlexibleSpending ? DataManager.getFlexibleSpending() : null;
            const flexibleSpending = (rawFlex && typeof rawFlex === 'object') ? rawFlex : { food: 0, travel: 0, shopping: 0, miscellaneous: 0 };
        const categories = [];
        const amounts = [];

        // Fixed expenses
        fixedExpenses.forEach(expense => {
            if (expense && (expense.name != null || expense.amount != null)) {
                categories.push(expense.name || '');
                amounts.push(Number(expense.amount) || 0);
            }
        });

        // Flexible spending categories
        if (flexibleSpending.food > 0) {
            categories.push('Food & Dining');
            amounts.push(flexibleSpending.food);
        }
        if (flexibleSpending.travel > 0) {
            categories.push('Travel & Transport');
            amounts.push(flexibleSpending.travel);
        }
        if (flexibleSpending.shopping > 0) {
            categories.push('Shopping');
            amounts.push(flexibleSpending.shopping);
        }
        if (flexibleSpending.miscellaneous > 0) {
            categories.push('Miscellaneous');
            amounts.push(flexibleSpending.miscellaneous);
        }

            // Color mapping to avoid clashes - assign colors based on category name
            const colorMap = {
                'rgba(0, 212, 255, 0.8)': '#00d4ff',
                'rgba(255, 107, 53, 0.8)': '#ff6b35',
                'rgba(46, 213, 115, 0.8)': '#2ed573',
                'rgba(165, 94, 234, 0.8)': '#a55eea',
                'rgba(255, 71, 87, 0.8)': '#ff4757',
                'rgba(83, 82, 237, 0.8)': '#5352ed',
                'rgba(255, 193, 7, 0.8)': '#ffc107'  // New color for Miscellaneous
            };
            
            const baseColors = [
                'rgba(0, 212, 255, 0.8)',
                'rgba(255, 107, 53, 0.8)',
                'rgba(46, 213, 115, 0.8)',
                'rgba(165, 94, 234, 0.8)',
                'rgba(255, 71, 87, 0.8)',
                'rgba(83, 82, 237, 0.8)',
                'rgba(255, 193, 7, 0.8)'  // Yellow/amber for Miscellaneous
            ];
            
            const baseBorderColors = [
                '#00d4ff',
                '#ff6b35',
                '#2ed573',
                '#a55eea',
                '#ff4757',
                '#5352ed',
                '#ffc107'  // Yellow/amber border for Miscellaneous
            ];
            
            // Assign colors dynamically - use different color for Miscellaneous
            const backgroundColor = [];
            const borderColor = [];
            
            categories.forEach((cat, index) => {
                if (cat.toLowerCase() === 'miscellaneous') {
                    backgroundColor.push('rgba(255, 193, 7, 0.8)');
                    borderColor.push('#ffc107');
                } else if (cat.toLowerCase().includes('rent')) {
                    backgroundColor.push('rgba(0, 212, 255, 0.8)');
                    borderColor.push('#00d4ff');
                } else {
                    backgroundColor.push(baseColors[index % baseColors.length]);
                    borderColor.push(baseBorderColors[index % baseBorderColors.length]);
                }
            });

            this.charts.expensePie.data.labels = categories.length > 0 ? categories : ['No Expenses'];
            this.charts.expensePie.data.datasets[0].data = amounts.length > 0 ? amounts : [1];
            this.charts.expensePie.data.datasets[0].backgroundColor = backgroundColor.length > 0 ? backgroundColor : baseColors;
            this.charts.expensePie.data.datasets[0].borderColor = borderColor.length > 0 ? borderColor : baseBorderColors;
            this.charts.expensePie.update('active');
        } catch (e) {
            console.warn('Expense pie chart update error:', e.message);
        }
    },

    // Savings Trend Line Chart
    initSavingsLineChart() {
        if (!this.isChartJsAvailable()) return;
        const ctx = document.getElementById('savingsLineChart');
        if (!ctx) return;

        try {
            this.charts.savingsLine = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Savings',
                    data: [],
                    borderColor: '#2ed573',
                    backgroundColor: 'rgba(46, 213, 115, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#2ed573',
                    pointBorderColor: '#1e2a3a',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1200,
                    easing: 'easeOutCubic'
                },
                animations: {
                    colors: {
                        duration: 1200
                    },
                    x: {
                        duration: 1200,
                        easing: 'easeOutCubic'
                    },
                    y: {
                        duration: 1200,
                        easing: 'easeOutCubic'
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e2a3a',
                        titleColor: '#ffffff',
                        bodyColor: '#b8c5d1',
                        borderColor: '#2a3441',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const y = context.parsed && context.parsed.y != null ? context.parsed.y : 0;
                                return `Savings: ₹${Number(y).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#b8c5d1',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: '#2a3441'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#b8c5d1',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '₹' + (Number(value) || 0).toLocaleString('en-IN');
                            }
                        },
                        grid: {
                            color: '#2a3441'
                        }
                    }
                }
            }
        });
        } catch (e) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('Savings line chart initialization error:', e.message);
            }
        }
    },

    updateSavingsLineChart() {
        if (!this.charts.savingsLine || !window.DataManager) return;
        try {
            const rawHistory = DataManager.getHistory ? DataManager.getHistory() : [];
            const history = Array.isArray(rawHistory) ? rawHistory : [];
            const now = new Date();
            
            // Find first activity date (user sign-in date) from history
            let firstActivityDate = null;
            if (history.length > 0) {
                const dates = history
                    .map(item => {
                        if (!item.timestamp) return null;
                        const d = new Date(item.timestamp);
                        return isNaN(d.getTime()) ? null : d;
                    })
                    .filter(d => d !== null)
                    .sort((a, b) => a - b);
                
                if (dates.length > 0) {
                    firstActivityDate = dates[0];
                }
            }
            
            // If no history, use current date as start
            if (!firstActivityDate) {
                firstActivityDate = new Date(now);
                firstActivityDate.setDate(firstActivityDate.getDate() - 7); // Default to 7 days ago
            }
            
            // Calculate daily savings from first activity to today
            const dailySavingsMap = {};
            const startDate = new Date(firstActivityDate);
            const endDate = new Date(now);
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const maxDays = Math.min(daysDiff, 90); // Limit to 90 days for performance
            
            // Process each day from first activity to today
            for (let i = 0; i <= maxDays; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                
                // Calculate savings for this day from history
                let dayIncome = 0;
                let dayExpenses = 0;
                
                history.forEach(item => {
                    if (!item.timestamp) return;
                    const itemDate = new Date(item.timestamp);
                    if (isNaN(itemDate.getTime())) return;
                    
                    const itemDateKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
                    
                    if (itemDateKey === dateKey) {
                        if (item.type === 'income' || (item.type && item.type.includes('income'))) {
                            dayIncome += parseFloat(item.amount) || 0;
                        } else if (item.type === 'expense' || (item.type && item.type.includes('expense'))) {
                            dayExpenses += parseFloat(item.amount) || 0;
                        }
                    }
                });
                
                dailySavingsMap[dateKey] = dayIncome - dayExpenses;
            }
            
            // If no history data, use current snapshot for today
            if (history.length === 0 || Object.keys(dailySavingsMap).length === 0) {
                const income = DataManager.getTotalIncome ? DataManager.getTotalIncome() : 0;
                const fixedExpenses = DataManager.getTotalFixedExpenses ? DataManager.getTotalFixedExpenses() : 0;
                const flexibleSpending = DataManager.getTotalFlexibleSpending ? DataManager.getTotalFlexibleSpending() : 0;
                const currentSavings = income - fixedExpenses - flexibleSpending;

                const today = new Date();
                const todayLabel = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                this.charts.savingsLine.data.labels = [todayLabel];
                this.charts.savingsLine.data.datasets[0].data = [currentSavings];
                this.charts.savingsLine.update('active');
                return;
            }

            // Get current total savings calculation
            const income = DataManager.getTotalIncome ? DataManager.getTotalIncome() : 0;
            const fixedExpenses = DataManager.getTotalFixedExpenses ? DataManager.getTotalFixedExpenses() : 0;
            const flexibleSpending = DataManager.getTotalFlexibleSpending ? DataManager.getTotalFlexibleSpending() : 0;
            const currentSavings = income - fixedExpenses - flexibleSpending;

            // Build cumulative savings trend from history
            const sortedDates = Object.keys(dailySavingsMap).sort();
            const labels = [];
            const data = [];
            
            if (sortedDates.length > 0) {
                // Calculate cumulative savings starting from first date
                let cumulativeSavings = 0;
                
                sortedDates.forEach(dateKey => {
                    const [year, month, day] = dateKey.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                    
                    // Add daily savings change to cumulative total
                    cumulativeSavings += dailySavingsMap[dateKey];
                    data.push(Math.max(0, cumulativeSavings));
                });
                
                // Adjust last value to match current calculated savings
                if (data.length > 0 && Math.abs(data[data.length - 1] - currentSavings) > 1) {
                    const adjustment = currentSavings - data[data.length - 1];
                    data[data.length - 1] = currentSavings;
                }
            }

            // If no data points, use current savings
            if (data.length === 0 || labels.length === 0) {
                const today = new Date();
                const todayLabel = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                this.charts.savingsLine.data.labels = [todayLabel];
                this.charts.savingsLine.data.datasets[0].data = [Math.max(0, currentSavings)];
            } else {
                this.charts.savingsLine.data.labels = labels;
                this.charts.savingsLine.data.datasets[0].data = data;
            }
            
            this.charts.savingsLine.update("active");
        } catch (e) {
            console.warn('Savings line chart update error:', e.message);
        }
    },
    
    // Monthly Savings Comparison Bar Chart
    initSavingsBarChart() {
        if (!this.isChartJsAvailable()) return;
        const ctx = document.getElementById('savingsBarChart');
        if (!ctx) return;

        try {
            this.charts.savingsBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Monthly Savings',
                    data: [],
                    backgroundColor: 'rgba(46, 213, 115, 0.6)',
                    borderColor: '#2ed573',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1200,
                    easing: 'easeOutCubic'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e2a3a',
                        titleColor: '#ffffff',
                        bodyColor: '#b8c5d1',
                        borderColor: '#2a3441',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const y = context.parsed && context.parsed.y != null ? context.parsed.y : 0;
                                return `Savings: ₹${Number(y).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#b8c5d1',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: '#2a3441',
                            display: false
                        }
                    },
                    y: {
                        ticks: {
                            color: '#b8c5d1',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '₹' + (Number(value) || 0).toLocaleString('en-IN');
                            }
                        },
                        grid: {
                            color: '#2a3441'
                        }
                    }
                }
            }
        });
        } catch (e) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('Savings bar chart initialization error:', e.message);
            }
        }
    },

    updateSavingsBarChart() {
        if (!this.charts.savingsBar || !window.DataManager) return;
        try {
            const rawHistory = DataManager.getHistory ? DataManager.getHistory() : [];
            const history = Array.isArray(rawHistory) ? rawHistory : [];
            const now = new Date();
            
            // Calculate monthly savings from income and expenses history
            const monthlySavings = {};
            
            // Process history to calculate monthly savings
            history.forEach(item => {
                if (!item.timestamp) return;
                const date = new Date(item.timestamp);
                if (isNaN(date.getTime())) return;
                
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlySavings[monthKey]) {
                    monthlySavings[monthKey] = { income: 0, expenses: 0 };
                }
                
                if (item.type === 'income' || (item.type && item.type.includes('income'))) {
                    monthlySavings[monthKey].income += parseFloat(item.amount) || 0;
                } else if (item.type === 'expense' || (item.type && item.type.includes('expense'))) {
                    monthlySavings[monthKey].expenses += parseFloat(item.amount) || 0;
                }
            });
            
            // Add current month with current totals
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlySavings[currentMonthKey]) {
                monthlySavings[currentMonthKey] = { income: 0, expenses: 0 };
            }
            
            // Use current calculated values for current month
            const currentIncome = DataManager.getTotalIncome ? DataManager.getTotalIncome() : 0;
            const currentFixedExpenses = DataManager.getTotalFixedExpenses ? DataManager.getTotalFixedExpenses() : 0;
            const currentFlexibleSpending = DataManager.getTotalFlexibleSpending ? DataManager.getTotalFlexibleSpending() : 0;
            monthlySavings[currentMonthKey].income = currentIncome;
            monthlySavings[currentMonthKey].expenses = currentFixedExpenses + currentFlexibleSpending;
            
            // Calculate savings for each month
            const monthlySavingsData = {};
            Object.keys(monthlySavings).forEach(monthKey => {
                monthlySavingsData[monthKey] = monthlySavings[monthKey].income - monthlySavings[monthKey].expenses;
            });

            // Get last 6 months dynamically
            const sortedMonths = Object.keys(monthlySavingsData).sort().slice(-6);
            const labels = sortedMonths.map(monthKey => {
                const [year, month] = monthKey.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            });
            const savings = sortedMonths.map(monthKey => monthlySavingsData[monthKey]);

            this.charts.savingsBar.data.labels = labels.length > 0 ? labels : [now.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })];
            this.charts.savingsBar.data.datasets[0].data = savings.length > 0 ? savings : [DataManager.calculateSavings ? DataManager.calculateSavings() : 0];
            this.charts.savingsBar.update('active');
        } catch (e) {
            console.warn('Savings bar chart update error:', e.message);
        }
    },

    // Old method - kept for reference
    _old_initSpendingBarChart() {
        const ctx = document.getElementById('spendingBarChart');
        if (!ctx) return;

        this.charts.spendingBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Fixed Expenses', 'Food & Dining', 'Travel & Transport', 'Shopping', 'Miscellaneous'],
                datasets: [{
                    label: 'Spending',
                    data: [],
                    backgroundColor: [
                        'rgba(255, 107, 53, 0.8)',
                        'rgba(0, 212, 255, 0.8)',
                        'rgba(46, 213, 115, 0.8)',
                        'rgba(165, 94, 234, 0.8)',
                        'rgba(83, 82, 237, 0.8)'
                    ],
                    borderColor: [
                        '#ff6b35',
                        '#00d4ff',
                        '#2ed573',
                        '#a55eea',
                        '#5352ed'
                    ],
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1200,
                    easing: 'easeOutCubic'
                },
                animations: {
                    colors: {
                        duration: 1200
                    },
                    x: {
                        duration: 1200,
                        easing: 'easeOutCubic'
                    },
                    y: {
                        duration: 1200,
                        easing: 'easeOutCubic'
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e2a3a',
                        titleColor: '#ffffff',
                        bodyColor: '#b8c5d1',
                        borderColor: '#2a3441',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const y = context.parsed && context.parsed.y != null ? context.parsed.y : 0;
                                return `Amount: ₹${Number(y).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#b8c5d1',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: '#2a3441',
                            display: false
                        }
                    },
                    y: {
                        ticks: {
                            color: '#b8c5d1',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        },
                        grid: {
                            color: '#2a3441'
                        }
                    }
                }
            }
        });
    },

    // Removed - not needed
    _old_updateSpendingBarChart() {
        if (!this.charts.spendingBar) return;

        const fixedExpenses = DataManager.getTotalFixedExpenses();
        const flexibleSpending = DataManager.getFlexibleSpending();

        this.charts.spendingBar.data.datasets[0].data = [
            fixedExpenses,
            flexibleSpending.food || 0,
            flexibleSpending.travel || 0,
            flexibleSpending.shopping || 0,
            flexibleSpending.miscellaneous || 0
        ];
        this.charts.spendingBar.update('active');
    }
};

// Initialize charts when DOM is ready (single initialization)
let chartsInitialized = false;
function initChartsWhenReady() {
    if (chartsInitialized) return;
    
    // Check if canvas elements exist
    const hasCanvas = document.getElementById('incomeExpenseChart') || 
                      document.getElementById('expensePieChart') ||
                      document.getElementById('savingsLineChart') ||
                      document.getElementById('savingsBarChart');
    
    if (!hasCanvas) {
        // Canvas not ready yet, try again later
        setTimeout(initChartsWhenReady, 200);
        return;
    }
    
    chartsInitialized = true;
    ChartManager.initCharts();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initChartsWhenReady, 300);
    });
} else {
    setTimeout(initChartsWhenReady, 300);
}

// Single auth state change listener for charts
if (typeof AuthManager !== 'undefined' && AuthManager.onAuthStateChange) {
    AuthManager.onAuthStateChange(() => {
        setTimeout(() => {
            if (chartsInitialized) {
                ChartManager.updateAllCharts();
            }
        }, 400);
    });
}

// ===== FINAL GLOBAL EXPORTS (CRITICAL) =====
window.ChartManager = ChartManager;