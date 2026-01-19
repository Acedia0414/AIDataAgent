# User Guide - D365 F&O Data Agent

This guide is for **non-technical business users** who want to query D365 Finance and Operations data using natural language.

## What is the D365 F&O Data Agent?

The D365 F&O Data Agent is an AI-powered chat application that lets you ask questions about your D365 data in plain English. Instead of writing complex SQL queries or navigating through multiple ERP screens, you simply type your question and get instant answers.

**Think of it as having a data analyst available 24/7 to answer your D365 questions.**

## Getting Started

### Signing In

1. Open the application URL in your web browser
2. Click the **"Sign In"** button
3. Enter your corporate credentials (same as your D365 login)
4. You'll be redirected to the home page

### Understanding the Interface

The application has several main sections accessible from the top navigation:

- **Home** - Starting point with links to all features
- **Chat** - Ask questions and get answers
- **Metadata** - View D365 table and field definitions (admin)
- **Knowledge Base** - Upload business documents for AI reference (admin)
- **Query History** - Review past queries and results
- **Settings** - Configure connections and security (admin)
- **Connection Test** - Test database connectivity (admin)

## Asking Questions (Chat Interface)

### Starting a New Conversation

1. Click **"Chat"** in the top navigation
2. Click **"New Chat"** button to start a fresh conversation
3. Type your question in the text box at the bottom
4. Press **Enter** or click the **Send** button

### Example Questions

Here are some examples of questions you can ask:

**Customer Information:**
- "Show me all customers in California"
- "Which customers have credit limit over $100,000?"
- "Find customers who haven't placed orders in the last 6 months"

**Purchase Orders:**
- "Show me all purchase orders from last month"
- "Which purchase orders are still pending approval?"
- "Find purchase orders over $50,000"
- "Which purchase orders could impact the production process?"

**Sales Orders:**
- "Show me sales orders for customer ABC123"
- "Which sales orders are delayed?"
- "Find all sales orders shipped last week"

**Inventory:**
- "Show me products with low stock levels"
- "Which items have inventory value over $10,000?"
- "Find products that haven't moved in 90 days"

**Financial:**
- "Show me all invoices due this month"
- "Which vendors have outstanding balances?"
- "Find payments over $25,000 from last quarter"

**Troubleshooting:**
- "Why can't we ship to customer XYZ?"
- "What's blocking sales order SO-12345?"
- "Why is purchase order PO-67890 on hold?"

### Understanding Responses

When you ask a question, the AI will:

1. **Generate a SQL query** based on your question and D365 metadata
2. **Show you the SQL** for review before execution
3. **Wait for your approval** via the "Run Query" button
4. **Execute the query** against your D365 database (only when you click Run)
5. **Display the results** in a formatted table

**Response includes:**
- **SQL Query Preview** - Review the generated SQL before running it
- **Run Query Button** - Execute the SQL after reviewing it
- **Token Cost Display** - Estimated cost of the AI request (e.g., $0.023)
- **Results Table** - Your data in an easy-to-read format (after execution)
- **Explanation** - Plain English description of what the query does
- **Execution Time** - How long the query took to run
- **Row Count** - Number of results returned

**AI Confidence Levels:**
- **High** - Full schema available, SQL uses only provided columns
- **Medium** - Partial schema, some assumptions made
- **Inferred** - Standard D365 tables (like DirPartyTable) assumed from built-in knowledge

### Exporting Results

To save query results to Excel:

1. After receiving results, look for the **"Export to Excel"** button
2. Click the button
3. An Excel file (.xlsx) will download automatically
4. Open the file in Microsoft Excel

The Excel file includes:
- **Results sheet** - Your data with proper column headers
- **Query Info sheet** - SQL query, execution time, and metadata

### Copying Conversation Context

Use the **"Copy All Context"** button to export your entire conversation:

1. Find the button in the chat interface
2. Click to copy the full conversation history
3. Paste into documents, emails, or support tickets
4. Includes: all questions, SQL queries, results, and explanations

