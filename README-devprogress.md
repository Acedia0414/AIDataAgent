

- top 1 priority
    - prior: all metadata/xx/yy shall be already in the DB/table
    - it shall be able to find relevant metadata to ref the Qs in order to gen correct SQLs

- feature-wise
    - running local embedding model via LM Studio
        > have lms command line tool set up properly

        ```bash
        ~/.lmstudio/bin/lms load
        ~/.lmstudio/bin/lms ps

        ```

- UI-wise
    - database
        - if test conn failed, it shall stay as edit-config page
    - LLM
        - a place to config LLM API (incl. persistence)
    - query
        - ✅ a drop at the top nav for selecting companies
            - ✅ so that only necessary Qs are done
            - ✅ companies fetched from D365 DataArea table
            - ✅ queries automatically scoped to selected company via WHERE DataAreaId clause
            - ✅ fixed DataArea table queries to use correct column names (id, name, isVirtual)
            - ✅ persistent error toasts with copy functionality for debugging
            - ✅ company selector integrated into navigation bar with localStorage persistence
        - case when not enough Q is provided
            - AI shall be able to find metadata needed

- Use-case-wise
    - case1: when not enough info provided, ask for more info, the Q, the metadata
    - case2: when request involve multi tables, would it work
    - case3: when multiple steps needed, break down the steps, show the plan, execute step by step

- Security-wise
    - auth
        - now hardcoded auth for dev purpose
        - need to have proper OAuth flow, powered by Azure Active Directory
            - require reading doc
            - require being assigned proper roles/permissions in Azure AD

- Bug-wise
    - ✅ Fixed company sync NaN error in upsertCompany function
        - Issue: Was querying by id after insert using result.insertId which returned NaN
        - Fix: Query by code (unique key) after insert instead of by id
    - ✅ Fixed cache staleness check to use most recent lastSyncedAt instead of first record
        - Now properly detects when cache needs refresh after 24 hours
    - ✅ Cleared partial bad data from companies table (1 record with NaN)
        - Used: `mysql -u root -pd365aiagent d365_agent -e "DELETE FROM companies;"`
    - ✅ Fixed duplicate companies in dropdown (issue 1)
        - Added deduplication using Map with company code as key
        - Applied to both getCompanies and refreshCompanies endpoints
    - ✅ Clarification dialog simplified (issue 2)
        - No auto-submit of company; will ask only when needed
    - ✅ Removed "number of records" question from clarification dialog (issue 4)
        - System now handles record limits automatically
        - Filtered out all limit/count questions from clarification
    - ✅ Fixed syntax error after adding deduplication in getCompanies/refreshCompanies
        - Moved deduplication logic outside map, defined uniqueCompanies before use

- UI-wise
    - ✅ improved navigation spacing to be less cramped (issue 3)
        - Navigation items now centered with better gaps
        - Compact buttons to reduce crowding
    - ⏸️ Company selector disabled; queries now run across all companies by default
        - UI dropdown removed from navigation
        - Clarification dialog no longer auto-submits a selected company

- Deployment-wise
    - one-click deployment script, both for Windows and Linux/Mac

- Metadata Bulk Import (Jan 2026)
  - **Features**
    - ✅ Batch upload support for multiple XML files at once
      - Processes files in chunks to handle large imports safely
      - Shows real-time progress during upload
    - ✅ Better error reporting
      - Displays count of files that failed with reasons
      - Makes it easier to identify and fix problematic files
    - ✅ Improved relationship mapping
      - Fixed database storage of table connections
      - More reliable linking between related tables

  - **Bugs Fixed**
    - ✅ Metadata loss on batch import
      - Issue: Importing a new batch would delete previous unrelated tables
      - Fix: Now only replaces specific tables if you choose to; others stay in system
    - ✅ Validation too strict for some XML formats
      - Issue: Some valid D365 files were rejected
      - Fix: More flexible XML format acceptance

  - **Quality & Safety**
    - System limits concurrent file processing to prevent memory issues
    - Automatic cleanup after uploads complete
    - Better error handling—one bad file won't block others
    - All imports are additive (new data is always added, never lost)