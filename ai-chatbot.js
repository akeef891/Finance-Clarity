// ============================================
// AI CHATBOT SERVICE - Financial Assistant
// Level 7: Proactive Financial Intelligence
// Level 6: Voice, Multilingual, Memory, Smart Alerts
// Level 5: Hybrid AI (Local Logic + LLM Integration)
// Rule-based intelligent responses using user's financial data
// 
// LLM Configuration (Level 5):
// To enable LLM integration, set window.AIConfig before initialization:
//   window.AIConfig = { endpoint: '/api/ai' };
// The endpoint should be a secure backend proxy that handles API keys.
// If not configured, the system gracefully falls back to local logic.
//
// Level 6 Features:
// - Voice Input/Output: Web Speech API (auto-fallback to text)
// - Multilingual: English, Hindi, Tamil (auto-detect)
// - User Memory: Persisted preferences and goals (localStorage)
// - Smart Alerts: Background financial health monitoring
//
// Level 7 Features:
// - Financial Health Score: 0-100 score with status labels
// - Predictive Insights: End-of-month predictions and warnings
// - Actionable Advice: Specific, numeric suggestions
// - Smart Triggering: Proactive insights when relevant
//
// Level 8 Features:
// - Goal-Based Financial Planning: Create, track, and manage savings goals
// - AI Goal Planning: Realistic goal analysis and step-by-step plans
// - Goal Progress Tracking: Automatic progress updates
// - Smart Goal Warnings: Proactive encouragement and alerts
//
// Level 9 Features:
// - What-If Simulation Engine: Simulate financial scenarios without persisting data
// - AI Risk Detection: Detect overspending, goal infeasibility, declining savings
// - Personalized Financial Advice: Actionable advice based on user's financial data
// - Contextual Memory: Maintain last 3-5 interactions for contextual replies
// - Safety & Trust: AI never modifies user data, always explains reasoning
// ============================================