**Use cases:**
- Sharing with colleagues for review
- Creating documentation
- Troubleshooting with technical support
- Reporting issues or feature requests

### Tips for Better Results

**Be Specific:**
- ❌ "Show me customers"
- ✅ "Show me customers in Texas with credit limit over $50,000"

**Use Business Terms:**
- ✅ "Show me purchase orders" (not "SELECT * FROM PurchTable")
- ✅ "Find overdue invoices" (not complex SQL joins)

**Include Time Ranges:**
- ✅ "Show me sales orders from last month"
- ✅ "Find invoices due in the next 30 days"

**Ask Follow-Up Questions:**
- First: "Show me all customers in California"
- Then: "Which of these have orders over $10,000?"

**Rephrase if Needed:**
- If the AI doesn't understand, try rephrasing your question
- Use different words or break complex questions into smaller parts

## Reviewing Query History

### Viewing Past Queries

1. Click **"Query History"** in the top navigation
2. See a list of all your previous queries
3. Each entry shows:
   - Your original question
   - When it was executed
   - How long it took
   - How many results were returned

### Searching History

1. Use the search box at the top of Query History
2. Type keywords from your question
3. Results filter automatically

### Re-Running Queries

1. Find the query you want to run again
2. Click the **"Re-run"** button
3. Results will appear with current data

## Understanding Your Permissions

### Role-Based Access

Your access to data is controlled by your D365 security roles. The same permissions you have in D365 apply to the Data Agent.

**What this means:**
- You can only see data you're authorized to view
- Query results are automatically filtered based on your role
- If you don't have permission, you'll receive an error message

**Example:**
- A **Purchasing Agent** can query purchase orders and vendors
- A **Finance Manager** can query invoices and payments
- A **Sales Representative** can query customers and sales orders

### Requesting Additional Access

If you need access to data you can't currently see:

1. Contact your system administrator
2. Explain what data you need and why
3. Admin will update your D365 security roles
4. Changes take effect on your next login

## Knowledge Base (Context Documents)

### What is the Knowledge Base?

The Knowledge Base allows administrators to upload business documents that the AI can reference when answering your questions. This provides additional context beyond just the database structure.

**Examples of useful documents:**
- D365 configuration guides
- Business process documentation
- Data dictionaries
- Field descriptions and business rules
- Operational procedures

### How It Helps You

When you ask a question, the AI will:
1. Search the Knowledge Base for relevant information
2. Use that context to better understand your question
3. Generate more accurate queries

**Example:**
- You ask: "Why can't we ship to customer ABC123?"
- AI finds a document explaining shipping restrictions
- AI generates a query checking those specific restrictions
- You get a more accurate answer

### Uploading Documents (Admin Only)

If you're an administrator:

1. Click **"Knowledge Base"** in the top navigation
2. Click **"Upload Document"** button
3. Select a file (PDF, Word, Excel, Text, or Markdown)
4. Wait for processing to complete
5. Document is now available for AI reference

**Supported File Types:**
- PDF documents (.pdf)
- Word documents (.docx)
- Excel spreadsheets (.xlsx, .xls)
- Text files (.txt)
- Markdown files (.md)

## Common Issues & Solutions

### "No results found"

**Possible reasons:**
- No data matches your criteria
- Your question was too specific
- You don't have permission to view the data

**Try:**
- Broaden your search criteria
- Rephrase your question
- Contact admin to verify permissions

### "Query generation failed"

**Possible reasons:**
- Question was unclear or ambiguous
- Required metadata is missing
- AI couldn't understand the request

**Try:**
- Rephrase your question more clearly
- Break complex questions into smaller parts
- Use simpler business terms

### "Connection error"

**Possible reasons:**
- Database connection is down
- Network connectivity issues
- Temporary server problem

**Try:**
- Wait a moment and try again
- Refresh the page
- Contact your system administrator if problem persists

### "Permission denied"

**Possible reasons:**
- You don't have access to the requested data
- Your D365 security role doesn't include this permission

**Try:**
- Contact your system administrator
- Request additional permissions if needed
- Ask a different question about data you can access

