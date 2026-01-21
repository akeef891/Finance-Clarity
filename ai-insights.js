// ============================================
// AI-POWERED FINANCIAL INSIGHTS SERVICE
// Rule-based analysis system for financial insights
// ============================================

window.AIFinancialInsights = {
    /**
     * Generate affordability explanation based on user's financial data
     * @param {number} purchaseAmount - Amount user wants to purchase
     * @param {string} resultStatus - 'safe', 'risky', 'difficult', or 'cannot-afford'
     * @param {number} availableSavings - Current available savings
     * @param {number} monthlyIncome - Monthly income
     * @param {number} monthlyExpenses - Monthly expenses
     * @returns {string} Human-readable explanation
     */
    generateAffordabilityExplanation(purchaseAmount, resultStatus, availableSavings, monthlyIncome, monthlyExpenses) {
        if (!purchaseAmount || purchaseAmount <= 0) {
            return '';
        }

        const savingsRate = monthlyIncome > 0 ? ((availableSavings / monthlyIncome) * 100) : 0;
        const purchasePercentage = availableSavings > 0 ? ((purchaseAmount / availableSavings) * 100) : 0;
        const monthlySavingsRate = monthlyIncome > 0 ? (((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;

        let explanation = '';

        switch (resultStatus) {
            case 'safe':
                if (purchasePercentage < 15) {
                    explanation = `This purchase is very manageable. It's less than 15% of your available savings, leaving you with a comfortable buffer.`;
                } else if (monthlySavingsRate > 20) {
                    explanation = `This purchase fits well within your budget. Your savings rate of ${monthlySavingsRate.toFixed(1)}% shows you're managing expenses effectively.`;
                } else {
                    explanation = `This purchase is affordable based on your current savings. You'll still have ₹${(availableSavings - purchaseAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining.`;
                }
                break;

            case 'risky':
                if (purchasePercentage > 50) {
                    explanation = `This purchase uses more than half of your available savings. Consider waiting until next month or reducing other expenses.`;
                } else if (monthlySavingsRate < 10) {
                    explanation = `While technically affordable, your low savings rate (${monthlySavingsRate.toFixed(1)}%) means this purchase could impact your financial cushion.`;
                } else {
                    explanation = `This purchase is feasible but leaves less room for unexpected expenses. You'd have ₹${(availableSavings - purchaseAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining.`;
                }
                break;

            case 'difficult':
                explanation = `This purchase would use ${purchasePercentage.toFixed(1)}% of your available savings, which is quite significant. Consider breaking it into smaller payments or postponing it.`;
                break;

            case 'cannot-afford':
                if (monthlyExpenses >= monthlyIncome) {
                    explanation = `Your monthly expenses currently equal or exceed your income. Focus on reducing expenses before making this purchase.`;
                } else {
                    explanation = `You don't have enough savings for this purchase right now. Consider saving ₹${purchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} over the next few months.`;
                }
                break;

            default:
                explanation = '';
        }

        return explanation;
    },

    /**
     * Generate spending category insights
     * @param {Array} history - Transaction history
     * @param {Object} currentFlexibleSpending - Current flexible spending limits
     * @returns {Array} Array of insight strings
     */
    generateCategoryInsights(history, currentFlexibleSpending) {
        const insights = [];
        if (!history || history.length === 0) {
            return insights;
        }

        // Analyze last two months
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const thisMonthData = { food: 0, travel: 0, shopping: 0, miscellaneous: 0 };
        const lastMonthData = { food: 0, travel: 0, shopping: 0, miscellaneous: 0 };

        history.forEach(entry => {
            if (!entry.timestamp) return;
            const entryDate = new Date(entry.timestamp);
            const entryMonth = entryDate.getMonth();
            const entryYear = entryDate.getFullYear();
            const amount = entry.amount || 0;

            if (entry.type === 'expense' && entry.category) {
                const categoryLower = entry.category.toLowerCase();
                const isThisMonth = entryMonth === currentMonth && entryYear === currentYear;
                const isLastMonth = entryMonth === lastMonth && entryYear === lastMonthYear;

                if (categoryLower.includes('food')) {
                    if (isThisMonth) thisMonthData.food += amount;
                    if (isLastMonth) lastMonthData.food += amount;
                } else if (categoryLower.includes('travel')) {
                    if (isThisMonth) thisMonthData.travel += amount;
                    if (isLastMonth) lastMonthData.travel += amount;
                } else if (categoryLower.includes('shopping')) {
                    if (isThisMonth) thisMonthData.shopping += amount;
                    if (isLastMonth) lastMonthData.shopping += amount;
                } else if (categoryLower.includes('miscellaneous')) {
                    if (isThisMonth) thisMonthData.miscellaneous += amount;
                    if (isLastMonth) lastMonthData.miscellaneous += amount;
                }
            }
        });

        // Generate insights for each category
        Object.keys(thisMonthData).forEach(category => {
            const thisMonth = thisMonthData[category];
            const lastMonth = lastMonthData[category];
            const currentLimit = currentFlexibleSpending[category] || 0;

            if (lastMonth > 0 && thisMonth > 0) {
                const changePercent = ((thisMonth - lastMonth) / lastMonth) * 100;
                
                if (Math.abs(changePercent) > 15) {
                    const categoryName = category === 'food' ? 'food expenses' : 
                                       category === 'travel' ? 'travel expenses' : 
                                       category === 'shopping' ? 'shopping expenses' : 
                                       'miscellaneous expenses';
                    
                    if (changePercent > 15) {
                        insights.push(`Your ${categoryName} increased by ${Math.abs(changePercent).toFixed(0)}% compared to last month.`);
                    } else {
                        insights.push(`Your ${categoryName} decreased by ${Math.abs(changePercent).toFixed(0)}% compared to last month.`);
                    }
                }
            }

            // Compare against budget
            if (currentLimit > 0 && thisMonth > 0) {
                const budgetUtilization = (thisMonth / currentLimit) * 100;
                const categoryName = category === 'food' ? 'food' : 
                                   category === 'travel' ? 'travel' : 
                                   category === 'shopping' ? 'shopping' : 
                                   'miscellaneous';
                
                if (budgetUtilization > 90) {
                    insights.push(`You're using ${budgetUtilization.toFixed(0)}% of your ${categoryName} budget this month.`);
                } else if (budgetUtilization < 50 && thisMonth > 0) {
                    insights.push(`You're using ${budgetUtilization.toFixed(0)}% of your ${categoryName} budget, which is well within your limits.`);
                }
            }
        });

        return insights.slice(0, 3); // Return max 3 insights
    },

    /**
     * Generate monthly savings insights
     * @param {number} currentSavings - Current total savings
     * @param {number} monthlyIncome - Monthly income
     * @param {number} monthlyExpenses - Monthly expenses
     * @param {Array} history - Transaction history for trend analysis
     * @returns {string} Savings insight
     */
    generateSavingsInsight(currentSavings, monthlyIncome, monthlyExpenses, history) {
        if (!monthlyIncome || monthlyIncome <= 0) {
            return '';
        }

        const monthlySavings = monthlyIncome - monthlyExpenses;
        const savingsRate = (monthlySavings / monthlyIncome) * 100;

        let insight = '';

        // Calculate average monthly savings from history
        if (history && history.length > 0) {
            const monthlyTotals = {};
            history.forEach(entry => {
                if (!entry.timestamp) return;
                const entryDate = new Date(entry.timestamp);
                const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyTotals[monthKey]) {
                    monthlyTotals[monthKey] = { income: 0, expenses: 0 };
                }

                if (entry.type === 'income') {
                    monthlyTotals[monthKey].income += entry.amount || 0;
                } else if (entry.type === 'expense') {
                    monthlyTotals[monthKey].expenses += entry.amount || 0;
                }
            });

            const monthlySavingsValues = Object.values(monthlyTotals)
                .map(month => month.income - month.expenses)
                .filter(savings => savings > 0);

            if (monthlySavingsValues.length > 0) {
                const avgMonthlySavings = monthlySavingsValues.reduce((sum, val) => sum + val, 0) / monthlySavingsValues.length;
                insight = `You are saving approximately ₹${avgMonthlySavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month on average.`;
            }
        }

        // Fallback to current month if no history
        if (!insight && monthlySavings > 0) {
            insight = `You are saving ₹${monthlySavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month.`;
        }

        // Add savings rate context
        if (savingsRate > 0) {
            if (savingsRate > 30) {
                insight += ` Your savings rate of ${savingsRate.toFixed(1)}% is excellent.`;
            } else if (savingsRate > 20) {
                insight += ` Your savings rate of ${savingsRate.toFixed(1)}% is good.`;
            } else if (savingsRate > 10) {
                insight += ` Your savings rate of ${savingsRate.toFixed(1)}% shows steady progress.`;
            }
        }

        return insight;
    },

    /**
     * Generate income vs expenses analysis
     * @param {number} income - Total income
     * @param {number} expenses - Total expenses
     * @returns {string} Analysis insight
     */
    generateIncomeExpenseInsight(income, expenses) {
        if (!income || income <= 0) {
            return '';
        }

        const ratio = (expenses / income) * 100;
        let insight = '';

        if (ratio > 90) {
            insight = 'Your expenses are using more than 90% of your income. Consider reviewing your spending patterns.';
        } else if (ratio > 75) {
            insight = 'Your expenses account for about ' + ratio.toFixed(0) + '% of your income. You have some room to increase savings.';
        } else if (ratio < 50) {
            insight = 'Your expenses are less than 50% of your income. You have a strong financial foundation.';
        } else {
            insight = 'Your expenses account for ' + ratio.toFixed(0) + '% of your income, leaving room for savings and investments.';
        }

        return insight;
    }
};