window.AIChatbot = {
    chatHistory: [],
    isProcessing: false,
    rateLimitCount: 0,
    rateLimitReset: Date.now(),
    aiProviderEnabled: false, // Level 5: LLM integration flag
    aiProviderEndpoint: null, // Level 5: Backend proxy endpoint (set via config)
    
    // Level 6: Voice & Multilingual
    recognition: null, // Web Speech API recognition
    synthesis: null, // SpeechSynthesis API
    isListening: false,
    currentLanguage: 'en-IN', // Default: English (India)
    supportedLanguages: ['en-IN', 'hi-IN', 'ta-IN'], // English, Hindi, Tamil
    
    // Level 6: User Memory
    userAIMemory: {
        languagePreference: 'en-IN',
        responseStyle: 'friendly', // friendly, formal, concise
        savingsGoal: null,
        riskTolerance: 'moderate', // conservative, moderate, aggressive
        voiceEnabled: false,
        lastAlertCheck: null
    },

    // Level 8: Financial Goals
    financialGoals: [], // Array of goal objects

    // Level 9: Contextual Memory (in-memory only, no persistence)
    recentInteractions: [], // Last 3-5 interactions for context
    maxInteractionMemory: 5, // Maximum interactions to remember

    /**
     * Initialize chatbot (Level 9 Enhanced)
     */
    init() {
        this.chatHistory = [];
        this.isProcessing = false;
        this.conversationContext = {
            lastTopic: null,
            mentionedCategories: [],
            mentionedAmounts: [],
            lastAnalysis: null
        };
        
        // Level 9: Initialize contextual memory
        this.recentInteractions = [];
        
        // Level 5: Check for AI provider configuration
        if (window.AIConfig && window.AIConfig.endpoint) {
            this.aiProviderEndpoint = window.AIConfig.endpoint;
            this.aiProviderEnabled = true;
        }
        
        // Level 6: Initialize voice recognition (if available)
        this.initVoiceRecognition();
        
        // Level 6: Initialize speech synthesis
        this.initSpeechSynthesis();
        
        // Level 6: Load user memory
        this.loadUserMemory();
        
        // Level 6: Initialize smart alerts
        this.initSmartAlerts();
        
        // Level 6: Initialize response generator registry
        this.initResponseGenerators();
        
        // Level 8: Load financial goals
        this.loadFinancialGoals();
    },

    /**
     * Build AI context for LLM consumption (Level 6 Enhanced)
     * @param {Object} userFinanceData - User's financial data
     * @returns {Object} Formatted context for LLM
     */
    buildAIContext(userFinanceData) {
        if (!userFinanceData) return null;

        try {
            const { income, expenses, savings, fixedExpenses, flexibleSpending, 
                    incomeSources, fixedExpenseList, flexibleData, monthlyData, 
                    financialHealth, expenseRatio, savingsRate, topExpenses, 
                    trends, overspending, userMemory, activeAlerts } = userFinanceData;

            // Calculate health score (0-100)
            let healthScore = 50; // Default moderate
            if (expenses > income) {
                healthScore = 20; // Risk
            } else if (income > 0) {
                const rate = parseFloat(savingsRate || 0);
                if (rate > 20) healthScore = 90;
                else if (rate > 10) healthScore = 70;
                else if (rate > 5) healthScore = 50;
                else healthScore = 30;
            }

            // Format top categories
            const topCategories = (topExpenses || []).slice(0, 5).map(exp => ({
                name: exp.name,
                amount: exp.amount,
                percentage: exp.percentage || 0
            }));

            // Format flags
            const flags = {
                overspending: expenses > income,
                lowSavings: parseFloat(savingsRate || 0) < 10,
                highExpenseRatio: parseFloat(expenseRatio || 0) > 80,
                increasingTrend: trends && trends.expenseTrend === 'increasing'
            };

            return {
                income: income || 0,
                expenses: expenses || 0,
                savings: savings || 0,
                savingsRate: parseFloat(savingsRate || 0),
                expenseRatio: parseFloat(expenseRatio || 0),
                healthScore: healthScore,
                healthStatus: financialHealth || 'Moderate',
                topCategories: topCategories,
                flags: flags,
                currency: 'INR',
                month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
                // Level 6: User memory and alerts
                userMemory: userMemory || this.userAIMemory,
                activeAlerts: activeAlerts || this.getActiveAlerts(),
                language: this.currentLanguage
            };
        } catch (e) {
            console.warn('Failed to build AI context:', e);
            return null;
        }
    },

    /**
     * Call AI provider via secure proxy (Level 5)
     * @param {string} message - User message
     * @param {Object} context - AI context
     * @param {string} responseType - 'chat' or 'report'
     * @returns {Promise<string|null>} AI response or null if failed
     */
    async callAIProvider(message, context, responseType = 'chat') {
        if (!this.aiProviderEnabled || !this.aiProviderEndpoint) {
            return null; // Gracefully fall back to local logic
        }

        try {
            const response = await fetch(this.aiProviderEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    context: context,
                    type: responseType,
                    conversationHistory: this.chatHistory.slice(-6) // Last 6 messages for context
                }),
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (!response.ok) {
                throw new Error(`AI provider returned ${response.status}`);
            }

            const data = await response.json();
            
            // Validate response
            if (data && data.response && typeof data.response === 'string') {
                // Apply safety filters
                return this.applyAISafetyFilters(data.response);
            }

            return null;
        } catch (e) {
            // Silently fail - fall back to local logic
            if (e.name !== 'AbortError') {
                console.warn('AI provider call failed (falling back to local):', e.message);
            }
            return null;
        }
    },

    /**
     * Apply safety filters to AI responses (Level 5)
     * @param {string} response - AI-generated response
     * @returns {string} Filtered response
     */
    applyAISafetyFilters(response) {
        if (!response || typeof response !== 'string') return '';

        let filtered = response;

        // Remove investment advice keywords
        const investmentKeywords = ['invest in', 'buy stock', 'purchase shares', 'trading', 'crypto', 'bitcoin'];
        investmentKeywords.forEach(keyword => {
            if (filtered.toLowerCase().includes(keyword)) {
                filtered = filtered.replace(new RegExp(keyword, 'gi'), '[investment advice removed]');
            }
        });

        // Ensure soft language (replace absolute commands)
        filtered = filtered.replace(/you must/g, 'you may consider');
        filtered = filtered.replace(/you should definitely/g, 'you might consider');
        filtered = filtered.replace(/guaranteed/g, 'potentially');
        filtered = filtered.replace(/will definitely/g, 'may');

        // Limit response length (prevent excessive output)
        if (filtered.length > 2000) {
            filtered = filtered.substring(0, 2000) + '...';
        }

        return filtered.trim();
    },

    /**
     * Generate AI response using hybrid approach (Level 5)
     * @param {string} message - User message
     * @param {Object} context - Financial context
     * @returns {Promise<string>} AI response
     */
    async generateAIResponse(message, context) {
        // Step 1: Try local logic first (fast, reliable)
        const localResponse = this.generateResponse(message, context);
        
        // Step 2: Determine if question is complex enough for LLM
        const isComplexQuestion = this.isComplexQuestion(message);
        
        if (!isComplexQuestion) {
            return localResponse; // Use local response for simple questions
        }

        // Step 3: Build AI context
        const enhancedContext = this.buildFinancialContext(context);
        const aiContext = this.buildAIContext(enhancedContext);
        
        if (!aiContext) {
            return localResponse; // Fall back if context building fails
        }

        // Step 4: Try LLM (with timeout and fallback)
        try {
            const aiResponse = await this.callAIProvider(message, aiContext, 'chat');
            
            if (aiResponse && aiResponse.length > 50) {
                // Merge AI response with financial data
                return this.mergeAIResponseWithData(aiResponse, enhancedContext);
            }
        } catch (e) {
            // Silently fall back
            console.warn('AI response generation failed, using local:', e.message);
        }

        // Step 5: Fall back to local response
        return localResponse;
    },

    /**
     * Check if question is complex enough for LLM (Level 5)
     * @param {string} message - User message
     * @returns {boolean} True if complex
     */
    isComplexQuestion(message) {
        if (!message || typeof message !== 'string') return false;

        const q = message.toLowerCase();
        
        // Complex question indicators
        const complexPatterns = [
            'explain', 'why', 'how does', 'what if', 'compare',
            'analyze', 'evaluate', 'recommend', 'suggest',
            'tell me about', 'help me understand', 'what do you think',
            'monthly report', 'monthly summary', 'generate report',
            'comprehensive', 'detailed analysis'
        ];

        // Check for complex patterns
        const hasComplexPattern = complexPatterns.some(pattern => q.includes(pattern));
        
        // Check for long questions (likely complex)
        const isLongQuestion = message.length > 50;
        
        // Check for multiple topics
        const hasMultipleTopics = (q.match(/\band\b/g) || []).length > 1;

        // Monthly reports should use LLM for enhanced generation
        const isReportRequest = q.includes('report') || q.includes('summary');

        return hasComplexPattern || (isLongQuestion && hasMultipleTopics) || isReportRequest;
    },

    /**
     * Merge AI response with financial data (Level 5)
     * @param {string} aiResponse - LLM-generated response
     * @param {Object} context - Financial context
     * @returns {string} Merged response
     */
    mergeAIResponseWithData(aiResponse, context) {
        if (!aiResponse || !context) return aiResponse;

        try {
            // Ensure specific financial data is included
            const { income, expenses, savings, savingsRate } = context;
            
            // If AI response doesn't mention specific amounts, add them
            if (income > 0 && !aiResponse.includes('₹')) {
                const dataNote = `\n\nBased on your data: You have ₹${income.toLocaleString('en-IN')} income, ₹${expenses.toLocaleString('en-IN')} expenses, and ₹${savings.toLocaleString('en-IN')} savings (${parseFloat(savingsRate || 0).toFixed(1)}% savings rate).`;
                return aiResponse + dataNote;
            }

            return aiResponse;
        } catch (e) {
            console.warn('Response merging failed:', e);
            return aiResponse; // Return original if merging fails
        }
    },

    /**
     * Get user's financial context for AI analysis
     * @returns {Object} Structured financial data
     */
    getUserFinancialContext() {
        if (!window.DataManager) {
            return null;
        }

        try {
            const income = DataManager.getTotalIncome ? DataManager.getTotalIncome() : 0;
            const expenses = DataManager.getTotalExpenses ? DataManager.getTotalExpenses() : 0;
            const savings = income - expenses;
            const fixedExpenses = DataManager.getTotalFixedExpenses ? DataManager.getTotalFixedExpenses() : 0;
            const flexibleSpending = DataManager.getTotalFlexibleSpending ? DataManager.getTotalFlexibleSpending() : 0;
            const history = DataManager.getHistory ? DataManager.getHistory() : [];
            const incomeSources = DataManager.getIncome ? DataManager.getIncome() : [];
            const fixedExpenseList = DataManager.getFixedExpenses ? DataManager.getFixedExpenses() : [];
            const flexibleData = DataManager.getFlexibleSpending ? DataManager.getFlexibleSpending() : {};

            // Calculate monthly averages from history
            const monthlyData = {};
            history.forEach(entry => {
                if (!entry.timestamp) return;
                const entryDate = new Date(entry.timestamp);
                const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { income: 0, expenses: 0 };
                }

                if (entry.type === 'income') {
                    monthlyData[monthKey].income += entry.amount || 0;
                } else if (entry.type === 'expense') {
                    monthlyData[monthKey].expenses += entry.amount || 0;
                }
            });

            return {
                income,
                expenses,
                savings,
                fixedExpenses,
                flexibleSpending,
                incomeSources,
                fixedExpenseList,
                flexibleData,
                history,
                monthlyData
            };
        } catch (e) {
            console.warn('Failed to get financial context:', e);
            return null;
        }
    },

    /**
     * Check rate limiting (prevent spam)
     * @returns {boolean} True if allowed
     */
    checkRateLimit() {
        const now = Date.now();
        if (now > this.rateLimitReset) {
            this.rateLimitCount = 0;
            this.rateLimitReset = now + 60000; // Reset every minute
        }

        if (this.rateLimitCount >= 10) {
            return false; // Max 10 messages per minute
        }

        this.rateLimitCount++;
        return true;
    },

    /**
     * Process user message and generate AI response (Level 5 Hybrid)
     * @param {string} userMessage - User's question
     * @returns {Promise<string>} AI response
     */
    async processMessage(userMessage) {
        if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
            return 'Please ask me a question about your finances.';
        }

        if (this.isProcessing) {
            return 'I\'m still processing your previous message. Please wait a moment.';
        }

        if (!this.checkRateLimit()) {
            return 'You\'re sending messages too quickly. Please wait a moment before asking another question.';
        }

        this.isProcessing = true;

        try {
            const context = this.getUserFinancialContext();
            if (!context) {
                return 'I need access to your financial data to help you. Please make sure you\'re logged in and have added some financial information.';
            }

            // Level 6: Detect language and update context
            const detectedLang = this.detectLanguage(userMessage);
            if (detectedLang !== this.currentLanguage) {
                this.currentLanguage = detectedLang;
                this.userAIMemory.languagePreference = detectedLang;
                this.saveUserMemory();
            }

            // Level 6: Enhance context with memory and alerts
            const enhancedContext = this.enhanceContextWithMemory(context);
            
            // Level 9: Add contextual memory from recent interactions
            enhancedContext.recentInteractions = this.getRecentInteractions();

            // Level 5: Use hybrid AI response engine
            let response;
            try {
                response = await this.generateAIResponse(userMessage.trim(), enhancedContext);
            } catch (e) {
                // Fall back to local logic if hybrid fails
                console.warn('Hybrid AI failed, using local:', e.message);
                response = this.generateResponse(userMessage.trim(), enhancedContext);
            }
            
            // Level 9: Store interaction in contextual memory
            this.addToRecentInteractions(userMessage.trim(), response);
            
            // Level 6: Translate response to user's language
            if (this.currentLanguage !== 'en-IN') {
                response = this.translateResponse(response, this.currentLanguage);
            }
            
            // Apply safe response framework
            response = this.applySafeResponseFramework(response);
            
            // Level 6: Speak response if voice enabled
            if (this.userAIMemory.voiceEnabled && this.synthesis) {
                setTimeout(() => {
                    this.speakResponse(response, this.currentLanguage);
                }, 100);
            }
            
            // Add to chat history
            this.chatHistory.push({
                role: 'user',
                message: userMessage.trim(),
                timestamp: Date.now()
            });
            this.chatHistory.push({
                role: 'assistant',
                message: response,
                timestamp: Date.now()
            });

            // Keep history manageable (last 20 messages)
            if (this.chatHistory.length > 20) {
                this.chatHistory = this.chatHistory.slice(-20);
            }

            return response;
        } catch (e) {
            console.warn('Chatbot error:', e);
            return 'I encountered an error processing your question. Please try rephrasing it or ask again in a moment.';
        } finally {
            this.isProcessing = false;
        }
    },

    /**
     * Analyze trends from monthly data
     * @param {Object} monthlyData - Monthly financial data
     * @returns {Object} Trend analysis
     */
    analyzeTrends(monthlyData) {
        const months = Object.keys(monthlyData).sort();
        if (months.length < 2) {
            return { hasTrend: false };
        }

        const recentMonths = months.slice(-3);
        const olderMonths = months.slice(0, -3);

        const recentAvgExpenses = recentMonths.reduce((sum, m) => sum + (monthlyData[m].expenses || 0), 0) / recentMonths.length;
        const olderAvgExpenses = olderMonths.length > 0 
            ? olderMonths.reduce((sum, m) => sum + (monthlyData[m].expenses || 0), 0) / olderMonths.length
            : recentAvgExpenses;

        const recentAvgIncome = recentMonths.reduce((sum, m) => sum + (monthlyData[m].income || 0), 0) / recentMonths.length;
        const olderAvgIncome = olderMonths.length > 0
            ? olderMonths.reduce((sum, m) => sum + (monthlyData[m].income || 0), 0) / olderMonths.length
            : recentAvgIncome;

        const expenseChange = olderAvgExpenses > 0 ? ((recentAvgExpenses - olderAvgExpenses) / olderAvgExpenses) * 100 : 0;
        const incomeChange = olderAvgIncome > 0 ? ((recentAvgIncome - olderAvgIncome) / olderAvgIncome) * 100 : 0;

        return {
            hasTrend: true,
            expenseTrend: expenseChange > 5 ? 'increasing' : expenseChange < -5 ? 'decreasing' : 'stable',
            incomeTrend: incomeChange > 5 ? 'increasing' : incomeChange < -5 ? 'decreasing' : 'stable',
            expenseChangePercent: Math.abs(expenseChange).toFixed(1),
            incomeChangePercent: Math.abs(incomeChange).toFixed(1)
        };
    },

    /**
     * Identify overspending categories
     * @param {Object} context - Financial context
     * @returns {Array} Overspending insights
     */
    identifyOverspending(context) {
        const { income, fixedExpenses, flexibleSpending, fixedExpenseList, flexibleData } = context;
        const insights = [];

        if (income === 0) return insights;

        // Check if total expenses exceed income
        const totalExpenses = fixedExpenses + flexibleSpending;
        if (totalExpenses > income) {
            insights.push({
                type: 'overall',
                message: `Your total expenses (₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceed your income (₹${income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`
            });
        }

        // Check fixed expenses ratio
        const fixedRatio = (fixedExpenses / income) * 100;
        if (fixedRatio > 60) {
            const topFixed = fixedExpenseList.length > 0 
                ? fixedExpenseList.reduce((max, e) => e.amount > max.amount ? e : max, fixedExpenseList[0])
                : null;
            if (topFixed) {
                insights.push({
                    type: 'fixed',
                    category: topFixed.name,
                    message: `Your fixed expenses are ${fixedRatio.toFixed(1)}% of income. ${topFixed.name} is your largest fixed expense at ₹${topFixed.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
                });
            }
        }

        // Check flexible spending categories
        const flexibleRatio = (flexibleSpending / income) * 100;
        if (flexibleRatio > 40) {
            const topFlexible = Object.entries(flexibleData)
                .filter(([_, amount]) => amount > 0)
                .sort(([_, a], [__, b]) => b - a)[0];
            
            if (topFlexible) {
                const [category, amount] = topFlexible;
                const categoryName = category === 'food' ? 'Food & Dining' : 
                                   category === 'travel' ? 'Travel & Transport' : 
                                   category === 'shopping' ? 'Shopping' : 'Miscellaneous';
                insights.push({
                    type: 'flexible',
                    category: categoryName,
                    message: `Your flexible spending is ${flexibleRatio.toFixed(1)}% of income. ${categoryName} is your highest category at ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
                });
            }
        }

        return insights;
    },

    /**
     * Detect user intent from question (Level 3 Intelligence)
     * @param {string} question - User's question
     * @param {Object} convContext - Conversation context
     * @returns {Object} Intent object with type and confidence
     */
    detectIntent(question, convContext = {}) {
        if (!question || typeof question !== 'string') {
            return { type: 'GENERAL_ADVICE', confidence: 0.5 };
        }

        try {
            const q = question.toLowerCase();
            let intent = { type: 'GENERAL_ADVICE', confidence: 0.5 };

            // SAVE_MORE intent
            if ((q.includes('save more') || q.includes('increase savings') || q.includes('improve savings') || 
                 q.includes('how can i save') || q.includes('ways to save')) && 
                (q.includes('how') || q.includes('what') || q.includes('suggest'))) {
                intent = { type: 'SAVE_MORE', confidence: 0.9 };
            }

            // CUT_EXPENSES intent
            else if ((q.includes('reduce') || q.includes('cut') || q.includes('lower') || q.includes('decrease')) && 
                     (q.includes('expense') || q.includes('spending') || q.includes('cost'))) {
                intent = { type: 'CUT_EXPENSES', confidence: 0.85 };
            }

            // HIGHEST_EXPENSE intent
            else if ((q.includes('highest') || q.includes('largest') || q.includes('biggest') || q.includes('top')) && 
                     (q.includes('expense') || q.includes('spending') || q.includes('category'))) {
                intent = { type: 'HIGHEST_EXPENSE', confidence: 0.9 };
            }

            // CATEGORY_ANALYSIS intent
            else if (q.includes('category') || q.includes('spending by') || q.includes('breakdown') || 
                     (q.includes('how much') && (q.includes('food') || q.includes('travel') || q.includes('shopping')))) {
                intent = { type: 'CATEGORY_ANALYSIS', confidence: 0.85 };
            }

            // MONTHLY_SUMMARY intent
            else if (q.includes('monthly report') || q.includes('monthly summary') || q.includes('give me my report') ||
                     q.includes('generate report') || q.includes('month overview')) {
                intent = { type: 'MONTHLY_SUMMARY', confidence: 0.95 };
            }

            // SAVINGS_ADVICE intent
            else if ((q.includes('saving') || q.includes('save')) && 
                     (q.includes('how much') || q.includes('amount') || q.includes('rate'))) {
                intent = { type: 'SAVINGS_ADVICE', confidence: 0.85 };
            }

            // EXPENSE_ANALYSIS intent
            else if ((q.includes('expense') || q.includes('spending')) && 
                     (q.includes('analyze') || q.includes('where') || q.includes('breakdown'))) {
                intent = { type: 'EXPENSE_ANALYSIS', confidence: 0.8 };
            }

            // BUDGET_OPTIMIZATION intent
            else if ((q.includes('budget') || q.includes('optimize') || q.includes('improve')) && 
                     (q.includes('how') || q.includes('suggest'))) {
                intent = { type: 'BUDGET_OPTIMIZATION', confidence: 0.8 };
            }

            // TREND_ANALYSIS intent
            else if (q.includes('trend') || q.includes('compare') || q.includes('change') || 
                     (q.includes('this month') && (q.includes('last month') || q.includes('previous')))) {
                intent = { type: 'TREND_ANALYSIS', confidence: 0.85 };
            }

            // OVERSpending check
            else if (q.includes('overspend') || q.includes('where am i') || 
                     (q.includes('am i') && (q.includes('spending too much') || q.includes('over budget')))) {
                intent = { type: 'OVERSpending_CHECK', confidence: 0.9 };
            }

            // SAVINGS_ANALYSIS intent (Level 4)
            else if ((q.includes('saving') || q.includes('save')) && 
                     (q.includes('analysis') || q.includes('analyze') || q.includes('breakdown') || 
                      q.includes('how am i doing') || q.includes('savings health'))) {
                intent = { type: 'SAVINGS_ANALYSIS', confidence: 0.88 };
            }

            // SPENDING_RISK intent (Level 4)
            else if ((q.includes('risk') || q.includes('risky') || q.includes('safe') || q.includes('danger')) && 
                     (q.includes('spending') || q.includes('expense') || q.includes('budget'))) {
                intent = { type: 'SPENDING_RISK', confidence: 0.87 };
            }

            // BUDGET_HEALTH intent (Level 4)
            else if ((q.includes('budget') || q.includes('financial health') || q.includes('how am i')) && 
                     (q.includes('health') || q.includes('status') || q.includes('doing') || q.includes('good'))) {
                intent = { type: 'BUDGET_HEALTH', confidence: 0.86 };
            }

            // COST_REDUCTION intent (Level 4)
            else if ((q.includes('reduce') || q.includes('cut') || q.includes('lower') || q.includes('minimize')) && 
                     (q.includes('cost') || q.includes('spending') || q.includes('expense')) &&
                     !q.includes('category')) {
                intent = { type: 'COST_REDUCTION', confidence: 0.85 };
            }

            // FINANCIAL_HEALTH_SCORE intent (Level 7)
            else if ((q.includes('financial health') || q.includes('health score') || q.includes('how am i doing')) &&
                     (q.includes('what') || q.includes('score') || q.includes('how'))) {
                intent = { type: 'FINANCIAL_HEALTH_SCORE', confidence: 0.92 };
            }

            // PREDICTIVE_INSIGHTS intent (Level 7)
            else if ((q.includes('predict') || q.includes('forecast') || q.includes('will i') || q.includes('end of month')) &&
                     (q.includes('spending') || q.includes('budget') || q.includes('saving'))) {
                intent = { type: 'PREDICTIVE_INSIGHTS', confidence: 0.88 };
            }

            // ACTIONABLE_ADVICE intent (Level 7)
            else if ((q.includes('what should i') || q.includes('specific advice') || q.includes('actionable')) &&
                     (q.includes('do') || q.includes('reduce') || q.includes('improve'))) {
                intent = { type: 'ACTIONABLE_ADVICE', confidence: 0.85 };
            }

            // CREATE_GOAL intent (Level 8)
            else if ((q.includes('create') || q.includes('set') || q.includes('add') || q.includes('new')) &&
                     (q.includes('goal') || q.includes('target') || q.includes('save') && q.includes('for'))) {
                intent = { type: 'CREATE_GOAL', confidence: 0.9 };
            }

            // GOAL_PROGRESS intent (Level 8)
            else if ((q.includes('goal') || q.includes('target')) &&
                     (q.includes('progress') || q.includes('status') || q.includes('how is') || q.includes('how am i'))) {
                intent = { type: 'GOAL_PROGRESS', confidence: 0.88 };
            }

            // GOAL_ACHIEVABILITY intent (Level 8)
            else if ((q.includes('can i') || q.includes('will i') || q.includes('reach') || q.includes('achieve')) &&
                     (q.includes('goal') || q.includes('target'))) {
                intent = { type: 'GOAL_ACHIEVABILITY', confidence: 0.87 };
            }

            // ADJUST_GOAL intent (Level 8)
            else if ((q.includes('adjust') || q.includes('modify') || q.includes('change') || q.includes('update')) &&
                     (q.includes('goal') || q.includes('target') || q.includes('plan'))) {
                intent = { type: 'ADJUST_GOAL', confidence: 0.86 };
            }

            // Context-aware intent refinement
            if (convContext && convContext.lastTopic) {
                if (intent.confidence < 0.7 && (q.includes('what') || q.includes('how') || q.includes('which'))) {
                    // Boost confidence if context suggests follow-up
                    if (convContext.lastTopic === 'savings' && (q.includes('save') || q.includes('reduce'))) {
                        intent.confidence = Math.min(0.9, intent.confidence + 0.2);
                    }
                }
            }

            return intent;
        } catch (e) {
            console.warn('Intent detection failed:', e);
            return { type: 'GENERAL_ADVICE', confidence: 0.5 };
        }
    },

    /**
     * Build enhanced financial context (Level 3 Intelligence)
     * @param {Object} baseContext - Base financial context
     * @returns {Object} Enhanced context with insights
     */
    buildFinancialContext(baseContext) {
        if (!baseContext) return null;

        try {
            const { income, expenses, savings, fixedExpenses, flexibleSpending, incomeSources, 
                    fixedExpenseList, flexibleData, monthlyData, history } = baseContext;

            const trends = this.analyzeTrends(monthlyData);
            const overspending = this.identifyOverspending(baseContext);

            // Calculate financial health metrics
            const expenseRatio = income > 0 ? ((expenses / income) * 100) : 0;
            const savingsRate = income > 0 ? (((income - expenses) / income) * 100) : 0;

            // Determine financial health status (Level 4 Enhanced)
            let financialHealth = 'UNKNOWN';
            const savingsRateNum = parseFloat(savingsRate);
            
            if (expenses > income) {
                financialHealth = 'Needs Attention'; // RISK
            } else if (expenseRatio > 85) {
                financialHealth = 'Needs Attention'; // WARNING
            } else if (expenseRatio < 50 && savingsRateNum > 20) {
                financialHealth = 'Healthy'; // GOOD
            } else if (expenseRatio < 70 && savingsRateNum > 10) {
                financialHealth = 'Moderate'; // MODERATE
            } else if (expenseRatio >= 70 || savingsRateNum < 10) {
                financialHealth = 'Needs Attention';
            } else {
                financialHealth = 'Moderate';
            }
            
            // Store both formats for compatibility
            const healthStatus = expenses > income ? 'RISK' : 
                               expenseRatio > 85 ? 'WARNING' : 
                               expenseRatio < 50 ? 'GOOD' : 'MODERATE';

            // Find top spending categories
            const topExpenses = [];
            if (fixedExpenseList.length > 0) {
                const sortedFixed = [...fixedExpenseList].sort((a, b) => b.amount - a.amount);
                topExpenses.push(...sortedFixed.slice(0, 3).map(exp => ({
                    name: exp.name,
                    amount: exp.amount,
                    type: 'fixed',
                    percentage: income > 0 ? ((exp.amount / income) * 100) : 0
                })));
            }

            const flexibleEntries = Object.entries(flexibleData)
                .filter(([_, amount]) => amount > 0)
                .sort(([_, a], [__, b]) => b - a)
                .slice(0, 3);

            flexibleEntries.forEach(([category, amount]) => {
                const categoryName = category === 'food' ? 'Food & Dining' : 
                                   category === 'travel' ? 'Travel & Transport' : 
                                   category === 'shopping' ? 'Shopping' : 'Miscellaneous';
                topExpenses.push({
                    name: categoryName,
                    amount: amount,
                    type: 'flexible',
                    percentage: income > 0 ? ((amount / income) * 100) : 0
                });
            });

            topExpenses.sort((a, b) => b.amount - a.amount);

            return {
                ...baseContext,
                // Enhanced metrics
                financialHealth, // Level 4: Healthy/Moderate/Needs Attention
                healthStatus, // Backward compatibility: RISK/WARNING/GOOD/MODERATE
                expenseRatio: expenseRatio.toFixed(1),
                savingsRate: savingsRate.toFixed(1),
                // Insights
                trends,
                overspending,
                topExpenses,
                // Month comparison
                monthComparison: this.buildMonthComparison(monthlyData)
            };
        } catch (e) {
            console.warn('Failed to build enhanced context:', e);
            return baseContext; // Return base context if enhancement fails
        }
    },

    /**
     * Build month-to-month comparison
     * @param {Object} monthlyData - Monthly financial data
     * @returns {Object} Month comparison data
     */
    buildMonthComparison(monthlyData) {
        try {
            const months = Object.keys(monthlyData).sort();
            if (months.length < 2) return null;

            const lastMonth = months[months.length - 1];
            const prevMonth = months[months.length - 2];

            const last = monthlyData[lastMonth] || { income: 0, expenses: 0 };
            const prev = monthlyData[prevMonth] || { income: 0, expenses: 0 };

            return {
                currentMonth: lastMonth,
                previousMonth: prevMonth,
                incomeChange: prev.income > 0 ? (((last.income - prev.income) / prev.income) * 100).toFixed(1) : '0',
                expenseChange: prev.expenses > 0 ? (((last.expenses - prev.expenses) / prev.expenses) * 100).toFixed(1) : '0',
                savingsChange: prev.income - prev.expenses > 0 ? 
                    ((((last.income - last.expenses) - (prev.income - prev.expenses)) / (prev.income - prev.expenses)) * 100).toFixed(1) : '0'
            };
        } catch (e) {
            console.warn('Month comparison failed:', e);
            return null;
        }
    },

    /**
     * Central Response Generator Registry (Level 6 Safety)
     * All response generators are registered here for safe access
     */
    responseGenerators: {},

    /**
     * Initialize response generator registry (Level 6 Safety)
     */
    initResponseGenerators() {
        try {
            this.responseGenerators = {
                SAVE_MORE: (ctx) => {
                    if (typeof this.generateSaveMoreResponse === 'function') {
                        return this.generateSaveMoreResponse(ctx);
                    }
                    return null;
                },
                CUT_EXPENSES: (ctx) => {
                    if (typeof this.generateCutExpensesResponse === 'function') {
                        return this.generateCutExpensesResponse(ctx);
                    }
                    return null;
                },
                HIGHEST_EXPENSE: (ctx) => {
                    if (typeof this.generateHighestExpenseResponse === 'function') {
                        return this.generateHighestExpenseResponse(ctx);
                    }
                    return null;
                },
                CATEGORY_ANALYSIS: (ctx) => {
                    if (typeof this.generateCategoryAnalysisResponse === 'function') {
                        return this.generateCategoryAnalysisResponse(ctx);
                    }
                    return null;
                },
                MONTHLY_SUMMARY: (ctx) => {
                    if (typeof this.generateLocalMonthlyReport === 'function') {
                        return this.generateLocalMonthlyReport(ctx);
                    }
                    return null;
                },
                SAVINGS_ADVICE: (ctx) => {
                    if (typeof this.generateSavingsAdviceResponse === 'function') {
                        return this.generateSavingsAdviceResponse(ctx);
                    }
                    return null;
                },
                EXPENSE_ANALYSIS: (ctx) => {
                    if (typeof this.generateExpenseAnalysisResponse === 'function') {
                        return this.generateExpenseAnalysisResponse(ctx);
                    }
                    return null;
                },
                BUDGET_OPTIMIZATION: (ctx) => {
                    if (typeof this.generateBudgetOptimizationResponse === 'function') {
                        return this.generateBudgetOptimizationResponse(ctx);
                    }
                    return null;
                },
                TREND_ANALYSIS: (ctx, extra) => {
                    if (typeof this.generateTrendAnalysisResponse === 'function') {
                        return this.generateTrendAnalysisResponse(ctx, extra);
                    }
                    return null;
                },
                OVERSpending_CHECK: (ctx) => {
                    if (typeof this.generateOverspendingCheckResponse === 'function') {
                        return this.generateOverspendingCheckResponse(ctx);
                    }
                    return null;
                },
                SAVINGS_ANALYSIS: (ctx) => {
                    if (typeof this.generateSavingsAnalysisResponse === 'function') {
                        return this.generateSavingsAnalysisResponse(ctx);
                    }
                    return null;
                },
                SPENDING_RISK: (ctx) => {
                    if (typeof this.generateSpendingRiskResponse === 'function') {
                        return this.generateSpendingRiskResponse(ctx);
                    }
                    return null;
                },
                BUDGET_HEALTH: (ctx) => {
                    if (typeof this.generateBudgetHealthResponse === 'function') {
                        return this.generateBudgetHealthResponse(ctx);
                    }
                    return null;
                },
                COST_REDUCTION: (ctx) => {
                    if (typeof this.generateCostReductionResponse === 'function') {
                        return this.generateCostReductionResponse(ctx);
                    }
                    return null;
                }
            };
        } catch (e) {
            console.warn('Response generator registry initialization failed:', e);
            this.responseGenerators = {}; // Empty registry on failure
        }
    },

    /**
     * Safe response generator caller (Level 6 Safety)
     * @param {string} intentType - Intent type
     * @param {Object} context - Enhanced context
     * @param {Object} extraParams - Extra parameters if needed
     * @returns {string|null} Response or null for fallback
     */
    callResponseGenerator(intentType, context, extraParams = null) {
        try {
            const generator = this.responseGenerators[intentType];
            if (generator && typeof generator === 'function') {
                if (extraParams) {
                    return generator(context, extraParams);
                }
                return generator(context);
            }
            
            // Fallback: try direct method call
            const methodName = `generate${intentType.charAt(0) + intentType.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}Response`;
            if (typeof this[methodName] === 'function') {
                if (extraParams) {
                    return this[methodName](context, extraParams);
                }
                return this[methodName](context);
            }
            
            return null; // Safe fallback
        } catch (e) {
            console.warn(`Response generator failed for ${intentType}:`, e.message);
            return null; // Never throw - always fall back
        }
    },

    /**
     * Generate smart response based on detected intent (Level 6 Enhanced Safety)
     * @param {string} question - User's question
     * @param {Object} intent - Detected intent
     * @param {Object} enhancedContext - Enhanced financial context
     * @returns {string|null} Intent-based response or null to fall back to keyword matching
     */
    generateSmartResponse(question, intent, enhancedContext) {
        if (!intent || !enhancedContext) return null;

        try {
            const { type, confidence } = intent;
            const { monthComparison } = enhancedContext;

            // Only use intent-based response if confidence is sufficient
            if (confidence < 0.7) return null;

            // Level 6: Use safe response generator registry
            let response = null;
            
            switch (type) {
                case 'MONTHLY_SUMMARY':
                    // Special handling for monthly summary
                    if (typeof this.generateLocalMonthlyReport === 'function') {
                        response = this.callResponseGenerator('MONTHLY_SUMMARY', enhancedContext);
                    }
                    if (!response) {
                        // Fallback to monthly report generation
                        const report = this.generateMonthlyReport(enhancedContext);
                        if (report) {
                            const monthName = new Date(report.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                            response = `Here's your monthly financial summary for ${monthName}:\n\nIncome: ₹${report.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nExpenses: ₹${report.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nSavings: ₹${report.totalSavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${report.savingsRate}%)\n\n${report.insights.join('\n')}`;
                        }
                    }
                    break;

                case 'TREND_ANALYSIS':
                    // Special handling for trend analysis (needs extra param)
                    response = this.callResponseGenerator(type, enhancedContext, monthComparison);
                    break;

                case 'FINANCIAL_HEALTH_SCORE':
                    response = this.generateFinancialHealthScoreResponse(enhancedContext);
                    break;

                case 'PREDICTIVE_INSIGHTS':
                    response = this.generatePredictiveInsightsResponse(enhancedContext);
                    break;

                case 'ACTIONABLE_ADVICE':
                    response = this.generateActionableAdviceResponse(enhancedContext);
                    break;

                case 'CREATE_GOAL':
                    response = this.handleCreateGoalIntent(question, enhancedContext);
                    break;

                case 'GOAL_PROGRESS':
                    response = this.generateGoalProgressResponse(enhancedContext);
                    break;

                case 'GOAL_ACHIEVABILITY':
                    response = this.generateGoalAchievabilityResponse(enhancedContext);
                    break;

                case 'ADJUST_GOAL':
                    response = this.handleAdjustGoalIntent(question, enhancedContext);
                    break;

                case 'WHAT_IF_SIMULATION':
                    response = this.handleWhatIfSimulation(question, enhancedContext);
                    break;

                case 'GOAL_FEASIBILITY_CHECK':
                    response = this.handleGoalFeasibilityCheck(question, enhancedContext);
                    break;

                case 'RISK_DETECTION':
                    response = this.generateRiskDetectionResponse(enhancedContext);
                    break;

                case 'PERSONALIZED_ADVICE':
                    response = this.generatePersonalizedAdvice(enhancedContext);
                    break;

                default:
                    // Use registry for all other intents
                    response = this.callResponseGenerator(type, enhancedContext);
                    break;
            }

            return response;
        } catch (e) {
            console.warn('Smart response generation failed:', e.message);
            return null; // Fall back safely
        }
    },

    /**
     * Generate intelligent response based on user question and financial context
     * @param {string} question - User's question
     * @param {Object} context - Financial context
     * @returns {string} Response message
     */
    generateResponse(question, context) {
        const q = question.toLowerCase();
        
        // Level 3: Build enhanced context and detect intent
        let enhancedContext = context;
        let intent = { type: 'GENERAL_ADVICE', confidence: 0.5 };
        
        try {
            enhancedContext = this.buildFinancialContext(context);
            const convContext = this.extractConversationContext();
            intent = this.detectIntent(question, convContext);
            
            // Try intent-based response first
            if (intent.confidence >= 0.7) {
                const smartResponse = this.generateSmartResponse(question, intent, enhancedContext);
                if (smartResponse) {
                    return this.applySafeResponseFramework(smartResponse);
                }
            }
        } catch (e) {
            console.warn('Level 3 intelligence failed, falling back:', e);
            // Continue with keyword-based matching
        }
        
        const { income, expenses, savings, fixedExpenses, flexibleSpending, incomeSources, fixedExpenseList, flexibleData, monthlyData, history } = context;
        
        // Extract conversation context for follow-up understanding
        let convContext = {};
        try {
            convContext = this.extractConversationContext();
        } catch (e) {
            console.warn('Failed to extract conversation context:', e);
            // Continue with empty context
        }

        // Trend analysis
        const trends = this.analyzeTrends(monthlyData);
        const overspending = this.identifyOverspending(context);

        // Handle follow-up questions with context awareness (defensive)
        try {
            if (typeof this.isFollowUpQuestion === 'function' && this.isFollowUpQuestion(q, convContext)) {
                if (typeof this.handleFollowUpQuestion === 'function') {
                    const followUpResponse = this.handleFollowUpQuestion(q, convContext, context);
                    if (followUpResponse) {
                        return this.applySafeResponseFramework(followUpResponse);
                    }
                }
            }
        } catch (e) {
            console.warn('Follow-up question detection failed, continuing with normal response:', e);
            // Fall through to normal response generation
        }

        // Income vs Expenses questions - enhanced with website-aware intelligence
        if (q.includes('income') && (q.includes('expense') || q.includes('spending'))) {
            if (income === 0 && expenses === 0) {
                return 'Based on your data, you haven\'t added any income or expenses yet. You may want to start by adding your monthly income sources and expenses to get insights.';
            }
            
            const ratio = income > 0 ? ((expenses / income) * 100).toFixed(1) : 0;
            const savingsRate = income > 0 ? (((income - expenses) / income) * 100).toFixed(1) : 0;
            
            let response = 'Based on your data, ';
            
            if (expenses > income) {
                response += `your expenses (₹${expenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceed your income (₹${income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). You're overspending by ₹${Math.abs(savings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
                
                // Add trend context (website-aware)
                if (trends.hasTrend && trends.expenseTrend === 'increasing') {
                    response += ` Your spending has been increasing by ${trends.expenseChangePercent}% recently, which explains why you're overspending.`;
                }
                
                response += ' You may want to review your expenses to find areas where you can reduce spending.';
            } else if (ratio > 80) {
                response += `your expenses are ${ratio}% of your income, which is quite high. You're saving ${savingsRate}% each month.`;
                
                if (trends.hasTrend && trends.expenseTrend === 'increasing') {
                    response += ` Your expenses have increased by ${trends.expenseChangePercent}% recently.`;
                }
                
                response += ' You may want to consider looking for ways to reduce expenses to increase your savings rate.';
            } else if (ratio < 50) {
                response += `great news! Your expenses are only ${ratio}% of your income. You're saving ${savingsRate}% each month, which is excellent.`;
                
                if (trends.hasTrend && trends.expenseTrend === 'decreasing') {
                    response += ` Your expenses have decreased by ${trends.expenseChangePercent}% recently, which is great progress!`;
                }
                
                response += ' This gives you a strong financial foundation.';
            } else {
                response += `your expenses account for ${ratio}% of your income, and you're saving ${savingsRate}% each month. This is a healthy balance. Your monthly savings is ₹${savings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
                
                if (trends.hasTrend) {
                    if (trends.expenseTrend === 'increasing') {
                        response += ` However, your expenses have increased by ${trends.expenseChangePercent}% recently, so you may want to keep an eye on this trend.`;
                    } else if (trends.expenseTrend === 'decreasing') {
                        response += ` Good news: your expenses have decreased by ${trends.expenseChangePercent}% recently.`;
                    }
                }
            }
            
            return this.applySafeResponseFramework(response);
        }

        // Savings questions - enhanced with supportive language
        if (q.includes('saving') || q.includes('save')) {
            if (savings <= 0) {
                return 'Based on your data, you currently don\'t have any savings. Your expenses equal or exceed your income. You may want to consider reducing expenses or increasing income to start building savings.';
            }

            const savingsRate = income > 0 ? (((income - expenses) / income) * 100).toFixed(1) : 0;
            let response = `Based on your data, you're currently saving ₹${savings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month, which is ${savingsRate}% of your income.`;

            if (savingsRate > 20) {
                response += ' That\'s an excellent savings rate! Keep up the good work.';
            } else if (savingsRate > 10) {
                response += ' That\'s a good savings rate. You\'re making steady progress.';
            } else {
                response += ' You may want to consider finding ways to increase your savings rate for better financial security.';
            }

            // Add trend if we have monthly data (website-aware)
            const monthlySavings = Object.values(monthlyData).map(m => m.income - m.expenses).filter(s => s > 0);
            if (monthlySavings.length > 1) {
                const avgSavings = monthlySavings.reduce((sum, s) => sum + s, 0) / monthlySavings.length;
                response += ` Your average monthly savings over the past ${monthlySavings.length} months has been ₹${avgSavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
            }

            return this.applySafeResponseFramework(response);
        }

        // Overspending questions - enhanced with website-aware intelligence
        if (q.includes('overspend') || q.includes('where am i') || q.includes('reduce') || q.includes('cut back') || q.includes('what should i reduce')) {
            if (overspending.length === 0) {
                // Even if no overspending, provide constructive insights
                const ratio = income > 0 ? ((expenses / income) * 100) : 0;
                if (ratio > 80) {
                    return 'Based on your data, you\'re not technically overspending, but your expenses are ${ratio.toFixed(0)}% of income, which is quite high. You may want to consider reducing expenses in your largest categories to improve your savings rate.';
                }
                return 'Good news! Based on your data, you\'re not overspending in any major category. Your expenses are well-balanced relative to your income. Keep up the good work!';
            }

            let response = 'Based on your data, here are areas where you might be overspending:\n\n';
            overspending.slice(0, 3).forEach((insight, index) => {
                response += `${index + 1}. ${insight.message}\n`;
            });
            
            // Add website-aware insights
            if (income > 0) {
                const totalExpenses = fixedExpenses + flexibleSpending;
                const expenseRatio = (totalExpenses / income) * 100;
                
                if (expenseRatio > 100) {
                    response += '\nYour total expenses exceed your income by ' + ((expenseRatio - 100) * income / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '.';
                }
                
                // Identify specific risky patterns
                const riskyCategories = [];
                fixedExpenseList.forEach(exp => {
                    const expRatio = (exp.amount / income) * 100;
                    if (expRatio > 30) {
                        riskyCategories.push(`${exp.name} (${expRatio.toFixed(1)}% of income)`);
                    }
                });
                
                if (riskyCategories.length > 0) {
                    response += `\n\nYour largest fixed expenses are consuming a high portion of income: ${riskyCategories.slice(0, 2).join(', ')}.`;
                }
            }
            
            response += '\n\nYou may want to consider reducing expenses in these areas or finding ways to increase your income. Even small reductions can make a difference.';
            return this.applySafeResponseFramework(response);
        }

        // Spending category questions
        if (q.includes('category') || (q.includes('spending') && !q.includes('save')) || (q.includes('expense') && !q.includes('income'))) {
            if (fixedExpenseList.length === 0 && flexibleSpending === 0) {
                return 'You haven\'t added any expenses yet. Add your fixed expenses and set flexible spending limits to get category-wise insights.';
            }

            let response = 'Here\'s a breakdown of your spending:\n\n';
            
            if (fixedExpenses > 0) {
                response += `Fixed Expenses: ₹${fixedExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                if (fixedExpenseList.length > 0) {
                    const sortedFixed = [...fixedExpenseList].sort((a, b) => b.amount - a.amount);
                    const topExpense = sortedFixed[0];
                    response += `Your largest fixed expense is ${topExpense.name} at ₹${topExpense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.\n\n`;
                }
            }

            if (flexibleSpending > 0) {
                response += `Flexible Spending: ₹${flexibleSpending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                const categories = Object.entries(flexibleData)
                    .filter(([_, amount]) => amount > 0)
                    .sort(([_, a], [__, b]) => b - a);
                
                if (categories.length > 0) {
                    const [topCategory, topAmount] = categories[0];
                    const categoryName = topCategory === 'food' ? 'Food & Dining' : 
                                       topCategory === 'travel' ? 'Travel & Transport' : 
                                       topCategory === 'shopping' ? 'Shopping' : 'Miscellaneous';
                    response += `Your highest flexible spending category is ${categoryName} at ₹${topAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
                    
                    // Add overspending context if applicable
                    const categoryRatio = income > 0 ? ((topAmount / income) * 100) : 0;
                    if (categoryRatio > 20) {
                        response += ` This represents ${categoryRatio.toFixed(1)}% of your income, which is quite high.`;
                    }
                }
            }

            return response;
        }

        // Affordability questions (with amount extraction)
        if (q.includes('afford') || q.includes('can i buy') || q.includes('should i buy')) {
            // Dashboard affordability tool is one-time only (monthly option removed)
            const availableForAfford = savings;
            if (availableForAfford <= 0) {
                return 'You currently don\'t have available savings, so any purchase would be difficult to afford right now. Focus on building savings first.';
            }

            // Try to extract amount from question
            const amountMatch = q.match(/₹?\s*(\d+(?:[.,]\d+)?)\s*(?:lakh|lakhs|crore|crores|thousand|thousands|k)?/i);
            let specificAmount = null;
            if (amountMatch) {
                let num = parseFloat(amountMatch[1].replace(/,/g, ''));
                if (q.includes('lakh')) num *= 100000;
                else if (q.includes('crore')) num *= 10000000;
                else if (q.includes('thousand') || q.includes('k')) num *= 1000;
                specificAmount = num;
            }

            const savingsRate = income > 0 ? (((income - expenses) / income) * 100).toFixed(1) : 0;
            let response = `You have ₹${Math.max(0, availableForAfford).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in available savings.`;

            if (specificAmount && specificAmount > 0) {
                const percentage = (specificAmount / availableForAfford) * 100;
                if (percentage <= 30) {
                    response += ` A purchase of ₹${specificAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} would be safe (${percentage.toFixed(1)}% of your savings).`;
                } else if (percentage <= 60) {
                    response += ` A purchase of ₹${specificAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} would be risky (${percentage.toFixed(1)}% of your savings). Consider if it's essential.`;
                } else {
                    response += ` A purchase of ₹${specificAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} would be difficult to afford (${percentage.toFixed(1)}% of your savings). You may need to save more or reduce other expenses first.`;
                }
            } else {
                response += ' As a general rule, purchases that are less than 30% of your savings are safe, 30-60% are risky, and above 60% are difficult to afford. Use the "Can I Afford This?" tool on the dashboard to check specific purchase amounts.';
            }

            response += ` Your current savings rate is ${savingsRate}%, which ${savingsRate > 20 ? 'is excellent' : savingsRate > 10 ? 'is good' : 'could be improved'}.`;
            return response;
        }

        // Income questions
        if (q.includes('income') && !q.includes('expense')) {
            if (income === 0 || incomeSources.length === 0) {
                return 'You haven\'t added any income sources yet. Add your monthly income to start tracking your finances.';
            }

            let response = `Your total monthly income is ₹${income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from ${incomeSources.length} source${incomeSources.length > 1 ? 's' : ''}.\n\n`;
            
            if (incomeSources.length > 1) {
                response += 'Your income sources:\n';
                incomeSources.forEach(source => {
                    response += `• ${source.name}: ₹${source.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                });
            }

            return response;
        }

        // How to save more questions
        if (q.includes('save more') || q.includes('increase savings') || q.includes('improve savings')) {
            if (savings <= 0) {
                return 'To start saving, you need to either reduce expenses or increase income. Your expenses currently equal or exceed your income. Review your spending categories to find areas where you can cut back.';
            }

            let response = 'Here are ways to save more:\n\n';
            
            if (overspending.length > 0) {
                response += '1. Address overspending areas:\n';
                overspending.slice(0, 2).forEach(insight => {
                    response += `   • ${insight.category || 'Overall'}: Consider reducing this expense\n`;
                });
                response += '\n';
            }

            const fixedRatio = income > 0 ? (fixedExpenses / income) * 100 : 0;
            const flexibleRatio = income > 0 ? (flexibleSpending / income) * 100 : 0;

            if (fixedRatio > 50) {
                response += '2. Your fixed expenses are high. Review if any can be reduced or negotiated.\n';
            }

            if (flexibleRatio > 30) {
                response += '3. Your flexible spending has room for reduction. Set lower budgets for non-essential categories.\n';
            }

            if (trends.hasTrend && trends.expenseTrend === 'increasing') {
                response += `4. Your expenses have been increasing. Try to reverse this trend by being more mindful of spending.\n`;
            }

            response += '\nEven small reductions can add up over time. Focus on one category at a time.';
            return response;
        }

        // Trend questions
        if (q.includes('trend') || q.includes('increasing') || q.includes('decreasing') || q.includes('change')) {
            if (!trends.hasTrend) {
                return 'I need more historical data to identify trends. Keep tracking your finances for a few months to see spending patterns.';
            }

            let response = 'Here are the trends I\'ve noticed:\n\n';
            
            if (trends.expenseTrend === 'increasing') {
                response += `• Your expenses have increased by ${trends.expenseChangePercent}% recently. This means you're spending more than before.`;
            } else if (trends.expenseTrend === 'decreasing') {
                response += `• Your expenses have decreased by ${trends.expenseChangePercent}% recently. Great progress!`;
            } else {
                response += '• Your expenses have remained relatively stable.';
            }

            if (trends.incomeTrend === 'increasing') {
                response += `\n• Your income has increased by ${trends.incomeChangePercent}%, which is positive.`;
            } else if (trends.incomeTrend === 'decreasing') {
                response += `\n• Your income has decreased by ${trends.incomeChangePercent}%. Consider ways to stabilize or increase it.`;
            }

            return response;
        }

        // General help
        if (q.includes('help') || q.includes('what can you') || q.includes('what do you')) {
            return 'I can help you understand your finances! Ask me about:\n\n• Your income vs expenses\n• Your savings and savings rate\n• Spending by category\n• Where you might be overspending\n• Whether you can afford something\n• Your financial trends\n• How to save more\n\nJust ask in plain English, and I\'ll analyze your data to give you helpful insights.';
        }

        // Default response with context awareness
        try {
            const recentHistory = this.chatHistory.slice(-6);
            if (recentHistory.length > 0) {
                const lastUserMsg = recentHistory.filter(m => m.role === 'user').pop();
                if (lastUserMsg) {
                    const lastQ = lastUserMsg.message.toLowerCase();
                    if (lastQ.includes('income') || lastQ.includes('expense')) {
                        return 'Would you like to know more about your income and expenses? Try asking "Where am I overspending?" or "How can I save more?"';
                    }
                    if (lastQ.includes('saving')) {
                        return 'Would you like to know more about your savings? Try asking "Can I afford ₹5000?" or "How can I increase my savings?"';
                    }
                }
            }
        } catch (e) {
            console.warn('Error in default response context awareness:', e);
            // Fall through to final default response
        }

        return 'I can help you understand your finances. Try asking me about your income, expenses, savings, spending categories, trends, or whether you can afford a purchase. If you need help, just ask "What can you help me with?"';
    },

    // ============================================
    // LEVEL 3 INTELLIGENCE: INTENT-BASED RESPONSES
    // ============================================

    /**
     * Generate MONTHLY_SUMMARY intent response (Level 3 Intelligence)
     * @param {Object} context - Enhanced financial context
     * @returns {string} Human-readable monthly report
     */
    generateMonthlySummaryResponse(context) {
        if (!context) {
            return 'I don\'t have enough data yet to generate a full monthly report. Add more income or expenses and try again.';
        }

        try {
            // Safely extract data from context
            const income = context.income || 0;
            const expenses = context.expenses || 0;
            const savings = context.savings || (income - expenses);
            const topExpenses = context.topExpenses || [];
            const financialHealth = context.financialHealth || 'UNKNOWN';
            const savingsRate = context.savingsRate || (income > 0 ? (((income - expenses) / income) * 100).toFixed(1) : '0');

            // Check if we have minimum data
            if (income === 0 && expenses === 0) {
                return 'I don\'t have enough data yet to generate a full monthly report. Add more income or expenses and try again.';
            }

            // Get current month name
            const now = new Date();
            const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

            // Build human-readable report
            let response = `Here's your monthly financial summary for ${monthName}:\n\n`;

            // Income
            response += `Your total income this month was ₹${income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.\n`;

            // Expenses
            response += `You spent ₹${expenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, `;

            // Savings
            if (savings > 0) {
                response += `and saved ₹${savings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.\n`;
            } else {
                response += `which is ₹${Math.abs(savings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more than you earned.\n`;
            }

            // Top spending category
            if (topExpenses && topExpenses.length > 0) {
                const topCategory = topExpenses[0];
                response += `\nYour highest spending category was ${topCategory.name} (₹${topCategory.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`;
            }

            // Financial health status
            response += `\n\nOverall, your savings look `;
            if (financialHealth === 'GOOD') {
                response += 'Healthy.';
            } else if (financialHealth === 'MODERATE') {
                response += 'Moderate.';
            } else if (financialHealth === 'WARNING' || financialHealth === 'RISK') {
                response += 'Needs Attention.';
            } else {
                // Determine from savings rate
                const rate = parseFloat(savingsRate);
                if (rate > 20) {
                    response += 'Healthy.';
                } else if (rate > 10) {
                    response += 'Moderate.';
                } else {
                    response += 'Needs Attention.';
                }
            }

            // Personalized tip
            if (topExpenses && topExpenses.length > 0 && savings < 0) {
                const topCategory = topExpenses[0];
                response += `\n\nTip: Try reducing spending in ${topCategory.name} to improve your savings next month.`;
            } else if (parseFloat(savingsRate) < 10 && topExpenses && topExpenses.length > 0) {
                const topCategory = topExpenses[0];
                response += `\n\nTip: Consider reducing ${topCategory.name} spending to increase your savings rate.`;
            } else if (savings > 0 && parseFloat(savingsRate) > 15) {
                response += `\n\nTip: You're doing well! Keep maintaining your current spending habits.`;
            }

            return response;
        } catch (e) {
            console.warn('Monthly summary generation failed:', e);
            // Fallback response
            return 'I encountered an issue generating your monthly report. Please make sure you have added income and expenses, then try again.';
        }
    },

    /**
     * Generate local monthly report (Level 7 Enhanced with Proactive Insights)
     */
    generateLocalMonthlyReport(context) {
        if (!context) {
            return 'I don\'t have enough data yet to generate a full monthly report. Add more income or expenses and try again.';
        }

        try {
            const income = context.income || 0;
            const expenses = context.expenses || 0;
            const savings = context.savings || (income - expenses);
            const topExpenses = context.topExpenses || [];
            const financialHealth = context.financialHealth || 'UNKNOWN';
            const savingsRate = context.savingsRate || (income > 0 ? (((income - expenses) / income) * 100).toFixed(1) : '0');

            if (income === 0 && expenses === 0) {
                return 'I don\'t have enough data yet to generate a full monthly report. Add more income or expenses and try again.';
            }

            const now = new Date();
            const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

            let response = `Here's your monthly financial summary for ${monthName}:\n\n`;
            response += `Your total income this month was ₹${income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.\n`;
            response += `You spent ₹${expenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, `;

            if (savings > 0) {
                response += `and saved ₹${savings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.\n`;
            } else {
                response += `which is ₹${Math.abs(savings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more than you earned.\n`;
            }

            if (topExpenses && topExpenses.length > 0) {
                const topCategory = topExpenses[0];
                response += `\nYour highest spending category was ${topCategory.name} (₹${topCategory.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`;
            }

            response += `\n\nOverall, your savings look `;
            const rate = parseFloat(savingsRate);
            if (financialHealth === 'Healthy' || rate > 20) {
                response += 'Healthy.';
            } else if (financialHealth === 'Moderate' || rate > 10) {
                response += 'Moderate.';
            } else {
                response += 'Needs Attention.';
            }

            // Level 7: Add proactive insights automatically
            const proactiveInsight = this.getProactiveInsight(context);
            if (proactiveInsight) {
                response += `\n\n💡 Insight: ${proactiveInsight}`;
            }

            // Level 8: Add goal progress if active goals exist
            const goalEncouragement = this.checkGoalsAndEncourage(context);
            if (goalEncouragement) {
                response += `\n\n${goalEncouragement}`;
            }

            return response;
        } catch (e) {
            console.warn('Local monthly report generation failed:', e);
            return 'I encountered an issue generating your monthly report. Please try again.';
        }
    },

    /**
     * Get proactive insight (Level 7 Smart Triggering)
     * Returns relevant insight only when appropriate
     */
    getProactiveInsight(context) {
        if (!context) return null;

        try {
            const { income, expenses, savings, savingsRate, expenseRatio, monthlyData, trends } = context;
            
            if (income === 0 || expenses === 0) return null;

            const rate = parseFloat(savingsRate || 0);
            const ratio = parseFloat(expenseRatio || 0);

            // Only trigger if there's a significant issue or opportunity
            if (expenses > income) {
                const overspend = expenses - income;
                return `You're currently overspending by ₹${overspend.toLocaleString('en-IN')}. Consider reviewing your expenses.`;
            }

            if (ratio > 85) {
                return `Your expenses are ${ratio.toFixed(1)}% of income, leaving little room for savings.`;
            }

            // Predictive insight based on current month progress
            const now = new Date();
            const daysElapsed = now.getDate();
            if (daysElapsed > 10 && daysElapsed < 25) {
                const dailyAverage = expenses / daysElapsed;
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const projectedExpenses = dailyAverage * daysInMonth;
                
                if (projectedExpenses > income * 1.1) {
                    return `At current spending rate, you may exceed your budget by ₹${(projectedExpenses - income).toLocaleString('en-IN')} this month.`;
                }
            }

            if (rate < 10 && savings > 0) {
                return `Your savings rate is ${rate.toFixed(1)}%. Aim for 15-20% for better financial security.`;
            }

            // Level 8: Check goal progress
            const activeGoals = this.getActiveGoals();
            if (activeGoals.length > 0) {
                const goal = activeGoals[0];
                const updatedGoal = this.updateGoalProgress(goal);
                
                if (updatedGoal.status === 'behind') {
                    const monthsElapsed = Math.floor((Date.now() - updatedGoal.createdAt) / (1000 * 60 * 60 * 24 * 30));
                    const expectedSaved = updatedGoal.monthlyRequirement * Math.max(1, monthsElapsed);
                    const shortfall = expectedSaved - updatedGoal.amountSaved;
                    
                    if (shortfall > 0) {
                        return `Your "${updatedGoal.name}" goal is behind by ₹${shortfall.toLocaleString('en-IN')}. Consider reducing expenses to catch up.`;
                    }
                }
            }

            return null; // No insight if everything looks good
        } catch (e) {
            return null; // Silent fail
        }
    },

    /**
     * Generate SAVINGS_ANALYSIS intent response (Level 4)
     */
    generateSavingsAnalysisResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to analyze your savings. Please add income and expenses first.';
        }

        try {
            const { savings, savingsRate, income, expenses, financialHealth, trends, topExpenses } = context;
            
            if (income === 0 && expenses === 0) {
                return 'Based on your data, you haven\'t added any financial information yet. Add your income and expenses to get a savings analysis.';
            }

            let response = 'Here\'s your savings analysis:\n\n';
            
            const rate = parseFloat(savingsRate || 0);
            
            if (savings > 0) {
                response += `You're saving ₹${savings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month, which is ${rate.toFixed(1)}% of your income. `;
                
                if (rate > 20) {
                    response += 'This is an excellent savings rate! ';
                } else if (rate > 10) {
                    response += 'This is a good savings rate. ';
                } else {
                    response += 'This savings rate could be improved. ';
                }
            } else {
                response += `You're currently not saving any money. Your expenses equal or exceed your income. `;
            }

            // Add health context
            if (financialHealth === 'Healthy') {
                response += 'Your financial health looks good.';
            } else if (financialHealth === 'Moderate') {
                response += 'Your financial health is moderate.';
            } else {
                response += 'Your financial health needs attention.';
            }

            // Add trend context
            if (trends && trends.hasTrend) {
                if (trends.expenseTrend === 'increasing') {
                    response += ` Your expenses have been increasing, which may impact your savings.`;
                } else if (trends.expenseTrend === 'decreasing') {
                    response += ` Your expenses are decreasing, which is helping your savings.`;
                }
            }

            // Add actionable insight
            if (rate < 15 && topExpenses && topExpenses.length > 0) {
                const top = topExpenses[0];
                if (top.percentage > 20) {
                    response += `\n\nTo improve savings, consider reducing ${top.name} spending, which is ${top.percentage.toFixed(1)}% of your income.`;
                }
            }

            return response;
        } catch (e) {
            console.warn('Savings analysis failed:', e);
            return 'I encountered an issue analyzing your savings. Please try again.';
        }
    },

    /**
     * Generate SPENDING_RISK intent response (Level 4)
     */
    generateSpendingRiskResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to assess spending risk. Please add income and expenses first.';
        }

        try {
            const { expenses, income, expenseRatio, financialHealth, overspending, topExpenses } = context;
            
            if (income === 0 && expenses === 0) {
                return 'Based on your data, you haven\'t added any financial information yet. Add your income and expenses to assess spending risk.';
            }

            let response = 'Here\'s your spending risk assessment:\n\n';
            
            const ratio = parseFloat(expenseRatio || 0);
            
            if (expenses > income) {
                response += `Your spending is risky - you're spending ₹${Math.abs(income - expenses).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more than you earn. This is not sustainable.`;
            } else if (ratio > 90) {
                response += `Your spending is high risk - ${ratio.toFixed(1)}% of your income goes to expenses, leaving very little room for savings or emergencies.`;
            } else if (ratio > 80) {
                response += `Your spending is moderate risk - ${ratio.toFixed(1)}% of your income goes to expenses. Consider reducing expenses to improve financial security.`;
            } else if (ratio < 70) {
                response += `Your spending looks safe - ${ratio.toFixed(1)}% of your income goes to expenses, which leaves room for savings.`;
            } else {
                response += `Your spending is moderate - ${ratio.toFixed(1)}% of your income goes to expenses.`;
            }

            // Add specific risk factors
            if (overspending && overspending.length > 0) {
                response += `\n\nRisk factors: ${overspending[0].message}`;
            }

            if (topExpenses && topExpenses.length > 0) {
                const top = topExpenses[0];
                if (top.percentage > 30) {
                    response += `\n\nHigh concentration risk: ${top.name} is ${top.percentage.toFixed(1)}% of your income, which could impact your financial flexibility.`;
                }
            }

            return response;
        } catch (e) {
            console.warn('Spending risk assessment failed:', e);
            return 'I encountered an issue assessing spending risk. Please try again.';
        }
    },

    /**
     * Generate BUDGET_HEALTH intent response (Level 4)
     */
    generateBudgetHealthResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to assess your budget health. Please add income and expenses first.';
        }

        try {
            const { financialHealth, savingsRate, expenseRatio, savings, income, expenses, trends } = context;
            
            if (income === 0 && expenses === 0) {
                return 'Based on your data, you haven\'t added any financial information yet. Add your income and expenses to assess budget health.';
            }

            let response = 'Here\'s your budget health assessment:\n\n';
            
            const health = financialHealth || 'Moderate';
            const rate = parseFloat(savingsRate || 0);
            const ratio = parseFloat(expenseRatio || 0);
            
            if (health === 'Healthy') {
                response += `Your budget health is Healthy. `;
                response += `You're saving ${rate.toFixed(1)}% of your income, and expenses are ${ratio.toFixed(1)}% of income. This is a strong financial position.`;
            } else if (health === 'Moderate') {
                response += `Your budget health is Moderate. `;
                response += `You're saving ${rate.toFixed(1)}% of your income, and expenses are ${ratio.toFixed(1)}% of income. There's room for improvement.`;
            } else {
                response += `Your budget health Needs Attention. `;
                if (expenses > income) {
                    response += `You're spending more than you earn. `;
                } else {
                    response += `Your expenses are ${ratio.toFixed(1)}% of income, and savings rate is ${rate.toFixed(1)}%. `;
                }
                response += `Consider reducing expenses or increasing income.`;
            }

            // Add trend context
            if (trends && trends.hasTrend) {
                if (trends.expenseTrend === 'increasing') {
                    response += `\n\nNote: Your expenses have been increasing, which may impact your budget health.`;
                } else if (trends.expenseTrend === 'decreasing') {
                    response += `\n\nGood news: Your expenses are decreasing, which is improving your budget health.`;
                }
            }

            return response;
        } catch (e) {
            console.warn('Budget health assessment failed:', e);
            return 'I encountered an issue assessing budget health. Please try again.';
        }
    },

    /**
     * Generate COST_REDUCTION intent response (Level 4)
     */
    generateCostReductionResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to suggest cost reductions. Please add income and expenses first.';
        }

        try {
            const { expenses, income, topExpenses, fixedExpenses, flexibleSpending, expenseRatio } = context;
            
            if (expenses === 0) {
                return 'Based on your data, you haven\'t added any expenses yet. Add your expenses to get cost reduction suggestions.';
            }

            let response = 'Here are cost reduction opportunities:\n\n';
            
            const ratio = parseFloat(expenseRatio || 0);
            
            if (topExpenses && topExpenses.length > 0) {
                response += 'Top areas to reduce costs:\n';
                topExpenses.slice(0, 3).forEach((exp, idx) => {
                    response += `${idx + 1}. ${exp.name}: ₹${exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${exp.percentage.toFixed(1)}% of income)\n`;
                    if (exp.percentage > 25) {
                        response += `   → This is a high-impact area. Even a 10-15% reduction would save ₹${(exp.amount * 0.1).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month.\n`;
                    }
                });
            }

            // Add general guidance
            if (ratio > 80) {
                response += `\nYour expenses are ${ratio.toFixed(1)}% of income. Aim to reduce this to below 70% for better financial health.`;
            } else if (ratio > 70) {
                response += `\nYour expenses are ${ratio.toFixed(1)}% of income. Reducing by 5-10% would improve your savings significantly.`;
            } else {
                response += `\nYour expenses are ${ratio.toFixed(1)}% of income, which is reasonable. Focus on optimizing your top spending categories.`;
            }

            return response;
        } catch (e) {
            console.warn('Cost reduction suggestions failed:', e);
            return 'I encountered an issue generating cost reduction suggestions. Please try again.';
        }
    },

    /**
     * Calculate Financial Health Score (Level 7)
     * @param {Object} context - Enhanced financial context
     * @returns {Object} Health score object with score, status, and explanation
     */
    calculateFinancialHealthScore(context) {
        if (!context) {
            return { score: 0, status: 'Unknown', explanation: 'Insufficient data to calculate health score.' };
        }

        try {
            const { income, expenses, savings, savingsRate, expenseRatio, fixedExpenses, flexibleSpending, monthlyData, trends } = context;
            
            if (income === 0 && expenses === 0) {
                return { score: 0, status: 'Unknown', explanation: 'Add income and expenses to calculate your financial health score.' };
            }

            let score = 50; // Base score
            const factors = [];

            // Factor 1: Savings Rate (0-30 points)
            const rate = parseFloat(savingsRate || 0);
            if (rate > 20) {
                score += 30;
                factors.push('Excellent savings rate');
            } else if (rate > 15) {
                score += 25;
                factors.push('Good savings rate');
            } else if (rate > 10) {
                score += 15;
                factors.push('Moderate savings rate');
            } else if (rate > 5) {
                score += 5;
                factors.push('Low savings rate');
            } else if (rate <= 0) {
                score -= 20;
                factors.push('No savings');
            }

            // Factor 2: Expense Ratio (0-25 points)
            const ratio = parseFloat(expenseRatio || 0);
            if (ratio < 50) {
                score += 25;
                factors.push('Low expense ratio');
            } else if (ratio < 70) {
                score += 15;
                factors.push('Moderate expense ratio');
            } else if (ratio < 85) {
                score += 5;
                factors.push('High expense ratio');
            } else if (ratio >= 100) {
                score -= 30;
                factors.push('Overspending');
            } else {
                score -= 10;
                factors.push('Very high expense ratio');
            }

            // Factor 3: Fixed vs Flexible Balance (0-20 points)
            if (income > 0) {
                const fixedRatio = (fixedExpenses / income) * 100;
                const flexibleRatio = (flexibleSpending / income) * 100;
                
                if (fixedRatio < 50 && flexibleRatio < 30) {
                    score += 20;
                    factors.push('Balanced expense structure');
                } else if (fixedRatio < 60 && flexibleRatio < 40) {
                    score += 10;
                    factors.push('Reasonable expense structure');
                } else if (fixedRatio > 70) {
                    score -= 15;
                    factors.push('High fixed expenses');
                } else if (flexibleRatio > 50) {
                    score -= 10;
                    factors.push('High flexible spending');
                }
            }

            // Factor 4: Monthly Balance Stability (0-15 points)
            if (monthlyData && Object.keys(monthlyData).length >= 2) {
                const months = Object.keys(monthlyData).sort();
                const recentMonths = months.slice(-3);
                const balances = recentMonths.map(m => {
                    const data = monthlyData[m];
                    return (data.income || 0) - (data.expenses || 0);
                });
                
                const avgBalance = balances.reduce((a, b) => a + b, 0) / balances.length;
                const variance = balances.reduce((sum, b) => sum + Math.pow(b - avgBalance, 2), 0) / balances.length;
                const stability = Math.sqrt(variance);
                
                if (stability < avgBalance * 0.1 && avgBalance > 0) {
                    score += 15;
                    factors.push('Stable monthly balance');
                } else if (stability < avgBalance * 0.3 && avgBalance > 0) {
                    score += 8;
                    factors.push('Moderately stable balance');
                } else if (avgBalance < 0) {
                    score -= 10;
                    factors.push('Negative monthly balance');
                }
            }

            // Factor 5: Trend Direction (0-10 points)
            if (trends && trends.hasTrend) {
                if (trends.expenseTrend === 'decreasing' && rate > 0) {
                    score += 10;
                    factors.push('Improving expense trend');
                } else if (trends.expenseTrend === 'increasing' && ratio > 80) {
                    score -= 10;
                    factors.push('Worsening expense trend');
                }
            }

            // Normalize score to 0-100
            score = Math.max(0, Math.min(100, score));

            // Determine status
            let status, explanation;
            if (score >= 80) {
                status = 'Excellent';
                explanation = 'Your financial health is excellent. You have strong savings, balanced expenses, and good financial stability.';
            } else if (score >= 65) {
                status = 'Good';
                explanation = 'Your financial health is good. You\'re managing expenses well and building savings.';
            } else if (score >= 50) {
                status = 'Moderate';
                explanation = 'Your financial health is moderate. There\'s room for improvement in savings and expense management.';
            } else if (score >= 35) {
                status = 'Needs Attention';
                explanation = 'Your financial health needs attention. Focus on reducing expenses and increasing savings.';
            } else {
                status = 'Critical';
                explanation = 'Your financial health requires immediate attention. You may be overspending or have insufficient savings.';
            }

            return { score: Math.round(score), status, explanation, factors };
        } catch (e) {
            console.warn('Health score calculation failed:', e);
            return { score: 0, status: 'Unknown', explanation: 'Unable to calculate health score. Please ensure your financial data is complete.' };
        }
    },

    /**
     * Generate FINANCIAL_HEALTH_SCORE intent response (Level 7)
     */
    generateFinancialHealthScoreResponse(context) {
        if (!context) {
            return 'I need more information to calculate your financial health score. Please add income and expenses first.';
        }

        try {
            const healthScore = this.calculateFinancialHealthScore(context);
            
            if (healthScore.score === 0 && healthScore.status === 'Unknown') {
                return healthScore.explanation;
            }

            let response = `Your Financial Health Score: ${healthScore.score}/100\n\n`;
            response += `Status: ${healthScore.status}\n\n`;
            response += `${healthScore.explanation}\n\n`;
            
            if (healthScore.factors && healthScore.factors.length > 0) {
                response += 'Key factors:\n';
                healthScore.factors.slice(0, 3).forEach((factor, idx) => {
                    response += `${idx + 1}. ${factor}\n`;
                });
            }

            return response;
        } catch (e) {
            console.warn('Financial health score response failed:', e);
            return 'I encountered an issue calculating your financial health score. Please try again.';
        }
    },

    /**
     * Generate Predictive Insights (Level 7)
     * @param {Object} context - Enhanced financial context
     * @returns {string} Predictive insights response
     */
    generatePredictiveInsightsResponse(context) {
        if (!context) {
            return 'I need more information to provide predictive insights. Please add income and expenses first.';
        }

        try {
            const { income, expenses, savings, monthlyData, trends, expenseRatio, savingsRate } = context;
            
            if (income === 0 && expenses === 0) {
                return 'Add income and expenses to get predictive insights about your financial future.';
            }

            let response = 'Predictive insights:\n\n';
            const insights = [];

            // Calculate days in current month and days elapsed
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysElapsed = now.getDate();
            const daysRemaining = daysInMonth - daysElapsed;

            // Predict end-of-month expenses
            if (daysElapsed > 0 && expenses > 0) {
                const dailyAverage = expenses / daysElapsed;
                const projectedMonthlyExpenses = dailyAverage * daysInMonth;
                const projectedSavings = income - projectedMonthlyExpenses;

                if (projectedMonthlyExpenses > income) {
                    const overspend = projectedMonthlyExpenses - income;
                    insights.push(`You may exceed your budget by ₹${overspend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month if current spending continues.`);
                } else if (projectedSavings < savings) {
                    const drop = savings - projectedSavings;
                    insights.push(`Your savings could drop by ₹${drop.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} by month-end if spending continues at current rate.`);
                } else if (projectedSavings > savings * 1.1) {
                    insights.push(`If you maintain current spending, you could save ₹${projectedSavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month.`);
                }
            }

            // Predict next month based on trends
            if (trends && trends.hasTrend && monthlyData && Object.keys(monthlyData).length >= 2) {
                const months = Object.keys(monthlyData).sort();
                const recentMonths = months.slice(-2);
                const recentAvgExpenses = recentMonths.reduce((sum, m) => sum + (monthlyData[m].expenses || 0), 0) / recentMonths.length;
                
                if (trends.expenseTrend === 'increasing') {
                    const increasePercent = parseFloat(trends.expenseChangePercent || 0);
                    const projectedNextMonth = recentAvgExpenses * (1 + increasePercent / 100);
                    if (projectedNextMonth > income) {
                        insights.push(`Based on current trends, next month's expenses could exceed income by ₹${(projectedNextMonth - income).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
                    }
                }
            }

            // Savings rate projection
            const rate = parseFloat(savingsRate || 0);
            if (rate < 10 && income > expenses) {
                insights.push(`At current rate, you're saving ${rate.toFixed(1)}% of income. Aim for 15-20% for better financial security.`);
            }

            // Level 8: Add goal-related predictive insights
            const activeGoals = this.getActiveGoals();
            if (activeGoals.length > 0) {
                const goal = activeGoals[0];
                const updatedGoal = this.updateGoalProgress(goal);
                const monthsElapsed = Math.floor((Date.now() - updatedGoal.createdAt) / (1000 * 60 * 60 * 24 * 30));
                const expectedSaved = updatedGoal.monthlyRequirement * Math.max(1, monthsElapsed);
                
                if (updatedGoal.amountSaved < expectedSaved * 0.8) {
                    const shortfall = expectedSaved - updatedGoal.amountSaved;
                    insights.push(`Your "${updatedGoal.name}" goal is behind schedule by ₹${shortfall.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Consider increasing monthly savings.`);
                }
            }

            if (insights.length === 0) {
                response += 'Based on your current data, your financial trajectory looks stable. Continue monitoring your spending to maintain this balance.';
            } else {
                insights.forEach((insight, idx) => {
                    response += `${idx + 1}. ${insight}\n`;
                });
            }

            return response;
        } catch (e) {
            console.warn('Predictive insights generation failed:', e);
            return 'I encountered an issue generating predictive insights. Please try again.';
        }
    },

    /**
     * Generate Actionable Advice (Level 7)
     * @param {Object} context - Enhanced financial context
     * @returns {string} Specific, numeric actionable advice
     */
    generateActionableAdviceResponse(context) {
        if (!context) {
            return 'I need more information to provide actionable advice. Please add income and expenses first.';
        }

        try {
            const { income, expenses, savings, topExpenses, expenseRatio, savingsRate, fixedExpenses, flexibleSpending } = context;
            
            if (income === 0 && expenses === 0) {
                return 'Add income and expenses to get specific, actionable advice.';
            }

            let response = 'Actionable advice:\n\n';
            const advice = [];

            // Specific category reduction advice
            if (topExpenses && topExpenses.length > 0) {
                const topExpense = topExpenses[0];
                if (topExpense.percentage > 20) {
                    const reductionAmount = topExpense.amount * 0.15; // 15% reduction
                    const newSavings = savings + reductionAmount;
                    const newRate = income > 0 ? (((income - expenses + reductionAmount) / income) * 100) : 0;
                    
                    advice.push(`Reduce ${topExpense.name} by ₹${reductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (15% reduction). This would increase your monthly savings to ₹${newSavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${newRate.toFixed(1)}% savings rate).`);
                }
            }

            // Expense ratio optimization
            const ratio = parseFloat(expenseRatio || 0);
            if (ratio > 80) {
                const targetRatio = 70;
                const targetExpenses = income * (targetRatio / 100);
                const reductionNeeded = expenses - targetExpenses;
                const newSavings = savings + reductionNeeded;
                
                if (reductionNeeded > 0) {
                    advice.push(`Reduce total expenses by ₹${reductionNeeded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to bring expense ratio to ${targetRatio}%. This would increase savings to ₹${newSavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
                }
            }

            // Savings rate improvement
            const rate = parseFloat(savingsRate || 0);
            if (rate < 15 && income > expenses) {
                const targetRate = 15;
                const targetSavings = income * (targetRate / 100);
                const savingsGap = targetSavings - savings;
                
                if (savingsGap > 0) {
                    advice.push(`Increase monthly savings by ₹${savingsGap.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to reach ${targetRate}% savings rate. This can be achieved by reducing expenses or increasing income.`);
                }
            }

            // Fixed vs flexible balance
            if (income > 0) {
                const fixedRatio = (fixedExpenses / income) * 100;
                const flexibleRatio = (flexibleSpending / income) * 100;
                
                if (flexibleRatio > 40 && flexibleSpending > fixedExpenses) {
                    const targetFlexible = income * 0.30; // 30% target
                    const reduction = flexibleSpending - targetFlexible;
                    advice.push(`Reduce flexible spending by ₹${reduction.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to bring it to 30% of income. Focus on non-essential categories.`);
                }
            }

            if (advice.length === 0) {
                response += 'Your financial situation looks balanced. Continue monitoring expenses and maintain your current savings rate.';
            } else {
                advice.forEach((item, idx) => {
                    response += `${idx + 1}. ${item}\n\n`;
                });
            }

            return response;
        } catch (e) {
            console.warn('Actionable advice generation failed:', e);
            return 'I encountered an issue generating actionable advice. Please try again.';
        }
    },

    /**
     * Generate SAVE_MORE intent response (Level 3)
     */
    generateSaveMoreResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to suggest ways to save more. Please add income and expenses first.';
        }

        try {
            const { savings, income, expenses, fixedExpenses, flexibleSpending, overspending, trends, topExpenses } = context;
            
            if (savings <= 0) {
                return 'To start saving, you need to either reduce expenses or increase income. Your expenses currently equal or exceed your income. Review your spending categories to find areas where you can cut back.';
            }

            let response = 'Here are ways to save more:\n\n';
            
            if (overspending && overspending.length > 0) {
                response += '1. Address overspending areas:\n';
                overspending.slice(0, 2).forEach(insight => {
                    response += `   • ${insight.category || 'Overall'}: Consider reducing this expense\n`;
                });
                response += '\n';
            }

            const fixedRatio = income > 0 ? (fixedExpenses / income) * 100 : 0;
            const flexibleRatio = income > 0 ? (flexibleSpending / income) * 100 : 0;

            if (fixedRatio > 50) {
                response += '2. Your fixed expenses are high. Review if any can be reduced or negotiated.\n';
            }

            if (flexibleRatio > 30) {
                response += '3. Your flexible spending has room for reduction. Set lower budgets for non-essential categories.\n';
            }

            if (trends && trends.hasTrend && trends.expenseTrend === 'increasing') {
                response += `4. Your expenses have been increasing. Try to reverse this trend by being more mindful of spending.\n`;
            }

            if (topExpenses && topExpenses.length > 0) {
                const top = topExpenses[0];
                if (top.percentage > 20) {
                    response += `5. Focus on reducing ${top.name}, which is ${top.percentage.toFixed(1)}% of your income.\n`;
                }
            }

            response += '\nEven small reductions can add up over time. Focus on one category at a time.';
            return response;
        } catch (e) {
            console.warn('Save more response failed:', e);
            return 'I can help you find ways to save more. Review your spending categories and look for areas to reduce expenses.';
        }
    },

    /**
     * Generate CUT_EXPENSES intent response (Level 3)
     */
    generateCutExpensesResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to suggest expense reductions. Please add income and expenses first.';
        }

        try {
            const { expenses, income, topExpenses, fixedExpenses, flexibleSpending, expenseRatio } = context;
            
            if (expenses === 0) {
                return 'You haven\'t added any expenses yet. Add your expenses to get suggestions on reducing them.';
            }

            let response = 'Here are ways to cut expenses:\n\n';
            
            if (topExpenses && topExpenses.length > 0) {
                response += 'Top areas to reduce:\n';
                topExpenses.slice(0, 3).forEach((exp, idx) => {
                    response += `${idx + 1}. ${exp.name}: ₹${exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${exp.percentage.toFixed(1)}% of income)\n`;
                });
            }

            const ratio = parseFloat(expenseRatio || 0);
            if (ratio > 80) {
                response += `\nYour expenses are ${ratio.toFixed(1)}% of income. Aim to reduce this to below 70% for better financial health.`;
            }

            return response;
        } catch (e) {
            console.warn('Cut expenses response failed:', e);
            return 'Review your spending categories and identify non-essential expenses you can reduce.';
        }
    },

    /**
     * Generate HIGHEST_EXPENSE intent response (Level 3)
     */
    generateHighestExpenseResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to identify your highest expenses. Please add income and expenses first.';
        }

        try {
            const { topExpenses, expenses } = context;
            
            if (!topExpenses || topExpenses.length === 0 || expenses === 0) {
                return 'You haven\'t added any expenses yet. Add your expenses to see which categories you spend the most on.';
            }

            let response = 'Your highest spending categories:\n\n';
            topExpenses.slice(0, 5).forEach((exp, idx) => {
                response += `${idx + 1}. ${exp.name}: ₹${exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${exp.percentage.toFixed(1)}% of income)\n`;
            });

            return response;
        } catch (e) {
            console.warn('Highest expense response failed:', e);
            return 'Check your spending categories to see where you spend the most.';
        }
    },

    /**
     * Generate CATEGORY_ANALYSIS intent response (Level 3)
     */
    generateCategoryAnalysisResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to analyze spending by category. Please add expenses first.';
        }

        try {
            const { fixedExpenses, flexibleSpending, fixedExpenseList, flexibleData, income } = context;
            
            if (fixedExpenses === 0 && flexibleSpending === 0) {
                return 'You haven\'t added any expenses yet. Add your fixed expenses and set flexible spending limits to get category-wise insights.';
            }

            let response = 'Here\'s a breakdown of your spending by category:\n\n';
            
            if (fixedExpenses > 0) {
                response += `Fixed Expenses: ₹${fixedExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                if (fixedExpenseList && fixedExpenseList.length > 0) {
                    const sortedFixed = [...fixedExpenseList].sort((a, b) => b.amount - a.amount);
                    sortedFixed.forEach(exp => {
                        const ratio = income > 0 ? ((exp.amount / income) * 100) : 0;
                        response += `  • ${exp.name}: ₹${exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${ratio.toFixed(1)}%)\n`;
                    });
                }
                response += '\n';
            }

            if (flexibleSpending > 0) {
                response += `Flexible Spending: ₹${flexibleSpending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                const categories = Object.entries(flexibleData || {})
                    .filter(([_, amount]) => amount > 0)
                    .sort(([_, a], [__, b]) => b - a);
                
                categories.forEach(([category, amount]) => {
                    const categoryName = category === 'food' ? 'Food & Dining' : 
                                       category === 'travel' ? 'Travel & Transport' : 
                                       category === 'shopping' ? 'Shopping' : 'Miscellaneous';
                    const ratio = income > 0 ? ((amount / income) * 100) : 0;
                    response += `  • ${categoryName}: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${ratio.toFixed(1)}%)\n`;
                });
            }

            return response;
        } catch (e) {
            console.warn('Category analysis response failed:', e);
            return 'Check your spending categories to see how your expenses are distributed.';
        }
    },

    /**
     * Generate SAVINGS_ADVICE intent response (Level 3)
     */
    generateSavingsAdviceResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to provide savings advice. Please add income and expenses first.';
        }

        try {
            const { savings, savingsRate, income, expenses } = context;
            
            if (income === 0 && expenses === 0) {
                return 'Add your income and expenses to get personalized savings advice.';
            }

            let response = 'Savings advice:\n\n';
            const rate = parseFloat(savingsRate || 0);
            
            if (savings > 0) {
                response += `You're saving ₹${savings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month (${rate.toFixed(1)}% of income). `;
                
                if (rate > 20) {
                    response += 'This is excellent! Keep up the good work.';
                } else if (rate > 10) {
                    response += 'This is good. Consider aiming for 15-20% for better financial security.';
                } else {
                    response += 'Try to increase this to at least 10-15% for better financial health.';
                }
            } else {
                response += 'You\'re currently not saving. Focus on reducing expenses or increasing income to start building savings.';
            }

            return response;
        } catch (e) {
            console.warn('Savings advice response failed:', e);
            return 'Aim to save at least 10-20% of your income for better financial security.';
        }
    },

    /**
     * Generate EXPENSE_ANALYSIS intent response (Level 3)
     */
    generateExpenseAnalysisResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to analyze expenses. Please add expenses first.';
        }

        try {
            const { expenses, income, expenseRatio, topExpenses, fixedExpenses, flexibleSpending } = context;
            
            if (expenses === 0) {
                return 'You haven\'t added any expenses yet. Add your expenses to get an analysis.';
            }

            let response = 'Expense analysis:\n\n';
            const ratio = parseFloat(expenseRatio || 0);
            
            response += `Total expenses: ₹${expenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            response += `Expense ratio: ${ratio.toFixed(1)}% of income\n\n`;
            
            if (topExpenses && topExpenses.length > 0) {
                response += 'Top spending areas:\n';
                topExpenses.slice(0, 3).forEach((exp, idx) => {
                    response += `${idx + 1}. ${exp.name}: ${exp.percentage.toFixed(1)}% of income\n`;
                });
            }

            return response;
        } catch (e) {
            console.warn('Expense analysis response failed:', e);
            return 'Review your expenses to understand where your money is going.';
        }
    },

    /**
     * Generate BUDGET_OPTIMIZATION intent response (Level 3)
     */
    generateBudgetOptimizationResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to optimize your budget. Please add income and expenses first.';
        }

        try {
            const { income, expenses, savingsRate, expenseRatio, topExpenses } = context;
            
            if (income === 0 && expenses === 0) {
                return 'Add your income and expenses to get budget optimization suggestions.';
            }

            let response = 'Budget optimization suggestions:\n\n';
            const ratio = parseFloat(expenseRatio || 0);
            const rate = parseFloat(savingsRate || 0);
            
            if (ratio > 80) {
                response += '1. Your expenses are too high. Aim to reduce them to below 70% of income.\n';
            }
            
            if (rate < 10) {
                response += '2. Increase your savings rate to at least 10-15%.\n';
            }
            
            if (topExpenses && topExpenses.length > 0) {
                const top = topExpenses[0];
                if (top.percentage > 25) {
                    response += `3. Reduce spending in ${top.name}, which is ${top.percentage.toFixed(1)}% of income.\n`;
                }
            }

            return response;
        } catch (e) {
            console.warn('Budget optimization response failed:', e);
            return 'Review your budget and aim for expenses below 70% of income and savings above 10%.';
        }
    },

    /**
     * Generate TREND_ANALYSIS intent response (Level 3)
     */
    generateTrendAnalysisResponse(context, monthComparison) {
        if (!context) {
            return 'Based on your data, I need more information to analyze trends. Please add income and expenses first.';
        }

        try {
            const { trends, monthlyData } = context;
            
            if (!trends || !trends.hasTrend) {
                return 'Not enough historical data to analyze trends. Add more income and expenses over time to see trends.';
            }

            let response = 'Spending and income trends:\n\n';
            
            if (trends.expenseTrend === 'increasing') {
                response += `Expenses have increased by ${trends.expenseChangePercent}% recently. `;
            } else if (trends.expenseTrend === 'decreasing') {
                response += `Expenses have decreased by ${trends.expenseChangePercent}% recently. `;
            }
            
            if (monthComparison) {
                response += `\nCompared to last month:\n`;
                response += `Income change: ${monthComparison.incomeChange}%\n`;
                response += `Expense change: ${monthComparison.expenseChange}%\n`;
                response += `Savings change: ${monthComparison.savingsChange}%`;
            }

            return response;
        } catch (e) {
            console.warn('Trend analysis response failed:', e);
            return 'Review your historical data to understand spending and income trends.';
        }
    },

    /**
     * Generate OVERSpending_CHECK intent response (Level 3)
     */
    generateOverspendingCheckResponse(context) {
        if (!context) {
            return 'Based on your data, I need more information to check for overspending. Please add income and expenses first.';
        }

        try {
            const { expenses, income, overspending, savings } = context;
            
            if (income === 0 && expenses === 0) {
                return 'Add your income and expenses to check for overspending.';
            }

            if (expenses > income) {
                let response = `You're overspending by ₹${Math.abs(savings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month.\n\n`;
                
                if (overspending && overspending.length > 0) {
                    response += 'Areas of concern:\n';
                    overspending.slice(0, 3).forEach((insight, idx) => {
                        response += `${idx + 1}. ${insight.message}\n`;
                    });
                }
                
                return response;
            } else {
                return 'Good news! You\'re not overspending. Your expenses are within your income.';
            }
        } catch (e) {
            console.warn('Overspending check response failed:', e);
            return 'Compare your expenses to your income to check if you\'re overspending.';
        }
    },

    /**
     * Get suggested questions (Level 4 - wrapper for compatibility)
     * @param {Object} context - Financial context
     * @returns {Array} Array of 3-4 suggested question strings
     */
    getSuggestedQuestions(context) {
        return this.generateSuggestedQuestions(context);
    },

    /**
     * Generate smart, contextual suggested questions (Level 4 Enhanced)
     * @param {Object} context - Financial context
     * @returns {Array} Array of 3-4 suggested question strings
     */
    generateSuggestedQuestions(context) {
        if (!context) {
            return ['How do I get started?', 'What should I track first?'];
        }

        try {
            const enhancedContext = this.buildFinancialContext(context);
            const { income, expenses, savings, fixedExpenses, flexibleSpending, monthlyData, 
                    financialHealth, expenseRatio, overspending, topExpenses, trends } = enhancedContext;

            const suggestions = [];
            const usedSuggestions = new Set();

            // Track recent suggestions to avoid repetition
            const recentSuggestions = this.getRecentSuggestedQuestions();

            if (income === 0 && expenses === 0) {
                return [
                    'How do I get started?',
                    'What should I track first?',
                    'How does this app work?'
                ];
            }

            // Priority 1: Financial health-based suggestions
            if (financialHealth === 'RISK' || (overspending && overspending.length > 0)) {
                if (!this.wasRecentlySuggested('Where am I overspending?', recentSuggestions)) {
                    suggestions.push('Where am I overspending?');
                    usedSuggestions.add('overspending');
                }
                if (!this.wasRecentlySuggested('How can I reduce my expenses?', recentSuggestions)) {
                    suggestions.push('How can I reduce my expenses?');
                    usedSuggestions.add('reduce');
                }
            }

            // Priority 2: Savings-related (if not overspending)
            if (savings > 0 && !usedSuggestions.has('reduce')) {
                if (!this.wasRecentlySuggested('How much am I saving?', recentSuggestions)) {
                    suggestions.push('How much am I saving?');
                }
                if (parseFloat(expenseRatio) > 80 && !usedSuggestions.has('overspending')) {
                    if (!this.wasRecentlySuggested('Can I save more next month?', recentSuggestions)) {
                        suggestions.push('Can I save more next month?');
                    }
                }
            } else if (savings <= 0) {
                if (!this.wasRecentlySuggested('How can I start saving?', recentSuggestions)) {
                    suggestions.push('How can I start saving?');
                }
            }

            // Priority 3: Category-specific (if expenses exist)
            if ((fixedExpenses > 0 || flexibleSpending > 0) && suggestions.length < 3) {
                if (topExpenses && topExpenses.length > 0 && topExpenses[0].percentage > 20) {
                    if (!this.wasRecentlySuggested('Which category should I reduce?', recentSuggestions)) {
                        suggestions.push('Which category should I reduce?');
                    }
                } else {
                    if (!this.wasRecentlySuggested('Show my spending by category', recentSuggestions)) {
                        suggestions.push('Show my spending by category');
                    }
                }
            }

            // Priority 4: Trend-based (if historical data available)
            if (trends && trends.hasTrend && suggestions.length < 4) {
                if (trends.expenseTrend === 'increasing' && !usedSuggestions.has('reduce')) {
                    if (!this.wasRecentlySuggested('What are my spending trends?', recentSuggestions)) {
                        suggestions.push('What are my spending trends?');
                    }
                }
            }

            // Priority 5: Affordability (if savings exist)
            if (savings > 0 && suggestions.length < 4) {
                const sampleAmount = savings > 10000 ? '₹10,000' : savings > 5000 ? '₹5,000' : '₹2,000';
                if (!this.wasRecentlySuggested(`Can I afford ${sampleAmount}?`, recentSuggestions)) {
                    suggestions.push(`Can I afford ${sampleAmount}?`);
                }
            }

            // Priority 6: Monthly report
            if (income > 0 && expenses > 0 && suggestions.length < 4) {
                if (!this.wasRecentlySuggested('Give me my monthly report', recentSuggestions)) {
                    suggestions.push('Give me my monthly report');
                }
            }

            // Fallback suggestions
            if (suggestions.length < 2) {
                if (!suggestions.some(s => s.includes('saving'))) {
                    suggestions.push('How much am I saving?');
                }
                if (!suggestions.some(s => s.includes('category'))) {
                    suggestions.push('Show my spending by category');
                }
            }

            // Track suggestions for next time
            this.trackSuggestedQuestions(suggestions);

            // Return max 4 suggestions, prioritized
            return suggestions.slice(0, 4);
        } catch (e) {
            console.warn('Smart suggestion generation failed:', e);
            // Fallback to basic suggestions
            return [
                'How much am I saving?',
                'Where am I overspending?',
                'Show my spending by category',
                'Give me my monthly report'
            ].slice(0, 4);
        }
    },

    /**
     * Track suggested questions to avoid repetition
     */
    trackSuggestedQuestions(suggestions) {
        if (!this.suggestionHistory) {
            this.suggestionHistory = [];
        }
        this.suggestionHistory.push({
            suggestions: suggestions,
            timestamp: Date.now()
        });
        
        // Keep only last 5 suggestion sets
        if (this.suggestionHistory.length > 5) {
            this.suggestionHistory = this.suggestionHistory.slice(-5);
        }
    },

    /**
     * Get recently suggested questions
     */
    getRecentSuggestedQuestions() {
        if (!this.suggestionHistory || this.suggestionHistory.length === 0) {
            return [];
        }
        return this.suggestionHistory
            .filter(item => Date.now() - item.timestamp < 300000) // Last 5 minutes
            .flatMap(item => item.suggestions);
    },

    /**
     * Check if suggestion was recently shown
     */
    wasRecentlySuggested(suggestion, recentSuggestions) {
        if (!recentSuggestions || recentSuggestions.length === 0) return false;
        return recentSuggestions.some(recent => 
            recent.toLowerCase().includes(suggestion.toLowerCase().slice(0, 10)) ||
            suggestion.toLowerCase().includes(recent.toLowerCase().slice(0, 10))
        );
    },

    /**
     * Generate AI dashboard summary with proactive insights
     * @param {Object} context - Financial context
     * @returns {string} Summary text
     */
    generateDashboardSummary(context) {
        const { income, expenses, savings, fixedExpenses, flexibleSpending, monthlyData } = context;

        if (income === 0 && expenses === 0) {
            return 'Add your income and expenses to get personalized financial insights.';
        }

        const summary = [];
        const ratio = income > 0 ? ((expenses / income) * 100) : 0;
        const savingsRate = income > 0 ? (((income - expenses) / income) * 100) : 0;

        // Main financial health statement (proactive and website-aware)
        if (expenses > income) {
            summary.push(`Based on your data, you're currently overspending by ₹${Math.abs(savings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month.`);
        } else if (ratio > 85) {
            summary.push(`Based on your data, your expenses use ${ratio.toFixed(0)}% of your income, leaving little room for savings.`);
        } else if (ratio < 50) {
            summary.push(`Based on your data, you're saving ${savingsRate.toFixed(0)}% of your income, which is excellent.`);
        } else {
            summary.push(`Based on your data, you're saving ₹${savings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month (${savingsRate.toFixed(0)}% of income).`);
        }

        // Add proactive insights (silent, text-only)
        const proactiveInsights = this.generateProactiveInsights(context);
        if (proactiveInsights.length > 0) {
            summary.push(proactiveInsights[0]); // Show most relevant proactive insight
        }

        // Add trend insight
        const trends = this.analyzeTrends(monthlyData);
        if (trends.hasTrend && !proactiveInsights.some(insight => insight.includes('increased') || insight.includes('decreased'))) {
            if (trends.expenseTrend === 'increasing') {
                summary.push(`Your expenses have increased by ${trends.expenseChangePercent}% recently.`);
            } else if (trends.expenseTrend === 'decreasing') {
                summary.push(`Your expenses have decreased by ${trends.expenseChangePercent}% recently - great progress!`);
            }
        }

        // Add category insight (website-aware)
        if (fixedExpenses > 0 || flexibleSpending > 0) {
            const totalExpenses = fixedExpenses + flexibleSpending;
            if (fixedExpenses > flexibleSpending * 1.5 && income > 0) {
                const fixedRatio = (fixedExpenses / income) * 100;
                if (fixedRatio > 40) {
                    summary.push(`Your fixed expenses are ${fixedRatio.toFixed(0)}% of your income.`);
                }
            } else if (flexibleSpending > fixedExpenses * 1.5) {
                summary.push(`Your flexible spending (₹${flexibleSpending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) is higher than fixed expenses.`);
            }
        }

        return summary.join(' ');
    },

    /**
     * Generate monthly financial report
     * @param {Object} context - Financial context
     * @param {string} monthKey - Optional month key (YYYY-MM), defaults to current month
     * @returns {Object} Monthly report
     */
    generateMonthlyReport(context, monthKey = null) {
        const { income, expenses, savings, fixedExpenses, flexibleSpending, fixedExpenseList, flexibleData, monthlyData, history } = context;

        const now = new Date();
        const targetMonth = monthKey || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthData = monthlyData[targetMonth] || { income: 0, expenses: 0 };

        const report = {
            month: targetMonth,
            totalIncome: income,
            totalExpenses: expenses,
            totalSavings: savings,
            savingsRate: income > 0 ? (((income - expenses) / income) * 100).toFixed(1) : 0,
            fixedExpenses: fixedExpenses,
            flexibleSpending: flexibleSpending,
            bestCategory: null,
            worstCategory: null,
            insights: [],
            suggestions: []
        };

        // Find best category (lowest spending relative to budget)
        const flexibleEntries = Object.entries(flexibleData).filter(([_, amount]) => amount > 0);
        if (flexibleEntries.length > 0) {
            const sorted = flexibleEntries.sort(([_, a], [__, b]) => a - b);
            const [bestCat, bestAmount] = sorted[0];
            const categoryName = bestCat === 'food' ? 'Food & Dining' : 
                               bestCat === 'travel' ? 'Travel & Transport' : 
                               bestCat === 'shopping' ? 'Shopping' : 'Miscellaneous';
            report.bestCategory = { name: categoryName, amount: bestAmount };
        }

        // Find worst category (highest spending)
        if (flexibleEntries.length > 0) {
            const sorted = flexibleEntries.sort(([_, a], [__, b]) => b - a);
            const [worstCat, worstAmount] = sorted[0];
            const categoryName = worstCat === 'food' ? 'Food & Dining' : 
                               worstCat === 'travel' ? 'Travel & Transport' : 
                               worstCat === 'shopping' ? 'Shopping' : 'Miscellaneous';
            report.worstCategory = { name: categoryName, amount: worstAmount };
        }

        // Generate insights
        if (savings > 0) {
            report.insights.push(`You saved ₹${savings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month.`);
        } else {
            report.insights.push(`You spent ₹${Math.abs(savings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more than you earned this month.`);
        }

        if (report.savingsRate > 20) {
            report.insights.push(`Your savings rate of ${report.savingsRate}% is excellent!`);
        } else if (report.savingsRate < 10 && income > 0) {
            report.insights.push(`Your savings rate of ${report.savingsRate}% could be improved.`);
        }

        if (report.bestCategory) {
            report.insights.push(`You managed ${report.bestCategory.name} spending well at ₹${report.bestCategory.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
        }

        // Generate suggestions
        if (expenses > income) {
            report.suggestions.push('Focus on reducing expenses to stop overspending.');
        }

        if (report.worstCategory && income > 0) {
            const categoryRatio = (report.worstCategory.amount / income) * 100;
            if (categoryRatio > 20) {
                report.suggestions.push(`Consider reducing ${report.worstCategory.name} spending, which is ${categoryRatio.toFixed(1)}% of your income.`);
            }
        }

        if (report.savingsRate < 15 && income > 0) {
            report.suggestions.push('Aim to save at least 15-20% of your income for better financial security.');
        }

        if (report.suggestions.length === 0 && savings > 0) {
            report.suggestions.push('You\'re doing well! Keep maintaining your current spending habits.');
        }

        return report;
    },

    /**
     * Extract conversation context from recent history
     * @returns {Object} Context object with relevant information
     */
    extractConversationContext() {
        const context = {
            lastTopic: null,
            mentionedCategories: [],
            mentionedAmounts: [],
            lastAnalysis: null,
            questionsAboutSavings: false,
            questionsAboutExpenses: false,
            questionsAboutIncome: false
        };

        // Analyze last 6 messages (3 user + 3 assistant)
        const recent = this.chatHistory.slice(-6);
        
        for (const msg of recent) {
            if (msg.role === 'user') {
                const q = msg.message.toLowerCase();
                
                // Track topics
                if (q.includes('saving') || q.includes('save')) {
                    context.questionsAboutSavings = true;
                    context.lastTopic = 'savings';
                }
                if (q.includes('expense') || q.includes('spending')) {
                    context.questionsAboutExpenses = true;
                    context.lastTopic = 'expenses';
                }
                if (q.includes('income')) {
                    context.questionsAboutIncome = true;
                    context.lastTopic = 'income';
                }

                // Extract mentioned amounts
                const amountMatch = msg.message.match(/₹?\s*(\d+(?:[.,]\d+)?)\s*(?:lakh|lakhs|crore|crores|thousand|thousands|k)?/i);
                if (amountMatch) {
                    let num = parseFloat(amountMatch[1].replace(/,/g, ''));
                    if (q.includes('lakh')) num *= 100000;
                    else if (q.includes('crore')) num *= 10000000;
                    else if (q.includes('thousand') || q.includes('k')) num *= 1000;
                    context.mentionedAmounts.push(num);
                }

                // Extract categories
                if (q.includes('category') || q.includes('food') || q.includes('travel') || q.includes('shopping')) {
                    if (q.includes('food')) context.mentionedCategories.push('Food & Dining');
                    if (q.includes('travel')) context.mentionedCategories.push('Travel & Transport');
                    if (q.includes('shopping')) context.mentionedCategories.push('Shopping');
                }
            } else if (msg.role === 'assistant') {
                // Store last analysis for reference
                if (msg.message.includes('Based on your data') || msg.message.includes('Your')) {
                    context.lastAnalysis = msg.message;
                }
            }
        }

        return context;
    },

    /**
     * Generate proactive insights based on financial data
     * @param {Object} context - Financial context
     * @returns {Array} Array of proactive insight strings
     */
    /**
     * Generate proactive insights (Level 4 Enhanced)
     * @param {Object} context - Financial context
     * @returns {Array} Array of 1-3 human-readable insights
     */
    generateProactiveInsights(context) {
        if (!context) return [];

        try {
            const insights = [];
            const { income, expenses, savings, fixedExpenses, flexibleSpending, fixedExpenseList, flexibleData, monthlyData } = context;

            if (income === 0 && expenses === 0) {
                return [];
            }

            const expenseRatio = income > 0 ? ((expenses / income) * 100) : 0;
            const savingsRate = income > 0 ? (((income - expenses) / income) * 100) : 0;

            // Priority 1: Overspending alert (most critical)
            if (expenses > income) {
                insights.push(`You're currently spending ₹${Math.abs(savings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more than you earn. Consider reviewing your expenses.`);
            }

            // Priority 2: Savings rate insights
            if (insights.length < 3 && savingsRate > 0) {
                if (savingsRate > 20) {
                    insights.push(`Great job! You're saving ${savingsRate.toFixed(1)}% of your income, which is excellent.`);
                } else if (savingsRate < 10 && expenseRatio < 90) {
                    insights.push(`Your savings rate is ${savingsRate.toFixed(1)}%. Consider ways to increase it for better financial security.`);
                }
            }

            // Priority 3: Trend-based insights
            if (insights.length < 3) {
                const trends = this.analyzeTrends(monthlyData);
                if (trends.hasTrend) {
                    if (trends.expenseTrend === 'increasing' && parseFloat(trends.expenseChangePercent) > 10) {
                        insights.push(`Your expenses have increased by ${trends.expenseChangePercent}% recently. Keep an eye on this trend.`);
                    } else if (trends.expenseTrend === 'decreasing' && parseFloat(trends.expenseChangePercent) > 10) {
                        insights.push(`Your expenses decreased by ${trends.expenseChangePercent}% recently - great progress!`);
                    }
                }
            }

            // Priority 4: Category concentration risk
            if (insights.length < 3 && income > 0 && fixedExpenseList.length > 0) {
                const topFixed = fixedExpenseList.reduce((max, e) => e.amount > max.amount ? e : max, fixedExpenseList[0]);
                const topRatio = (topFixed.amount / income) * 100;
                if (topRatio > 40) {
                    insights.push(`${topFixed.name} is ${topRatio.toFixed(1)}% of your income. This high concentration could impact your financial flexibility.`);
                }
            }

            // Priority 5: Month-to-month savings comparison
            if (insights.length < 3 && monthlyData && Object.keys(monthlyData).length > 1) {
                const months = Object.keys(monthlyData).sort();
                const lastMonth = months[months.length - 1];
                const prevMonth = months[months.length - 2];
                
                if (monthlyData[lastMonth] && monthlyData[prevMonth]) {
                    const lastSavings = monthlyData[lastMonth].income - monthlyData[lastMonth].expenses;
                    const prevSavings = monthlyData[prevMonth].income - monthlyData[prevMonth].expenses;
                    
                    if (prevSavings > 0 && lastSavings < prevSavings * 0.7 && lastSavings > 0) {
                        const drop = ((prevSavings - lastSavings) / prevSavings) * 100;
                        insights.push(`Your savings decreased by ${drop.toFixed(0)}% compared to last month.`);
                    }
                }
            }

            // Return 1-3 insights (most important first)
            return insights.slice(0, 3);
        } catch (e) {
            console.warn('Proactive insights generation failed:', e);
            return []; // Never throw, return empty array
        }
    },

    /**
     * Provide guidance when user adds income or expenses
     * @param {string} type - 'income' or 'expense'
     * @param {number} amount - The amount being added
     * @param {Object} context - Financial context
     * @returns {string|null} Guidance message or null
     */
    generateActionGuidance(type, amount, context) {
        if (!context || !amount || amount <= 0) return null;

        const { income, expenses, savings } = context;

        if (type === 'income') {
            const newIncome = income + amount;
            const newRatio = expenses > 0 ? ((expenses / newIncome) * 100) : 0;
            
            if (newRatio < 50) {
                return `Adding this income will improve your savings rate significantly. Based on your data, you'll save ${((newIncome - expenses) / newIncome * 100).toFixed(0)}% of your income.`;
            } else if (newRatio < 80) {
                return `Adding this income will help your financial situation. You may want to consider that you'll still be spending ${newRatio.toFixed(0)}% of your income.`;
            }
        } else if (type === 'expense') {
            const newExpenses = expenses + amount;
            
            if (newExpenses > income) {
                const overspend = newExpenses - income;
                return `Based on your data, adding this expense would result in overspending by ₹${overspend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. You may want to consider adjusting other expenses or increasing income.`;
            }
            
            const newRatio = income > 0 ? ((newExpenses / income) * 100) : 0;
            if (newRatio > 85) {
                return `Adding this expense will use ${newRatio.toFixed(0)}% of your income, leaving little room for savings. This could help improve your financial planning.`;
            }
        }

        return null;
    },

    /**
     * Check if question is a follow-up to previous conversation
     * @param {string} question - Current question
     * @param {Object} convContext - Conversation context
     * @returns {boolean} True if follow-up
     */
    isFollowUpQuestion(question, convContext) {
        if (!question || typeof question !== 'string' || !convContext) {
            return false;
        }

        try {
            const q = question.toLowerCase();
            
            // Follow-up indicators
            const followUpKeywords = ['what about', 'how about', 'what should', 'and', 'also', 'what else', 'tell me more'];
            const hasFollowUpKeyword = followUpKeywords.some(keyword => q.includes(keyword));
            
            // Questions without main topic indicators but with context
            const hasContext = convContext.lastTopic !== null && (
                (q.includes('what') || q.includes('how') || q.includes('which') || q.includes('should')) &&
                !q.includes('income') && !q.includes('expense') && !q.includes('saving')
            );
            
            return hasFollowUpKeyword || hasContext;
        } catch (e) {
            console.warn('Error in isFollowUpQuestion:', e);
            return false;
        }
    },

    /**
     * Handle follow-up questions with conversation context
     * @param {string} question - Current question
     * @param {Object} convContext - Conversation context
     * @param {Object} financialContext - Financial context
     * @returns {string|null} Context-aware response or null
     */
    handleFollowUpQuestion(question, convContext, financialContext) {
        if (!question || typeof question !== 'string' || !convContext || !financialContext) {
            return null;
        }

        try {
            const q = question.toLowerCase();
            const { income, expenses, savings, fixedExpenses, flexibleSpending, fixedExpenseList, flexibleData } = financialContext;
            
            // "What should I reduce?" after savings/overspending questions
            if ((q.includes('what should') || q.includes('which should')) && (q.includes('reduce') || q.includes('cut'))) {
                if (convContext.questionsAboutSavings || convContext.lastTopic === 'savings') {
                    const overspending = this.identifyOverspending(financialContext);
                    if (overspending.length > 0) {
                        let response = 'Based on your previous question about savings, here are the categories you may want to consider reducing:\n\n';
                        
                        overspending.slice(0, 3).forEach((insight, idx) => {
                            response += `${idx + 1}. ${insight.category || 'Overall expenses'}: This area is consuming a significant portion of your income.\n`;
                        });
                        
                        // Add website-aware suggestion
                        if (income > 0) {
                            const fixedRatio = (fixedExpenses / income) * 100;
                            const flexibleRatio = (flexibleSpending / income) * 100;
                            
                            if (fixedRatio > flexibleRatio && fixedRatio > 50) {
                                response += `\nYour fixed expenses are ${fixedRatio.toFixed(0)}% of income. Review if any can be renegotiated or reduced.`;
                            } else if (flexibleRatio > 30) {
                                response += `\nYour flexible spending is ${flexibleRatio.toFixed(0)}% of income. You may want to consider setting lower budgets for non-essential categories.`;
                            }
                        }
                        
                        return response;
                    }
                }
            }
            
            // "How can I improve?" after expense/income questions
            if (q.includes('how') && (q.includes('improve') || q.includes('better'))) {
                if (convContext.lastTopic) {
                    if (convContext.lastTopic === 'savings') {
                        // Reuse existing save more logic
                        if (savings <= 0) {
                            return 'Based on your data, to start saving, you need to either reduce expenses or increase income. Your expenses currently equal or exceed your income. You may want to review your spending categories to find areas where you can cut back.';
                        }
                        return `Based on your data, you're currently saving ₹${savings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month. You may want to consider finding ways to increase your savings rate for better financial security.`;
                    } else if (convContext.lastTopic === 'expenses') {
                        const overspending = this.identifyOverspending(financialContext);
                        if (overspending.length > 0) {
                            return `Based on your data, here are areas where you might be overspending: ${overspending[0].message}`;
                        }
                    }
                }
            }
            
            // "Tell me more" or "What else" - expand on last topic
            if (q.includes('tell me more') || q.includes('what else') || q.includes('and')) {
                if (convContext.lastTopic === 'savings') {
                    return `Based on your data, your savings of ₹${savings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} represents ${income > 0 ? (((savings / income) * 100).toFixed(1)) : 0}% of your income. You may want to consider ways to protect and grow this amount.`;
                } else if (convContext.lastTopic === 'expenses') {
                    const overspending = this.identifyOverspending(financialContext);
                    if (overspending.length > 0) {
                        return `You asked about expenses earlier. Based on your data, ${overspending[0].message} This could impact your ability to save.`;
                    }
                }
            }
            
            return null;
        } catch (e) {
            console.warn('Error in handleFollowUpQuestion:', e);
            return null;
        }
    },

    /**
     * Apply safe response framework - make responses supportive and non-advice
     * @param {string} response - Original response
     * @returns {string} Sanitized response
     */
    /**
     * Apply safe response framework (Level 5 Enhanced)
     * @param {string} response - Response text
     * @returns {string} Safe response
     */
    applySafeResponseFramework(response) {
        if (!response || typeof response !== 'string') {
            return response || 'I can help you understand your finances. Please ask me a question.';
        }

        try {
            // Level 5: Apply AI safety filters first (if not already applied)
            let safeResponse = this.applyAISafetyFilters(response);

            // Replace absolute commands with suggestions
            safeResponse = safeResponse
                .replace(/You must/gi, 'You may want to')
                .replace(/You should/gi, 'Based on your data, you may want to')
                .replace(/You need to/gi, 'This could help')
                .replace(/You have to/gi, 'Consider')
                .replace(/Always/gi, 'You may want to consider')
                .replace(/Never/gi, 'It may be helpful to avoid')
                .replace(/guaranteed/gi, 'potentially')
                .replace(/will definitely/gi, 'may');

            // Ensure we're not giving investment advice
            if (safeResponse.includes('invest') || safeResponse.includes('investment')) {
                safeResponse = safeResponse.replace(/invest[^.]*/gi, 'consult with a financial advisor about investments');
            }

            // Remove any remaining absolute guarantees
            safeResponse = safeResponse.replace(/guarantee/gi, 'potential');
            safeResponse = safeResponse.replace(/certain/gi, 'likely');

            return safeResponse;
        } catch (e) {
            console.warn('Error in applySafeResponseFramework:', e);
            return response; // Return original if sanitization fails
        }
    },

    /**
     * Initialize voice recognition (Level 6)
     */
    initVoiceRecognition() {
        try {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.lang = this.currentLanguage;
                
                this.recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    if (transcript && transcript.trim()) {
                        // Auto-detect language and process message
                        this.processVoiceInput(transcript);
                    }
                };
                
                this.recognition.onerror = (event) => {
                    // Silently handle errors - fall back to text input
                    this.isListening = false;
                };
                
                this.recognition.onend = () => {
                    this.isListening = false;
                };
            }
        } catch (e) {
            // Voice recognition not available - gracefully degrade
            this.recognition = null;
        }
    },

    /**
     * Initialize speech synthesis (Level 6)
     */
    initSpeechSynthesis() {
        try {
            if ('speechSynthesis' in window) {
                this.synthesis = window.speechSynthesis;
            }
        } catch (e) {
            // Speech synthesis not available
            this.synthesis = null;
        }
    },

    /**
     * Start voice input (Level 6)
     * @returns {Promise<string|null>} Transcribed text or null
     */
    async startVoiceInput() {
        if (!this.recognition) {
            return null; // Voice not available
        }

        if (this.isListening) {
            this.stopVoiceInput();
            return null;
        }

        try {
            this.isListening = true;
            this.recognition.lang = this.currentLanguage;
            this.recognition.start();
            return null; // Will return via callback
        } catch (e) {
            this.isListening = false;
            return null;
        }
    },

    /**
     * Stop voice input (Level 6)
     */
    stopVoiceInput() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore errors
            }
            this.isListening = false;
        }
    },

    /**
     * Process voice input with language detection (Level 6)
     * @param {string} transcript - Voice transcript
     */
    async processVoiceInput(transcript) {
        if (!transcript || typeof transcript !== 'string') return;

        try {
            // Detect language
            const detectedLang = this.detectLanguage(transcript);
            if (detectedLang !== this.currentLanguage) {
                this.currentLanguage = detectedLang;
                this.userAIMemory.languagePreference = detectedLang;
                this.saveUserMemory();
            }

            // Process as regular message (with fail-safe)
            let response;
            try {
                response = await this.processMessage(transcript);
            } catch (e) {
                // Fall back to simple response
                response = 'I heard you, but encountered an issue. Please try typing your question.';
            }
            
            // Speak response if voice is enabled (with fail-safe)
            if (response && this.userAIMemory.voiceEnabled && this.synthesis) {
                try {
                    this.speakResponse(response, this.currentLanguage);
                } catch (e) {
                    // Voice output failed - text response still works
                }
            }
        } catch (e) {
            // Complete fallback - ensure text input still works
        }
    },

    /**
     * Detect input language (Level 6)
     * @param {string} text - Input text
     * @returns {string} Language code
     */
    detectLanguage(text) {
        if (!text || typeof text !== 'string') return 'en-IN';

        try {
            // Simple keyword-based detection
            const hindiPattern = /[\u0900-\u097F]/;
            const tamilPattern = /[\u0B80-\u0BFF]/;
            
            if (hindiPattern.test(text)) {
                return 'hi-IN';
            } else if (tamilPattern.test(text)) {
                return 'ta-IN';
            }
            
            // Check for common Hindi/Tamil words
            const hindiWords = ['कैसे', 'कितना', 'क्या', 'मेरा', 'आपका'];
            const tamilWords = ['எப்படி', 'எவ்வளவு', 'என்ன', 'என்', 'உங்கள்'];
            
            const lowerText = text.toLowerCase();
            if (hindiWords.some(word => lowerText.includes(word))) {
                return 'hi-IN';
            }
            if (tamilWords.some(word => lowerText.includes(word))) {
                return 'ta-IN';
            }
            
            // Default to user preference or English
            return this.userAIMemory.languagePreference || 'en-IN';
        } catch (e) {
            return 'en-IN'; // Safe fallback
        }
    },

    /**
     * Speak AI response (Level 6)
     * @param {string} text - Text to speak
     * @param {string} lang - Language code
     */
    speakResponse(text, lang = null) {
        if (!this.synthesis || !text || typeof text !== 'string') return;

        try {
            // Cancel any ongoing speech
            if (this.synthesis.speaking) {
                this.synthesis.cancel();
            }

            // Limit text length for speech (prevent long responses)
            const speechText = text.length > 500 ? text.substring(0, 500) + '...' : text;

            const utterance = new SpeechSynthesisUtterance(speechText);
            utterance.lang = lang || this.currentLanguage || 'en-IN';
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;

            utterance.onerror = () => {
                // Silently handle errors - text response still works
            };

            utterance.onend = () => {
                // Speech completed successfully
            };

            this.synthesis.speak(utterance);
        } catch (e) {
            // Silently fail - text response still works
        }
    },

    /**
     * Translate response to user's language (Level 6)
     * @param {string} text - English text
     * @param {string} targetLang - Target language code
     * @returns {string} Translated or original text
     */
    translateResponse(text, targetLang) {
        if (!text || typeof text !== 'string' || targetLang === 'en-IN' || !targetLang) {
            return text;
        }

        try {
            // Simple keyword translations for common phrases
            const translations = {
                'hi-IN': {
                    'Based on your data': 'आपके डेटा के आधार पर',
                    'Your total income': 'आपकी कुल आय',
                    'You spent': 'आपने खर्च किया',
                    'and saved': 'और बचाया',
                    'Your expenses': 'आपके खर्च',
                    'savings rate': 'बचत दर',
                    'per month': 'प्रति माह',
                    'Here\'s your': 'यहाँ आपका',
                    'monthly report': 'मासिक रिपोर्ट',
                    'I can help': 'मैं मदद कर सकता हूँ',
                    'Please ask': 'कृपया पूछें',
                    'You\'re saving': 'आप बचा रहे हैं',
                    'Your savings': 'आपकी बचत',
                    'expenses': 'खर्च',
                    'income': 'आय'
                },
                'ta-IN': {
                    'Based on your data': 'உங்கள் தரவுகளின் அடிப்படையில்',
                    'Your total income': 'உங்கள் மொத்த வருமானம்',
                    'You spent': 'நீங்கள் செலவழித்தீர்கள்',
                    'and saved': 'மற்றும் சேமித்தீர்கள்',
                    'Your expenses': 'உங்கள் செலவுகள்',
                    'savings rate': 'சேமிப்பு விகிதம்',
                    'per month': 'மாதத்திற்கு',
                    'Here\'s your': 'இங்கே உங்கள்',
                    'monthly report': 'மாதாந்திர அறிக்கை',
                    'I can help': 'நான் உதவ முடியும்',
                    'Please ask': 'தயவுசெய்து கேளுங்கள்',
                    'You\'re saving': 'நீங்கள் சேமிக்கிறீர்கள்',
                    'Your savings': 'உங்கள் சேமிப்பு',
                    'expenses': 'செலவுகள்',
                    'income': 'வருமானம்'
                }
            };

            const langTranslations = translations[targetLang] || {};
            if (Object.keys(langTranslations).length === 0) {
                return text; // No translations available
            }

            let translated = text;
            
            // Replace translations (case-insensitive)
            Object.keys(langTranslations).forEach(english => {
                const regex = new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                translated = translated.replace(regex, langTranslations[english]);
            });

            return translated;
        } catch (e) {
            return text; // Return original on error
        }
    },

    /**
     * Load user memory from localStorage (Level 6)
     */
    loadUserMemory() {
        try {
            if (typeof AuthManager !== 'undefined' && AuthManager.currentUser && AuthManager.currentUser.uid) {
                const userId = AuthManager.currentUser.uid;
                const memoryKey = `ai_memory_${userId}`;
                const stored = localStorage.getItem(memoryKey);
                
                if (stored) {
                    const parsed = JSON.parse(stored);
                    this.userAIMemory = { ...this.userAIMemory, ...parsed };
                    this.currentLanguage = this.userAIMemory.languagePreference || 'en-IN';
                }
            }
        } catch (e) {
            // Use defaults if loading fails
        }
    },

    /**
     * Save user memory to localStorage (Level 6)
     */
    saveUserMemory() {
        try {
            if (typeof AuthManager !== 'undefined' && AuthManager.currentUser && AuthManager.currentUser.uid) {
                const userId = AuthManager.currentUser.uid;
                const memoryKey = `ai_memory_${userId}`;
                localStorage.setItem(memoryKey, JSON.stringify(this.userAIMemory));
            }
        } catch (e) {
            // Silently fail - memory is optional
        }
    },

    /**
     * Update user memory preference (Level 6)
     * @param {string} key - Preference key
     * @param {*} value - Preference value
     */
    updateUserMemory(key, value) {
        if (key && this.userAIMemory.hasOwnProperty(key)) {
            this.userAIMemory[key] = value;
            this.saveUserMemory();
        }
    },

    /**
     * Initialize smart financial alerts (Level 6)
     */
    initSmartAlerts() {
        // Run alerts check periodically (every 5 minutes)
        setInterval(() => {
            this.checkFinancialAlerts();
        }, 300000); // 5 minutes

        // Run immediately on init
        setTimeout(() => {
            this.checkFinancialAlerts();
        }, 2000);
    },

    /**
     * Check financial alerts (Level 6)
     * @returns {Array} Array of alert objects
     */
    checkFinancialAlerts() {
        const alerts = [];
        
        try {
            const context = this.getUserFinancialContext();
            if (!context) return alerts;

            const { income, expenses, savings, savingsRate, fixedExpenses, flexibleSpending, monthlyData } = context;
            
            // Alert 1: Overspending detection
            if (expenses > income) {
                alerts.push({
                    type: 'overspending',
                    severity: 'high',
                    message: `You're spending ₹${Math.abs(savings).toLocaleString('en-IN')} more than you earn this month.`,
                    suggestion: 'Consider reviewing your expenses and reducing non-essential spending.'
                });
            }

            // Alert 2: Low savings detection
            const rate = parseFloat(savingsRate || 0);
            if (income > 0 && rate < 10 && savings > 0) {
                alerts.push({
                    type: 'low_savings',
                    severity: 'medium',
                    message: `Your savings rate is ${rate.toFixed(1)}%, which is below recommended levels.`,
                    suggestion: 'Aim to save at least 10-20% of your income for better financial security.'
                });
            }

            // Alert 3: Income instability detection
            if (monthlyData && Object.keys(monthlyData).length >= 2) {
                const months = Object.keys(monthlyData).sort();
                const recent = months.slice(-3);
                const incomes = recent.map(m => monthlyData[m].income || 0);
                const avgIncome = incomes.reduce((a, b) => a + b, 0) / incomes.length;
                const variance = incomes.reduce((sum, inc) => sum + Math.pow(inc - avgIncome, 2), 0) / incomes.length;
                const stdDev = Math.sqrt(variance);
                
                if (avgIncome > 0 && (stdDev / avgIncome) > 0.3) {
                    alerts.push({
                        type: 'income_instability',
                        severity: 'medium',
                        message: 'Your income shows significant variation across recent months.',
                        suggestion: 'Consider building a larger emergency fund to handle income fluctuations.'
                    });
                }
            }

            // Alert 4: High expense ratio
            const expenseRatio = income > 0 ? ((expenses / income) * 100) : 0;
            if (expenseRatio > 85 && income > 0) {
                alerts.push({
                    type: 'high_expense_ratio',
                    severity: 'medium',
                    message: `Your expenses are ${expenseRatio.toFixed(1)}% of your income, leaving little room for savings.`,
                    suggestion: 'Review your spending categories and identify areas to reduce expenses.'
                });
            }

            // Store alerts in memory for AI context
            this.userAIMemory.lastAlertCheck = Date.now();
            this.userAIMemory.activeAlerts = alerts;
            this.saveUserMemory();

            return alerts;
        } catch (e) {
            return alerts; // Return empty array on error
        }
    },

    /**
     * Get active financial alerts (Level 6)
     * @returns {Array} Active alerts
     */
    getActiveAlerts() {
        return this.userAIMemory.activeAlerts || [];
    },

    /**
     * Enhance AI context with alerts and memory (Level 8 Enhanced)
     * @param {Object} baseContext - Base financial context
     * @returns {Object} Enhanced context
     */
    enhanceContextWithMemory(baseContext) {
        if (!baseContext) return baseContext;

        try {
            // Level 8: Update goal progress before including in context
            if (this.financialGoals && this.financialGoals.length > 0) {
                this.financialGoals = this.financialGoals.map(goal => this.updateGoalProgress(goal));
                this.saveFinancialGoals();
            }

            return {
                ...baseContext,
                userMemory: {
                    languagePreference: this.userAIMemory.languagePreference,
                    responseStyle: this.userAIMemory.responseStyle,
                    savingsGoal: this.userAIMemory.savingsGoal,
                    riskTolerance: this.userAIMemory.riskTolerance
                },
                activeAlerts: this.getActiveAlerts(),
                // Level 8: Include active goals in context
                activeGoals: this.getActiveGoals()
            };
        } catch (e) {
            return baseContext; // Return original on error
        }
    },

    // ============================================
    // LEVEL 8: GOAL-BASED FINANCIAL PLANNING
    // ============================================

    /**
     * Get user-specific goals storage key (Level 8)
     * @returns {string} Storage key
     */
    _getGoalsStorageKey() {
        try {
            if (typeof AuthManager !== 'undefined' && AuthManager.currentUser && AuthManager.currentUser.uid) {
                return `finance_goals_${AuthManager.currentUser.uid}`;
            }
            return 'finance_goals_guest';
        } catch (e) {
            return 'finance_goals_guest';
        }
    },

    /**
     * Load financial goals from localStorage (Level 8)
     */
    loadFinancialGoals() {
        try {
            const key = this._getGoalsStorageKey();
            const stored = localStorage.getItem(key);
            if (stored) {
                this.financialGoals = JSON.parse(stored);
                // Validate and update progress for all goals
                this.financialGoals = this.financialGoals.map(goal => this.updateGoalProgress(goal));
                this.saveFinancialGoals();
            } else {
                this.financialGoals = [];
            }
        } catch (e) {
            console.warn('Failed to load financial goals:', e);
            this.financialGoals = [];
        }
    },

    /**
     * Save financial goals to localStorage (Level 8)
     */
    saveFinancialGoals() {
        try {
            const key = this._getGoalsStorageKey();
            localStorage.setItem(key, JSON.stringify(this.financialGoals || []));
        } catch (e) {
            console.warn('Failed to save financial goals:', e);
        }
    },

    /**
     * Create a new financial goal (Level 8)
     * @param {string} name - Goal name
     * @param {number} targetAmount - Target amount in INR
     * @param {number} durationMonths - Duration in months
     * @returns {Object} Created goal object
     */
    createFinancialGoal(name, targetAmount, durationMonths) {
        if (!name || !targetAmount || !durationMonths || targetAmount <= 0 || durationMonths <= 0) {
            return null;
        }

        try {
            // Level 8: Check for duplicate names
            const trimmedName = name.trim();
            const existingGoals = this.financialGoals || [];
            const duplicate = existingGoals.find(g => 
                g.name.toLowerCase() === trimmedName.toLowerCase() && 
                (g.status === 'active' || g.status === 'behind')
            );
            if (duplicate) {
                return null; // Duplicate found, return null to indicate failure
            }

            const monthlyRequirement = targetAmount / durationMonths;
            const goal = {
                id: Date.now().toString(),
                name: trimmedName,
                targetAmount: parseFloat(targetAmount),
                durationMonths: parseInt(durationMonths),
                monthlyRequirement: parseFloat(monthlyRequirement.toFixed(2)),
                createdAt: Date.now(),
                amountSaved: 0,
                remainingAmount: targetAmount,
                completionPercentage: 0,
                status: 'active' // active, completed, behind
            };

            this.financialGoals.push(goal);
            this.saveFinancialGoals();
            
            // Level 8: Trigger Goals page update if visible
            if (typeof window.renderGoalsPage === 'function') {
                setTimeout(() => {
                    try {
                        window.renderGoalsPage();
                    } catch (e) {
                        // Silent fail - page update is optional
                    }
                }, 100);
            }
            
            return goal;
        } catch (e) {
            console.warn('Failed to create financial goal:', e);
            return null;
        }
    },

    /**
     * Update goal progress based on current savings (Level 8)
     * @param {Object} goal - Goal object
     * @returns {Object} Updated goal object
     */
    updateGoalProgress(goal) {
        if (!goal) return goal;

        try {
            const context = this.getUserFinancialContext();
            if (!context) return goal;

            const { savings } = context;
            const monthsElapsed = Math.floor((Date.now() - goal.createdAt) / (1000 * 60 * 60 * 24 * 30));
            const expectedSaved = goal.monthlyRequirement * Math.max(1, monthsElapsed);
            
            // Use actual savings if available, otherwise use expected
            goal.amountSaved = Math.min(savings, goal.targetAmount);
            goal.remainingAmount = Math.max(0, goal.targetAmount - goal.amountSaved);
            goal.completionPercentage = Math.min(100, (goal.amountSaved / goal.targetAmount) * 100);
            
            // Update status
            if (goal.completionPercentage >= 100) {
                goal.status = 'completed';
            } else if (goal.amountSaved < expectedSaved * 0.8) {
                goal.status = 'behind';
            } else {
                goal.status = 'active';
            }

            return goal;
        } catch (e) {
            console.warn('Failed to update goal progress:', e);
            return goal;
        }
    },

    /**
     * Get active financial goals (Level 8)
     * @returns {Array} Active goals
     */
    getActiveGoals() {
        try {
            return this.financialGoals.filter(g => g.status === 'active' || g.status === 'behind');
        } catch (e) {
            return [];
        }
    },

    /**
     * Extract goal parameters from user message (Level 8)
     * @param {string} message - User message
     * @returns {Object|null} Extracted goal parameters
     */
    extractGoalFromMessage(message) {
        if (!message || typeof message !== 'string') return null;

        try {
            const q = message.toLowerCase();
            let name = 'Savings Goal';
            let targetAmount = null;
            let durationMonths = null;

            // Extract amount (₹50,000, 50000, 50k, 50 thousand, etc.)
            const amountPatterns = [
                /₹?\s*(\d+(?:[.,]\d+)?)\s*(?:lakh|lakhs|crore|crores|thousand|thousands|k)/i,
                /₹?\s*(\d+(?:[.,]\d+)?)/i,
                /(\d+(?:[.,]\d+)?)\s*(?:rupees|rs|inr)/i
            ];

            for (const pattern of amountPatterns) {
                const match = message.match(pattern);
                if (match) {
                    let num = parseFloat(match[1].replace(/,/g, ''));
                    const text = match[0].toLowerCase();
                    if (text.includes('lakh')) num *= 100000;
                    else if (text.includes('crore')) num *= 10000000;
                    else if (text.includes('thousand') || text.includes('k')) num *= 1000;
                    targetAmount = num;
                    break;
                }
            }

            // Extract duration (6 months, in 6 months, for 6 months, etc.)
            const durationPatterns = [
                /(\d+)\s*months?/i,
                /in\s*(\d+)\s*months?/i,
                /for\s*(\d+)\s*months?/i,
                /(\d+)\s*month\s*period/i
            ];

            for (const pattern of durationPatterns) {
                const match = message.match(pattern);
                if (match) {
                    durationMonths = parseInt(match[1]);
                    break;
                }
            }

            // Extract goal name (optional)
            if (q.includes('emergency fund')) name = 'Emergency Fund';
            else if (q.includes('vacation') || q.includes('trip')) name = 'Vacation Fund';
            else if (q.includes('house') || q.includes('home')) name = 'Home Down Payment';
            else if (q.includes('car') || q.includes('vehicle')) name = 'Vehicle Purchase';
            else if (q.includes('wedding')) name = 'Wedding Fund';
            else if (q.includes('education')) name = 'Education Fund';

            if (targetAmount && durationMonths) {
                return { name, targetAmount, durationMonths };
            }

            return null;
        } catch (e) {
            console.warn('Failed to extract goal from message:', e);
            return null;
        }
    },

    /**
     * Analyze goal achievability (Level 8)
     * @param {Object} goal - Goal object
     * @param {Object} context - Financial context
     * @returns {Object} Analysis result
     */
    analyzeGoalAchievability(goal, context) {
        if (!goal || !context) {
            return { achievable: false, reason: 'Insufficient data' };
        }

        try {
            const { income, expenses, savings, savingsRate, topExpenses } = context;
            const { monthlyRequirement, targetAmount, durationMonths } = goal;

            // Check if goal is realistic
            const currentSavingsRate = parseFloat(savingsRate || 0);
            const requiredSavingsRate = income > 0 ? ((monthlyRequirement / income) * 100) : 0;

            if (income === 0) {
                return { achievable: false, reason: 'No income data available' };
            }

            if (monthlyRequirement > income) {
                return { 
                    achievable: false, 
                    reason: `Monthly requirement (₹${monthlyRequirement.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceeds your income`,
                    suggestion: 'Consider increasing the duration or reducing the target amount'
                };
            }

            if (monthlyRequirement > income - expenses) {
                const shortfall = monthlyRequirement - (income - expenses);
                return {
                    achievable: true,
                    requiresReduction: true,
                    shortfall: shortfall,
                    reason: `You need to reduce expenses by ₹${shortfall.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month`,
                    suggestion: this._generateReductionSuggestion(shortfall, topExpenses)
                };
            }

            return {
                achievable: true,
                requiresReduction: false,
                reason: `Goal is achievable with your current savings rate of ${currentSavingsRate.toFixed(1)}%`,
                monthlyRequirement: monthlyRequirement
            };
        } catch (e) {
            console.warn('Goal achievability analysis failed:', e);
            return { achievable: false, reason: 'Analysis failed' };
        }
    },

    /**
     * Generate reduction suggestion for goal (Level 8)
     * @param {number} shortfall - Amount needed
     * @param {Array} topExpenses - Top expense categories
     * @returns {string} Suggestion
     */
    _generateReductionSuggestion(shortfall, topExpenses) {
        if (!topExpenses || topExpenses.length === 0) {
            return `Reduce expenses by ₹${shortfall.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month`;
        }

        const topExpense = topExpenses[0];
        if (topExpense.amount >= shortfall) {
            return `Reduce ${topExpense.name} by ₹${shortfall.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month`;
        } else {
            const remaining = shortfall - topExpense.amount;
            return `Reduce ${topExpense.name} by ₹${topExpense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month and other expenses by ₹${remaining.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month`;
        }
    },

    /**
     * Handle CREATE_GOAL intent (Level 8)
     * @param {string} question - User question
     * @param {Object} context - Financial context
     * @returns {string} Response
     */
    handleCreateGoalIntent(question, context) {
        if (!context) {
            return 'I need access to your financial data to help create a goal. Please make sure you\'re logged in and have added income and expenses.';
        }

        try {
            const goalParams = this.extractGoalFromMessage(question);
            
            if (!goalParams) {
                return 'I can help you create a savings goal! Please specify:\n- Target amount (e.g., ₹50,000)\n- Duration (e.g., 6 months)\n\nExample: "Create a goal to save ₹50,000 in 6 months"';
            }

            const { name, targetAmount, durationMonths } = goalParams;
            
            // Level 8: Check for duplicate before creating
            const existingGoals = this.financialGoals || [];
            const duplicate = existingGoals.find(g => 
                g.name.toLowerCase() === name.toLowerCase() && 
                (g.status === 'active' || g.status === 'behind')
            );
            if (duplicate) {
                return `A goal named "${name}" already exists. Please use a different name or edit the existing goal on the Goals page.`;
            }
            
            const goal = this.createFinancialGoal(name, targetAmount, durationMonths);
            
            if (!goal) {
                return 'I encountered an issue creating your goal. Please try again with clear parameters.';
            }

            // Analyze achievability
            const analysis = this.analyzeGoalAchievability(goal, context);
            
            let response = `✅ Goal created: "${goal.name}"\n\n`;
            response += `Target: ₹${goal.targetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            response += `Duration: ${goal.durationMonths} months\n`;
            response += `Monthly requirement: ₹${goal.monthlyRequirement.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;

            if (analysis.achievable) {
                if (analysis.requiresReduction) {
                    response += `📊 Analysis: ${analysis.reason}\n`;
                    if (analysis.suggestion) {
                        response += `💡 Suggestion: ${analysis.suggestion}`;
                    }
                } else {
                    response += `📊 Analysis: ${analysis.reason}`;
                }
            } else {
                response += `⚠️ Analysis: ${analysis.reason}`;
                if (analysis.suggestion) {
                    response += `\n💡 ${analysis.suggestion}`;
                }
            }

            return response;
        } catch (e) {
            console.warn('Create goal intent failed:', e);
            return 'I encountered an issue creating your goal. Please try again.';
        }
    },

    /**
     * Generate GOAL_PROGRESS response (Level 8)
     * @param {Object} context - Financial context
     * @returns {string} Response
     */
    generateGoalProgressResponse(context) {
        if (!context) {
            return 'I need access to your financial data to check goal progress. Please make sure you\'re logged in.';
        }

        try {
            const activeGoals = this.getActiveGoals();
            
            if (activeGoals.length === 0) {
                return 'You don\'t have any active savings goals. Create one by saying "Create a savings goal" or "Set a goal to save ₹50,000 in 6 months".\n\nYou can also view your goals on the Goals page in the navigation menu.';
            }

            // Update progress for all goals
            activeGoals.forEach(goal => {
                this.updateGoalProgress(goal);
            });
            this.saveFinancialGoals();

            // Trigger Goals page update if it's visible
            if (typeof window.renderGoalsPage === 'function') {
                setTimeout(() => {
                    try {
                        window.renderGoalsPage();
                    } catch (e) {
                        // Silent fail - page update is optional
                    }
                }, 100);
            }

            let response = 'Your Goal Progress:\n\n';
            
            activeGoals.forEach((goal, idx) => {
                response += `${idx + 1}. ${goal.name}\n`;
                response += `   Target: ₹${goal.targetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                response += `   Saved: ₹${goal.amountSaved.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${goal.completionPercentage.toFixed(1)}%)\n`;
                response += `   Remaining: ₹${goal.remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                response += `   Monthly need: ₹${goal.monthlyRequirement.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                
                if (goal.status === 'behind') {
                    response += `   ⚠️ Status: Falling behind schedule\n`;
                } else if (goal.status === 'completed') {
                    response += `   ✅ Status: Completed!\n`;
                } else {
                    response += `   ✅ Status: On track\n`;
                }
                response += '\n';
            });

            response += '\n💡 View detailed progress and actionable plans on the Goals page.';

            return response;
        } catch (e) {
            console.warn('Goal progress response failed:', e);
            return 'I encountered an issue checking your goal progress. Please try again.';
        }
    },

    /**
     * Generate GOAL_ACHIEVABILITY response (Level 8)
     * @param {Object} context - Financial context
     * @returns {string} Response
     */
    generateGoalAchievabilityResponse(context) {
        if (!context) {
            return 'I need access to your financial data to analyze goal achievability. Please make sure you\'re logged in.';
        }

        try {
            const activeGoals = this.getActiveGoals();
            
            if (activeGoals.length === 0) {
                return 'You don\'t have any active goals. Create one first by saying "Create a savings goal".';
            }

            const goal = activeGoals[0]; // Analyze first active goal
            const updatedGoal = this.updateGoalProgress(goal);
            const analysis = this.analyzeGoalAchievability(updatedGoal, context);

            let response = `Goal Analysis: "${updatedGoal.name}"\n\n`;
            response += `Target: ₹${updatedGoal.targetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in ${updatedGoal.durationMonths} months\n`;
            response += `Monthly requirement: ₹${updatedGoal.monthlyRequirement.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;

            if (analysis.achievable) {
                if (analysis.requiresReduction) {
                    response += `✅ This goal is achievable, but you'll need to make adjustments:\n\n`;
                    response += `${analysis.reason}\n\n`;
                    if (analysis.suggestion) {
                        response += `Step-by-step plan:\n`;
                        response += `1. ${analysis.suggestion}\n`;
                        response += `2. Monitor your progress monthly\n`;
                        response += `3. Adjust spending if needed\n`;
                    }
                } else {
                    response += `✅ This goal is achievable with your current financial situation!\n\n`;
                    response += `${analysis.reason}\n\n`;
                    response += `You're on track to reach your goal. Keep up the good work!`;
                }
            } else {
                response += `⚠️ This goal may be challenging:\n\n`;
                response += `${analysis.reason}\n\n`;
                if (analysis.suggestion) {
                    response += `💡 ${analysis.suggestion}`;
                } else {
                    response += `Consider adjusting the target amount or duration to make it more realistic.`;
                }
            }

            return response;
        } catch (e) {
            console.warn('Goal achievability response failed:', e);
            return 'I encountered an issue analyzing your goal. Please try again.';
        }
    },

    /**
     * Handle ADJUST_GOAL intent (Level 8)
     * @param {string} question - User question
     * @param {Object} context - Financial context
     * @returns {string} Response
     */
    handleAdjustGoalIntent(question, context) {
        if (!context) {
            return 'I need access to your financial data to adjust your goal plan. Please make sure you\'re logged in.';
        }

        try {
            const activeGoals = this.getActiveGoals();
            
            if (activeGoals.length === 0) {
                return 'You don\'t have any active goals to adjust. Create one first.';
            }

            const goal = activeGoals[0];
            const updatedGoal = this.updateGoalProgress(goal);
            const analysis = this.analyzeGoalAchievability(updatedGoal, context);

            let response = `Adjusted Plan for "${updatedGoal.name}":\n\n`;
            
            if (analysis.requiresReduction && analysis.shortfall) {
                const { topExpenses } = context;
                response += `To reach your goal, you need to save ₹${updatedGoal.monthlyRequirement.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month.\n\n`;
                response += `Current situation:\n`;
                response += `- Current savings: ₹${(context.savings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month\n`;
                response += `- Shortfall: ₹${analysis.shortfall.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month\n\n`;
                
                if (topExpenses && topExpenses.length > 0) {
                    response += `Recommended adjustments:\n`;
                    topExpenses.slice(0, 2).forEach((exp, idx) => {
                        const reduction = Math.min(exp.amount * 0.15, analysis.shortfall / 2);
                        response += `${idx + 1}. Reduce ${exp.name} by ₹${reduction.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month\n`;
                    });
                }
            } else {
                response += `Your current plan is working well!\n\n`;
                response += `You're saving ₹${(context.savings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month, which is sufficient for your goal.`;
            }

            return response;
        } catch (e) {
            console.warn('Adjust goal intent failed:', e);
            return 'I encountered an issue adjusting your goal plan. Please try again.';
        }
    },

    /**
     * Check goals and provide proactive encouragement (Level 8)
     * Called automatically when savings change
     * @param {Object} context - Financial context
     * @returns {string|null} Encouragement message or null
     */
    checkGoalsAndEncourage(context) {
        if (!context) return null;

        try {
            const activeGoals = this.getActiveGoals();
            if (activeGoals.length === 0) return null;

            const goal = activeGoals[0];
            const updatedGoal = this.updateGoalProgress(goal);
            
            // Only provide encouragement if significant progress
            if (updatedGoal.completionPercentage > 0 && updatedGoal.completionPercentage < 100) {
                if (updatedGoal.status === 'behind') {
                    return `💪 You're ${updatedGoal.completionPercentage.toFixed(1)}% towards "${updatedGoal.name}". Keep going! Consider reducing expenses to stay on track.`;
                } else if (updatedGoal.completionPercentage >= 50) {
                    return `🎉 Great progress! You're ${updatedGoal.completionPercentage.toFixed(1)}% towards "${updatedGoal.name}". You're more than halfway there!`;
                }
            }

            return null;
        } catch (e) {
            return null; // Silent fail
        }
    },

    // ============================================
    // LEVEL 9: INTELLIGENT FINANCIAL REASONING
    // ============================================

    /**
     * Add interaction to contextual memory (Level 9)
     * @param {string} question - User question
     * @param {string} response - AI response
     */
    addToRecentInteractions(question, response) {
        try {
            this.recentInteractions.push({
                question: question,
                response: response,
                timestamp: Date.now()
            });

            // Keep only last N interactions
            if (this.recentInteractions.length > this.maxInteractionMemory) {
                this.recentInteractions = this.recentInteractions.slice(-this.maxInteractionMemory);
            }
        } catch (e) {
            // Silent fail
        }
    },

    /**
     * Get recent interactions for context (Level 9)
     * @returns {Array} Recent interactions
     */
    getRecentInteractions() {
        try {
            return this.recentInteractions.slice(-3); // Last 3 interactions
        } catch (e) {
            return [];
        }
    },

    /**
     * Extract simulation parameters from question (Level 9)
     * @param {string} question - User question
     * @returns {Object|null} Simulation parameters
     */
    extractSimulationParams(question) {
        if (!question || typeof question !== 'string') return null;

        try {
            const q = question.toLowerCase();
            const params = {
                type: null, // 'income_change', 'expense_change', 'category_change'
                amount: null,
                category: null,
                percentage: null
            };

            // Extract amount (₹50,000, 50000, 50k, etc.)
            const amountPatterns = [
                /₹?\s*(\d+(?:[.,]\d+)?)\s*(?:lakh|lakhs|crore|crores|thousand|thousands|k)/i,
                /₹?\s*(\d+(?:[.,]\d+)?)/i,
                /(\d+(?:[.,]\d+)?)\s*(?:rupees|rs|inr)/i
            ];

            for (const pattern of amountPatterns) {
                const match = question.match(pattern);
                if (match) {
                    let num = parseFloat(match[1].replace(/,/g, ''));
                    const text = match[0].toLowerCase();
                    if (text.includes('lakh')) num *= 100000;
                    else if (text.includes('crore')) num *= 10000000;
                    else if (text.includes('thousand') || text.includes('k')) num *= 1000;
                    params.amount = num;
                    break;
                }
            }

            // Extract percentage
            const percentMatch = question.match(/(\d+(?:\.\d+)?)\s*%/i);
            if (percentMatch) {
                params.percentage = parseFloat(percentMatch[1]);
            }

            // Determine type
            if (q.includes('income') || q.includes('salary') || q.includes('earn')) {
                params.type = 'income_change';
            } else if (q.includes('rent') || q.includes('expense') || q.includes('spending')) {
                params.type = 'expense_change';
            } else if (q.includes('food') || q.includes('dining')) {
                params.type = 'category_change';
                params.category = 'Food & Dining';
            } else if (q.includes('travel') || q.includes('transport')) {
                params.type = 'category_change';
                params.category = 'Travel & Transport';
            } else if (q.includes('shopping')) {
                params.type = 'category_change';
                params.category = 'Shopping';
            } else if (q.includes('miscellaneous') || q.includes('misc')) {
                params.type = 'category_change';
                params.category = 'Miscellaneous';
            }

            // Determine increase/decrease
            if (q.includes('increase') || q.includes('raise') || q.includes('more') || q.includes('add')) {
                params.direction = 'increase';
            } else if (q.includes('decrease') || q.includes('reduce') || q.includes('less') || q.includes('cut') || q.includes('lower')) {
                params.direction = 'decrease';
            }

            return params.amount || params.percentage ? params : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Simulate financial scenario (Level 9)
     * @param {Object} baseContext - Base financial context
     * @param {Object} params - Simulation parameters
     * @returns {Object} Simulated context
     */
    simulateScenario(baseContext, params) {
        if (!baseContext || !params) return null;

        try {
            // Create deep copy to avoid modifying original data
            const simulated = JSON.parse(JSON.stringify(baseContext));
            
            const { type, amount, percentage, direction, category } = params;
            const isIncrease = direction === 'increase';

            if (type === 'income_change') {
                const change = amount || (percentage ? (simulated.income * percentage / 100) : 0);
                simulated.income = isIncrease ? simulated.income + change : Math.max(0, simulated.income - change);
            } else if (type === 'expense_change') {
                const change = amount || (percentage ? (simulated.expenses * percentage / 100) : 0);
                simulated.expenses = isIncrease ? simulated.expenses + change : Math.max(0, simulated.expenses - change);
            } else if (type === 'category_change' && category) {
                // Find category in flexible spending
                const categoryMap = {
                    'Food & Dining': 'food',
                    'Travel & Transport': 'travel',
                    'Shopping': 'shopping',
                    'Miscellaneous': 'miscellaneous'
                };
                
                const catKey = categoryMap[category];
                if (catKey && simulated.flexibleSpending && simulated.flexibleSpending[catKey]) {
                    const currentAmount = simulated.flexibleSpending[catKey] || 0;
                    const change = amount || (percentage ? (currentAmount * percentage / 100) : 0);
                    simulated.flexibleSpending[catKey] = isIncrease ? currentAmount + change : Math.max(0, currentAmount - change);
                    
                    // Recalculate total expenses
                    const flexibleTotal = Object.values(simulated.flexibleSpending || {}).reduce((sum, val) => sum + (val || 0), 0);
                    simulated.expenses = (simulated.fixedExpenses || 0) + flexibleTotal;
                }
            }

            // Recalculate savings
            simulated.savings = simulated.income - simulated.expenses;
            simulated.savingsRate = simulated.income > 0 ? ((simulated.savings / simulated.income) * 100).toFixed(1) : '0';

            return simulated;
        } catch (e) {
            return null;
        }
    },

    /**
     * Handle WHAT_IF_SIMULATION intent (Level 9)
     * @param {string} question - User question
     * @param {Object} context - Financial context
     * @returns {string} Response
     */
    handleWhatIfSimulation(question, context) {
        if (!context) {
            return 'I need access to your financial data to run simulations. Please make sure you\'re logged in.';
        }

        try {
            const params = this.extractSimulationParams(question);
            
            if (!params) {
                return 'I can help you simulate financial scenarios! Try asking:\n\n• "What if my income reduces by ₹10,000?"\n• "What if rent increases by 20%?"\n• "What if I reduce Food & Dining by ₹2,000?"';
            }

            const simulated = this.simulateScenario(context, params);
            if (!simulated) {
                return 'I couldn\'t process that simulation. Please try rephrasing your question.';
            }

            const { income, expenses, savings, savingsRate } = context;
            const { simIncome, simExpenses, simSavings, simSavingsRate } = simulated;

            const incomeChange = simIncome - income;
            const expenseChange = simExpenses - expenses;
            const savingsChange = simSavings - savings;
            const rateChange = parseFloat(simSavingsRate) - parseFloat(savingsRate);

            let response = '📊 Simulation Results:\n\n';
            response += `Current Situation:\n`;
            response += `• Income: ₹${income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            response += `• Expenses: ₹${expenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            response += `• Savings: ₹${savings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${savingsRate}%)\n\n`;

            response += `After This Change:\n`;
            response += `• Income: ₹${simIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            if (incomeChange !== 0) {
                response += ` (${incomeChange > 0 ? '+' : ''}₹${Math.abs(incomeChange).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
            }
            response += `\n`;

            response += `• Expenses: ₹${simExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            if (expenseChange !== 0) {
                response += ` (${expenseChange > 0 ? '+' : ''}₹${Math.abs(expenseChange).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
            }
            response += `\n`;

            response += `• Savings: ₹${simSavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${simSavingsRate}%)`;
            if (savingsChange !== 0) {
                response += ` (${savingsChange > 0 ? '+' : ''}₹${Math.abs(savingsChange).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
            }
            response += `\n\n`;

            // Impact explanation
            if (savingsChange < 0) {
                response += `⚠️ Impact: Your savings would decrease by ₹${Math.abs(savingsChange).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month.`;
                if (simSavings < 0) {
                    response += ` This would result in overspending.`;
                }
            } else if (savingsChange > 0) {
                response += `✅ Impact: Your savings would increase by ₹${savingsChange.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month.`;
            } else {
                response += `📊 Impact: Your savings would remain unchanged.`;
            }

            // Check goal feasibility if goals exist
            const activeGoals = this.getActiveGoals();
            if (activeGoals.length > 0) {
                const goal = activeGoals[0];
                const updatedGoal = this.updateGoalProgress(goal);
                const simAnalysis = this.analyzeGoalAchievability(updatedGoal, simulated);
                
                if (simAnalysis.achievable) {
                    if (simAnalysis.requiresReduction) {
                        response += `\n\n🎯 Goal Impact: You could still reach "${updatedGoal.name}", but you'd need to reduce expenses by ₹${simAnalysis.shortfall.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month.`;
                    } else {
                        response += `\n\n🎯 Goal Impact: You'd still be on track to reach "${updatedGoal.name}".`;
                    }
                } else {
                    response += `\n\n🎯 Goal Impact: This change might make it harder to reach "${updatedGoal.name}".`;
                }
            }

            response += `\n\n💡 Note: This is a simulation only. Your actual data remains unchanged.`;

            return response;
        } catch (e) {
            return 'I encountered an issue running the simulation. Please try again.';
        }
    },

    /**
     * Handle GOAL_FEASIBILITY_CHECK intent (Level 9)
     * @param {string} question - User question
     * @param {Object} context - Financial context
     * @returns {string} Response
     */
    handleGoalFeasibilityCheck(question, context) {
        if (!context) {
            return 'I need access to your financial data to check goal feasibility. Please make sure you\'re logged in.';
        }

        try {
            const activeGoals = this.getActiveGoals();
            if (activeGoals.length === 0) {
                return 'You don\'t have any active goals. Create one first to check feasibility.';
            }

            // Check if question includes a scenario
            const params = this.extractSimulationParams(question);
            const simulated = params ? this.simulateScenario(context, params) : context;

            const goal = activeGoals[0];
            const updatedGoal = this.updateGoalProgress(goal);
            const analysis = this.analyzeGoalAchievability(updatedGoal, simulated);

            let response = `Goal Feasibility: "${updatedGoal.name}"\n\n`;
            
            if (params) {
                response += `Scenario: `;
                if (params.type === 'income_change') {
                    response += `Income ${params.direction === 'increase' ? 'increases' : 'decreases'}`;
                    if (params.amount) response += ` by ₹${params.amount.toLocaleString('en-IN')}`;
                    if (params.percentage) response += ` by ${params.percentage}%`;
                } else if (params.type === 'expense_change') {
                    response += `Expenses ${params.direction === 'increase' ? 'increase' : 'decrease'}`;
                    if (params.amount) response += ` by ₹${params.amount.toLocaleString('en-IN')}`;
                    if (params.percentage) response += ` by ${params.percentage}%`;
                }
                response += `\n\n`;
            }

            if (analysis.achievable) {
                if (analysis.requiresReduction) {
                    response += `✅ Feasible, but requires adjustments:\n\n`;
                    response += `${analysis.reason}\n\n`;
                    if (analysis.suggestion) {
                        response += `Action needed: ${analysis.suggestion}`;
                    }
                } else {
                    response += `✅ This goal is feasible!\n\n`;
                    response += `${analysis.reason}\n\n`;
                    response += `You're on track to reach your goal.`;
                }
            } else {
                response += `⚠️ This goal may be challenging:\n\n`;
                response += `${analysis.reason}\n\n`;
                if (analysis.suggestion) {
                    response += `💡 ${analysis.suggestion}`;
                } else {
                    response += `Consider adjusting the target amount or duration.`;
                }
            }

            return response;
        } catch (e) {
            return 'I encountered an issue checking goal feasibility. Please try again.';
        }
    },

    /**
     * Generate risk detection response (Level 9)
     * @param {Object} context - Financial context
     * @returns {string} Response
     */
    generateRiskDetectionResponse(context) {
        if (!context) {
            return 'I need access to your financial data to detect risks. Please make sure you\'re logged in.';
        }

        try {
            const risks = [];
            const { income, expenses, savings, savingsRate, topExpenses } = context;

            // Risk 1: Overspending
            if (expenses > income) {
                const overspend = expenses - income;
                risks.push({
                    type: 'overspending',
                    severity: 'high',
                    message: `You're currently overspending by ₹${overspend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month.`,
                    suggestion: 'Review your expenses and identify areas to reduce spending immediately.'
                });
            }

            // Risk 2: Low savings rate
            const rate = parseFloat(savingsRate || 0);
            if (rate < 10 && income > expenses) {
                risks.push({
                    type: 'low_savings',
                    severity: 'medium',
                    message: `Your savings rate is ${rate.toFixed(1)}%, which is below the recommended 15-20%.`,
                    suggestion: 'Aim to save at least 15% of your income for better financial security.'
                });
            }

            // Risk 3: Goal infeasibility
            const activeGoals = this.getActiveGoals();
            if (activeGoals.length > 0) {
                activeGoals.forEach(goal => {
                    const updatedGoal = this.updateGoalProgress(goal);
                    const analysis = this.analyzeGoalAchievability(updatedGoal, context);
                    
                    if (!analysis.achievable || (analysis.achievable && analysis.requiresReduction && analysis.shortfall > income * 0.3)) {
                        risks.push({
                            type: 'goal_infeasible',
                            severity: 'medium',
                            message: `Your "${updatedGoal.name}" goal may be difficult to achieve with current finances.`,
                            suggestion: analysis.suggestion || 'Consider adjusting the target amount or duration.'
                        });
                    }
                });
            }

            // Risk 4: Declining savings trend (if we have historical data)
            if (context.monthlyData && context.monthlyData.length >= 2) {
                const recent = context.monthlyData.slice(-2);
                const savings1 = recent[0].savings || 0;
                const savings2 = recent[1].savings || 0;
                
                if (savings2 < savings1 * 0.8) {
                    risks.push({
                        type: 'declining_savings',
                        severity: 'medium',
                        message: 'Your savings have declined recently.',
                        suggestion: 'Review your spending patterns and identify what changed.'
                    });
                }
            }

            if (risks.length === 0) {
                return '✅ No significant financial risks detected. Your finances look stable!';
            }

            let response = '⚠️ Financial Risk Assessment:\n\n';
            
            risks.forEach((risk, idx) => {
                response += `${idx + 1}. ${risk.message}\n`;
                response += `   💡 ${risk.suggestion}\n\n`;
            });

            response += `These are observations based on your current financial data. Take action to address any concerns.`;

            return response;
        } catch (e) {
            return 'I encountered an issue detecting risks. Please try again.';
        }
    },

    /**
     * Generate personalized financial advice (Level 9)
     * @param {Object} context - Financial context
     * @returns {string} Response
     */
    generatePersonalizedAdvice(context) {
        if (!context) {
            return 'I need access to your financial data to provide personalized advice. Please make sure you\'re logged in.';
        }

        try {
            const { income, expenses, savings, savingsRate, topExpenses, activeGoals } = context;
            const advice = [];

            // Advice based on savings rate
            const rate = parseFloat(savingsRate || 0);
            if (rate < 10 && income > expenses) {
                advice.push({
                    priority: 'high',
                    category: 'Savings',
                    message: `Your savings rate is ${rate.toFixed(1)}%. Aim for 15-20% for better financial security.`,
                    action: `Try to save an additional ₹${((income * 0.15) - savings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month.`
                });
            }

            // Advice based on top expenses
            if (topExpenses && topExpenses.length > 0) {
                const topExpense = topExpenses[0];
                if (topExpense.amount > income * 0.3) {
                    advice.push({
                        priority: 'medium',
                        category: 'Expense Management',
                        message: `${topExpense.name} accounts for ${((topExpense.amount / income) * 100).toFixed(1)}% of your income.`,
                        action: `Consider reducing ${topExpense.name} by 10-15% to free up ₹${(topExpense.amount * 0.15).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month.`
                    });
                }
            }

            // Advice based on goals
            if (activeGoals && activeGoals.length > 0) {
                const goal = activeGoals[0];
                const updatedGoal = this.updateGoalProgress(goal);
                const analysis = this.analyzeGoalAchievability(updatedGoal, context);
                
                if (analysis.requiresReduction && analysis.shortfall) {
                    advice.push({
                        priority: 'high',
                        category: 'Goal Achievement',
                        message: `To reach "${updatedGoal.name}", you need to save ₹${updatedGoal.monthlyRequirement.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month.`,
                        action: analysis.suggestion || `Reduce expenses by ₹${analysis.shortfall.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month.`
                    });
                }
            }

            // Advice based on expense ratio
            const expenseRatio = income > 0 ? ((expenses / income) * 100) : 0;
            if (expenseRatio > 85 && income > 0) {
                advice.push({
                    priority: 'high',
                    category: 'Budget Balance',
                    message: `Your expenses are ${expenseRatio.toFixed(1)}% of income, leaving little room for savings.`,
                    action: 'Review all expense categories and identify areas to reduce by at least 10%.'
                });
            }

            if (advice.length === 0) {
                return '✅ Your finances look good! Continue monitoring your spending and savings to maintain this balance.';
            }

            // Sort by priority
            advice.sort((a, b) => {
                const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });

            let response = '💡 Personalized Financial Advice:\n\n';
            
            advice.forEach((item, idx) => {
                response += `${idx + 1}. ${item.category}\n`;
                response += `   ${item.message}\n`;
                response += `   → Action: ${item.action}\n\n`;
            });

            response += `These recommendations are based on your current financial situation.`;

            return response;
        } catch (e) {
            return 'I encountered an issue generating personalized advice. Please try again.';
        }
    },

    /**
     * Clear chat history (Level 9 Enhanced)
     */
    clearHistory() {
        this.chatHistory = [];
        this.conversationContext = {
            lastTopic: null,
            mentionedCategories: [],
            mentionedAmounts: [],
            lastAnalysis: null
        };
        // Level 6: Don't clear user memory - it persists across sessions
        // Level 8: Don't clear goals - they persist across sessions
        // Level 9: Clear contextual memory on history clear
        this.recentInteractions = [];
    },

    /**
     * Get chat history
     * @returns {Array} Chat history
     */
    getHistory() {
        return this.chatHistory;
    }
};