### Results seem incorrect

**Possible reasons:**
- Question was misinterpreted by AI
- Data in D365 is outdated
- Query logic doesn't match your intent

**Try:**
- Review the generated SQL query (if you're technical)
- Rephrase your question more specifically
- Contact your system administrator for help

## Best Practices

### Security

**DO:**
- ✅ Log out when finished
- ✅ Keep your credentials secure
- ✅ Only export data you're authorized to access
- ✅ Follow your company's data handling policies

**DON'T:**
- ❌ Share your login credentials
- ❌ Export sensitive data to personal devices
- ❌ Leave your session unattended
- ❌ Share exported files with unauthorized users

### Data Quality

**DO:**
- ✅ Verify results make sense before using them
- ✅ Cross-reference with D365 if something looks wrong
- ✅ Report data quality issues to your admin
- ✅ Include date ranges in your questions for accuracy

**DON'T:**
- ❌ Assume all results are 100% accurate without verification
- ❌ Make business decisions based solely on AI-generated queries
- ❌ Ignore results that seem unusual or incorrect

### Efficiency

**DO:**
- ✅ Use Query History to re-run common queries
- ✅ Export results for offline analysis
- ✅ Ask follow-up questions in the same conversation
- ✅ Be specific to get faster, more accurate results

**DON'T:**
- ❌ Run the same query repeatedly (use Query History instead)
- ❌ Ask overly broad questions that return thousands of rows
- ❌ Export large datasets unnecessarily

## Getting Help

### In-App Help

- Hover over buttons and icons for tooltips
- Look for help text on each page
- Review example questions in the Chat interface

### Documentation

- [Architecture Overview](../architecture/system-overview.md) (technical)
- [Developer Guide](../development/getting-started.md) (technical)
- [Deployment Guide](../deployment/local-setup.md) (admin)

### Support

If you need assistance:

1. **First:** Try rephrasing your question
2. **Second:** Check Query History for similar successful queries
3. **Third:** Contact your system administrator
4. **Last Resort:** Submit a support ticket

## Frequently Asked Questions

**Q: Can I modify the database through the Data Agent?**
A: No. The Data Agent only allows SELECT queries (read-only). You cannot insert, update, or delete data.

**Q: How current is the data?**
A: The data is real-time from your D365 database. Results reflect the current state when the query runs.

**Q: Can I save my favorite queries?**
A: Not yet, but this feature is planned. For now, use Query History to re-run past queries.

**Q: Why do some queries take longer than others?**
A: Complex queries on large tables take more time. The AI tries to optimize queries, but some data requests are inherently slower.

**Q: Can I query multiple tables at once?**
A: Yes! The AI can generate queries with joins across multiple tables. Just ask your question naturally.

**Q: What if I don't know the exact table or field names?**
A: That's the point! You don't need to know technical details. Just ask in business terms, and the AI figures out the rest.

**Q: Can I schedule queries to run automatically?**
A: Not yet, but this feature is planned for future releases.

**Q: Is my query history private?**
A: Your query history is visible to you and system administrators. Admins can see all queries for audit purposes.

**Q: Can I use this on my phone?**
A: Yes, the interface is responsive and works on mobile devices, though the experience is optimized for desktop.

**Q: What happens if I ask a question the AI can't answer?**
A: The AI will either ask for clarification or return an error. Try rephrasing your question or breaking it into smaller parts.

## Tips for Success

1. **Start Simple** - Begin with straightforward questions to get comfortable
2. **Learn from History** - Review successful queries to understand what works
3. **Be Patient** - Complex queries may take a few seconds
4. **Provide Feedback** - If results aren't what you expected, let your admin know
5. **Explore** - Try different types of questions to discover what's possible

## Conclusion

The D365 F&O Data Agent empowers you to access your ERP data without technical expertise. By asking questions in natural language, you can get insights faster and make better business decisions.

**Remember:**
- Ask questions like you're talking to a data analyst
- Be specific about what you want to see
- Use Query History to save time
- Export results for further analysis
- Contact your admin if you need help

Happy querying!
