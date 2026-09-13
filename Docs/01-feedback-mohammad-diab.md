# Feedback: Mohammad Diab (Invoice Management System)

**Client:** not named in the submission (see gap 1)
**Primary goal:** Generate More Money (get invoices paid, and paid sooner)
**Reviewed by:** Sami

---

## Functional Requirements

### Module 1: Authentication

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-001 | Allow the administrator to log in using a registered email address and password | ✅ | Actor, action, and the condition are all there. | Keep as is. |
| FR-002 | Deny access when an incorrect email or password is entered | ⚠️ | Writing the failure path at all puts you ahead of most drafts. What is missing is what the person actually sees, and there is a security decision hiding in it: if you say "wrong password", you have just confirmed the email exists to whoever is guessing. | The system must reject the login attempt and display a single "invalid email or password" message, without indicating which of the two was wrong, when the credentials do not match a registered account. |
| FR-003 | Temporarily lock the administrator account after five consecutive failed login attempts for fifteen minutes | ✅ | Two numbers and a trigger, in an FR. This is the level of specificity FR-026 needs. | Keep as is. |
| FR-004 | Allow the administrator to log out from the system | ⚠️ | Only says the button exists. Logging out means the old session token stops working, and that is the part a tester checks. | The system must invalidate the current session and redirect to the login page when the administrator logs out, so that the previous session token no longer grants access. |
| FR-005 | Require authentication before accessing protected pages | ⚠️ | "Protected pages" is never defined in the document, so a developer decides for themselves which pages those are. Flip it: say everything is protected except the exceptions. | The system must redirect any unauthenticated request for a page other than the login page to the login page. |

### Module 2: Dashboard

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-006 | Display the total number of active customers | ⚠️ | What is "active"? Not archived, or has an unpaid invoice, or invoiced in the last 90 days? Three different numbers, three different queries. | The system must display the count of customers that are not archived on the dashboard. |
| FR-007 | Display the total outstanding invoice amount | ⚠️ | Same problem plus a duplicate: FR-057 says this again in the Reports module. Define "outstanding" once and use the definition everywhere. | The system must display the sum of remaining balances across all issued invoices that are not fully paid and not cancelled. |
| FR-008 | Display the total amount collected during the current month | ✅ | Clear enough to build. One nit to decide: calendar month, or the last 30 days? | Keep as is, and state which month boundary you mean. |
| FR-009 | Display invoices that are overdue | ⚠️ | "Overdue" is used in five requirements and defined in none. Also duplicates FR-058. Define it as a rule, once: due date in the past and remaining balance above zero. | The system must display all invoices whose due date has passed and whose remaining balance is greater than zero, sorted by days overdue, on the dashboard. |
| FR-010 | Display payments due within the next seven days | ✅ | A number in the requirement. Say whether "payments" here means invoices or installments, since after FR-040 those are different things. | Keep as is, name which one. |
| FR-011 | Display recent business activities ordered from newest to oldest | ❌ | "Business activities" could be anything. Five developers build five different screens from this sentence, and none of them is wrong. How many rows, and which events count? | The system must display the 20 most recent events (invoice issued, payment recorded, reminder sent, customer created) with a timestamp and a link to the related record, ordered newest first. |

### Module 3: Customer Management

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-012 | Allow the administrator to create a customer | ⚠️ | No fields. This requirement is where your customers table comes from, so the fields are the whole content of it. Which are required, and is email unique? | The system must create a customer record with name, email, phone, and billing address when the administrator submits the customer form, rejecting the submission with a field-level message when name or email is missing or the email is already registered. |
| FR-013 | Allow the administrator to edit a customer's information | ⚠️ | Which fields can change? If email is the login identity for anything later, it is not just another field. | The system must allow the administrator to update a customer's name, email, phone, and billing address, applying the same validation rules as creation. |
| FR-014 | Allow the administrator to archive a customer (archive instead of delete) | ⚠️ | The instinct is right and the reason in brackets is right. But "archive" needs a behaviour: what changes for the user after it happens? | The system must exclude an archived customer from customer selection lists and from the active-customer count, while keeping their existing invoices and payments intact and viewable. |
| FR-015 | Prevent archiving a customer who has active unpaid invoices | ✅ | This is the kind of rule that saves a real project. It also tells me you were thinking about what archiving breaks. | Keep as is. |
| FR-016 | Allow the administrator to search customers by name | ⚠️ | Exact match or partial? Case sensitive? A search box that only matches the full name exactly is one a user tries twice and then stops using. | The system must display all customers whose name contains the entered text, matched case-insensitively, when the administrator searches by name. |
| FR-017 | Allow the administrator to filter customers by status | ❌ | Customer status is never defined anywhere in the document. There is no requirement that sets a status, and no list of what the statuses are. Right now this filter has nothing to filter on. | Either define it (the system must allow filtering customers by status, where status is one of active or archived) or delete the line. |
| FR-018 | Display all invoices associated with a customer | ✅ | Clear. Consider naming the sort order and what each row shows. | Keep as is. |

### Module 4: Contract Management

Read gap 2 below before you revise this module. Seven requirements here, and nothing in
the other eleven modules ever uses a contract for anything.

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-019 | Allow the administrator to create a customer contract | ❌ | Same emptiness as FR-026, with a bigger question behind it: what is a contract in this system, and what does it cause to happen? | The system must create a contract for a selected customer with a title, start date, expiration date, contract value, and billing frequency when the administrator submits the contract form. |
| FR-020 | Allow the administrator to edit a contract before it expires | ⚠️ | Good guard, unclear scope. Which fields, and can the expiration date itself be extended? | The system must allow the administrator to edit a contract's title, expiration date, and value while its expiration date is in the future, and must reject edits to an expired contract. |
| FR-021 | Allow the administrator to archive a contract | ⚠️ | Same as FR-014: name what archiving actually does. | The system must exclude an archived contract from active contract lists and from expiry notifications, while keeping it viewable on the customer record. |
| FR-022 | Associate each contract with exactly one customer | ✅ | A cardinality rule stated plainly. This one goes straight into your schema as a foreign key. | Keep as is. |
| FR-023 | Record the contract start date | ❌ | This is a column in your contracts table, not a requirement. On a real team nobody writes a ticket for "store a date"; it comes free with the create-contract ticket. | Fold into FR-019. |
| FR-024 | Record the contract expiration date | ❌ | Same. | Fold into FR-019. |
| FR-025 | Notify the administrator before a contract expires | ⚠️ | Before by how long, and notify through what? "Before it expires" could mean the morning of. A tester has nothing to set their clock to. | The system must send the administrator an email notification 30 days and 7 days before a contract's expiration date, and must record that the notification was sent. |

### Module 5: Invoice Management

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-026 | Allow the administrator to create an invoice | ❌ | This is the centre of your entire project and it is four words long. An invoice has a customer, a date, a due date, a currency, and a list of things being charged for. Nothing here says any of that, and no other FR fills the gap: FR-031 promises to total up line items that no requirement ever creates. Compare it to FR-003, where you named two numbers without being asked. Bring that same energy here. | The system must create an invoice for a selected customer with an issue date, a due date, and one or more line items (description, quantity, unit price), assigning it the next number from the configured invoice sequence, when the administrator submits the invoice form. Add a second FR: the system must allow the administrator to add, edit, and remove line items on an invoice that has not been issued. |
| FR-028 | Allow editing an invoice before it is issued | ⚠️ | The guard is right, but "issued" is a state your document never defines and no requirement ever moves an invoice into. Draft and issued are different things and the difference matters legally, because an issued invoice number cannot be reused. | Add the missing action first: the system must issue an invoice, locking its number and line items and setting its issue date, when the administrator confirms it. Then keep this rule: the system must allow editing an invoice only while its status is draft. |
| FR-029 | Prevent modification of fully paid invoices | ✅ | Correct and necessary. | Keep as is. |
| FR-030 | Allow cancellation of unpaid invoices | ✅ | Good. Decide the middle case: a customer paid 40% and then cancelled. Allowed or not? | Keep as is, and answer the partial-payment case. |
| FR-031 | Calculate the invoice total automatically | ❌ | Total of what? No requirement in your document creates line items, so this calculation has no inputs. This is the clearest example of what happens when the create FR is left empty: everything downstream floats. | The system must calculate the invoice total as the sum of its line items (quantity x unit price), minus any discount, plus applicable tax, and must recalculate whenever a line item, discount, or tax rate changes. |
| FR-032 | Calculate taxes when applicable | ❌ | "When applicable" hands the decision to the developer. Applicable to what, at what rate, on which base? | The system must apply the configured tax rate to the invoice subtotal after any discount, and must store the tax amount and the rate used on the invoice at the time it is issued. |
| FR-033 | Calculate discounts when applied | ❌ | Percentage or fixed amount? Per line or whole invoice? And notice that FR-032 and FR-033 together do not say which is applied first. Tax then discount and discount then tax give different totals, and that difference is real money on the client's invoice. | The system must allow a discount to be applied to an invoice as either a percentage of the subtotal or a fixed amount, and must apply it to the subtotal before tax is calculated. |
| FR-034 | Associate each invoice with one customer | ✅ | Another clean cardinality rule. | Keep as is. |
| FR-035 | Store the invoice issue date | ❌ | Column, not requirement. It belongs to the issue action. | Fold into the issue FR above. |
| FR-036 | Store the invoice due date | ❌ | Column, and it hides a better question: is the due date typed in every time, or derived from payment terms (net 15, net 30) on the customer? For a system whose goal is getting paid faster, payment terms are worth a real requirement. | Fold into FR-026, and consider: the system must default an invoice's due date to the issue date plus the customer's configured payment terms, allowing the administrator to override it. |
| FR-037 | Export an invoice as PDF | ⚠️ | Two things. What is on the PDF (your business info from FR-066, the line items, the totals, the due date, how to pay)? And exporting is not sending. This requirement ends with a file on the administrator's laptop. See gap 1. | The system must generate a PDF of an issued invoice containing the business details, customer details, invoice number, issue and due dates, line items, subtotal, discount, tax, total, and remaining balance. |

### Module 6: Installment Management

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-040 | Allow an invoice to be divided into multiple installments | ⚠️ | Who decides the split, and the rule everyone forgets: must the installments sum to the invoice total? If nothing enforces that, you will ship a system where a 1,000 invoice has installments adding to 900 and nobody notices until the client is short. | The system must allow the administrator to divide an issued invoice into two or more installments, each with an amount and a due date, and must reject the schedule when the installment amounts do not sum exactly to the invoice total. |
| FR-041 | Record the amount of each installment | ❌ | Column. It comes free with FR-040. | Fold into FR-040. |
| FR-042 | Record the due date of each installment | ❌ | Column. | Fold into FR-040. |
| FR-043 | Display the payment status of each installment | ⚠️ | Which statuses exist? Same undefined-status problem as FR-017 and FR-064. | The system must display each installment with its amount, due date, amount paid, and status (unpaid, partially paid, paid, or overdue). |
| FR-044 | (missing) | | The number is skipped. If you deleted a requirement, fine, but do not renumber around it silently. | |
| FR-045 | Automatically update the remaining invoice balance after a payment | ⚠️ | This is FR-048 written a second time, in a different module. Pick one home for it (payments) and delete the other. What is genuinely missing here is the installment version: when a payment arrives, which installment does it pay off? | Delete this line and instead write: the system must allocate a recorded payment to the oldest unpaid installment first, carrying any remainder to the next installment. |

### Module 7: Payment Management

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-046 | Record the payment method and date | ⚠️ | You wrote the two smallest fields and left out the two that matter: the amount, and which invoice it is against. Read the line on its own and it records a payment of no money belonging to nobody. | The system must record a payment against a specified invoice with an amount, a payment date, and a payment method (cash, bank transfer, cheque, or card) when the administrator submits the payment form. |
| FR-047 | Allow partial payments | ✅ | Correct and it is why the balance logic below exists. | Keep as is. |
| FR-048 | Calculate the remaining balance after each payment | ⚠️ | Content is right, but it needs the rule that stops the obvious bug: what happens when someone records a payment larger than the balance? Right now you get a negative balance and a "fully paid" invoice that owes money back. | The system must recalculate an invoice's remaining balance as the total minus the sum of payments recorded against it, and must reject a payment whose amount exceeds the current remaining balance. |
| FR-049 | Mark an invoice as fully paid once its remaining balance reaches zero | ✅ | A state transition with a trigger. This is exactly the shape a good FR has. | Keep as is. |
| FR-050 | Maintain the complete payment history for each invoice | ✅ | Right instinct for money records: never overwrite, always append. | Keep as is. |

### Module 8: Reminder System

This module is where your business goal lives or dies. Read gap 1.

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-051 | Allow the administrator to configure payment reminder schedules | ⚠️ | Duplicates FR-069 ("configure reminder intervals"). Also, a configurable setting with no stated default cannot be tested on a fresh install, because a tester has no number to check against. | The system must allow the administrator to configure the reminder schedule as a set of offsets relative to the due date, defaulting to 7 days before, on the due date, and 3, 14, and 30 days after. Delete FR-069. |
| FR-052 | Notify the administrator before an invoice reaches its due date | ❌ | Wrong recipient, and no number. Your client wants to be paid sooner. Telling the owner that money is due next week just moves the chasing back onto the owner, which is the job the software was supposed to take over. | The system must send the customer an email reminder with the invoice PDF and the amount due, 7 days before the invoice due date, when the invoice is not fully paid. |
| FR-053 | Notify the administrator when an invoice becomes overdue | ❌ | Same. Keep an admin alert if you want, but it cannot be the only thing that happens when an invoice goes late. | The system must send the customer an email reminder on each configured overdue offset while the invoice remains unpaid, and must show the invoice in the administrator's overdue list. |
| FR-054 | Record the reminder history for each invoice | ✅ | And it is what makes FR-055 buildable. Good chain. | Keep as is. |
| FR-055 | Prevent duplicate reminders from being generated on the same scheduled date | ✅ | 3anjad, this is a requirement most seniors forget to write until the day a customer gets the same email six times because a job retried. | Keep as is. |

### Module 9: Reports

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-056 | Display monthly revenue | ⚠️ | Revenue invoiced, or revenue collected? Those are two different numbers and confusing them is how a business thinks it had a good month while the bank account says otherwise. | The system must display, for a selected month, the total amount invoiced and the total amount collected, as two separate figures. |
| FR-057 | Display outstanding balances | ⚠️ | Duplicates FR-007. Keep one, and say whether this view is per customer or a single total. | The system must display each customer's total outstanding balance, sorted highest first. |
| FR-058 | Display overdue invoices | ⚠️ | Duplicates FR-009. | Delete, or state what this view adds over the dashboard (for example an ageing breakdown: 1 to 30, 31 to 60, 60+ days). |
| FR-059 | Display payments received during a selected period | ✅ | Fine. | Keep as is. |
| FR-060 | Allow reports to be filtered by date range | ⚠️ | This is a modifier on the three requirements above rather than its own feature. Not wrong, just say which reports it applies to. | Fold the date range into FR-056, FR-057, and FR-059. |
| FR-061 | Export reports | ❌ | To what format, and which reports? "Export" without a format is not buildable. | The system must export the selected report as a CSV file containing the same rows and columns shown on screen. |

### Module 10: Search

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-062 | Allow searching invoices by invoice number | ✅ | Clear. | Keep as is. |
| FR-063 | Allow searching invoices by customer | ✅ | Clear. Partial name match, same as FR-016. | Keep as is. |
| FR-064 | Allow filtering invoices by payment status | ⚠️ | Third time the statuses go undefined. Your invoice lifecycle is draft, issued, partially paid, paid, overdue, cancelled. Write that list down once, in one place, and every filter in the document inherits it. | The system must allow filtering invoices by status, where status is one of draft, issued, partially paid, paid, overdue, or cancelled. |
| FR-065 | Allow filtering invoices by issue date | ⚠️ | A single date or a range? A single-date filter on invoices is almost never what anyone wants. | The system must allow filtering invoices by an issue-date range with a start and end date. |

### Module 11: Settings

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-066 | Allow the administrator to update business information | ⚠️ | Which fields? This matters more than it looks, because these are the fields printed at the top of every PDF invoice in FR-037. | The system must allow the administrator to update the business name, address, phone, email, tax registration number, and logo, and must use these values on generated invoice PDFs. |
| FR-067 | Allow the administrator to configure invoice numbering | ⚠️ | Configure how? A prefix, a starting number, a reset each year? And the rule underneath it: invoice numbers usually must be sequential with no gaps, which means a cancelled invoice keeps its number. | The system must allow the administrator to configure an invoice number prefix and starting sequence, and must assign numbers sequentially without reusing a number from a cancelled invoice. |
| FR-068 | Allow the administrator to configure tax rates | ⚠️ | One rate or several? And the trap: the client changes the rate from 11% to 15% on Monday. What happens to invoices issued last month? They must not change. That is why FR-032 above stores the rate on the invoice. | The system must allow the administrator to configure the default tax rate, applying it only to invoices issued after the change. |
| FR-069 | Allow the administrator to configure reminder intervals | ⚠️ | Same requirement as FR-051. | Delete, keep FR-051. |

### Module 12: CSV

Nine requirements. Read the versioning table: this module is out of scope for this
cycle, and I would not spend more revision time on it now. Two notes for whenever it
does come back.

| # | Your draft | Verdict | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- |
| FR-075 | Import invoice records from a CSV file | ⚠️ | Import is the hardest feature in this document by a distance, because it has to create valid invoices without going through any of the rules in Module 5. | Defer to v2. |
| FR-076 | Validate invoice fields, customer references, dates, amounts, payment status on import | ⚠️ | Validating is half the requirement. The other half is what happens to row 47 when it fails: reject the whole file, or import the other 200 rows and report the failure? Those are different products. | The system must reject an entire CSV import when any row fails validation, and must display the row number and reason for each failure. |
| FR-077 | Export invoice records as a CSV file | ✅ | Fine, and much simpler than import. | Keep as is. |
| FR-079 | Import payment records from a CSV file | ⚠️ | Same as FR-075, plus: an imported payment has to hit the same balance and status rules as FR-048 and FR-049, or your totals silently diverge. | Defer to v2. |
| FR-080 | Validate payment amounts, dates, methods, invoice references on import | ⚠️ | Same all-or-nothing question as FR-076. | Defer to v2. |
| FR-081 | Export payment records as a CSV file | ✅ | Fine. | Keep as is. |
| FR-083 | Import customer records from a CSV file | ⚠️ | The one import worth having on day one, because the client already has their customer list in a spreadsheet somewhere. | Keep for v1.1 if the client has an existing list. |
| FR-084 | Validate required customer fields on import | ⚠️ | "Required fields" are never named, here or in FR-012. Name them once in FR-012 and this line can point at that. | Defer, and fix FR-012 first. |
| FR-085 | Export customer records as a CSV file | ✅ | Fine. | Keep as is. |

**FR tally:** 74 written, numbered up to FR-085 with eleven IDs skipped (027, 038, 039,
044, 070 to 074, 078, 082). Fold the column-style FRs into their parent create actions
and delete the four duplicate pairs and you land near 55 real requirements. The
versioning table cuts v1 to about 15 of them.

One process note on those skipped numbers. IDs become ticket numbers, commit messages,
and test names, so a gap turns into a question someone asks in a meeting six weeks from
now: was FR-039 deleted, or is it sitting in a draft nobody merged? If you removed them on purpose, keep them in the document with a one-line
"removed, superseded by FR-0xx". If you skipped them by accident, renumber cleanly now
while it is still free.

---

## Non-Functional Requirements

| # | Your draft | Bucket | Testable? | What's off | Industry-standard rewrite |
| --- | --- | --- | --- | --- | --- |
| NFR-PERF-001 | API responses within 500ms for at least 95% of requests under normal operating conditions | Performance | ✅ yes | A number, a percentile, and a stated condition. This is the standard the rest of your NFRs should be measured against. | Keep as is. Define "normal operating conditions" once (for example: the data volumes in NFR-SCAL-001, single concurrent admin). |
| NFR-PERF-002 | Dashboard loads within 2 seconds for at least 95% of page loads | Performance | ✅ yes | Same quality. Worth noting your dashboard runs six aggregate queries (FR-006 to FR-011), so this one will bite you if you build it naively. | Keep as is. |
| NFR-REL-001 | Maintain full monthly availability | Reliability | ❌ no | "Full" means 100%, and nobody promises 100%, not AWS, not Google. It is also the one NFR here with no number at all, sitting between two that have them. A tester reads this and has nothing to measure; worse, one restart to deploy a fix technically fails it. | The system must maintain at least 99% availability measured monthly, excluding scheduled maintenance announced 24 hours in advance. |
| NFR-REL-002 | Store successfully committed invoice, payment, customer, and contract data after restarts or unexpected shutdowns | Reliability | ⚠️ close | The right concern, and the word "committed" shows you know where the line is. What stops it being testable is that it does not say what a tester should do or see. Durability requirements are verified by breaking something on purpose. | The system must retain every committed invoice, payment, customer, and contract record after an unexpected process termination, verified by killing the application mid-transaction, restarting, and confirming no committed record is lost or duplicated. |
| NFR-REL-003 | Return a user-friendly error response when a database or external service becomes unavailable | Reliability | ⚠️ close | "User-friendly" is the same class of word as "fast". Say what the response contains and what it must not contain, and it becomes checkable. | The system must return an error page with a plain-language message and a reference code, and must not expose stack traces, SQL, or connection strings, when the database or an external service is unavailable. |
| NFR-SEC-001 | Store passwords using a password hashing algorithm, never plaintext | Security | ⚠️ close | Half testable. "Never plaintext" a tester can verify by reading the table. "A password hashing algorithm" they cannot, because MD5 is a hashing algorithm and it would pass this sentence. Name the algorithm and the cost factor. | The system must store administrator passwords hashed with bcrypt at a cost factor of at least 12, and must never store or log a password in plaintext. |
| NFR-SEC-002 | Terminate an authenticated session after 30 minutes of inactivity | Security | ✅ yes | Number, trigger, done. | Keep as is. |
| NFR-SCAL-001 | Support at least 200 customers and 200 invoices without requiring changes to business logic | Capacity | ⚠️ close | Sizing it to a small business is the correct instinct. But 200 invoices is a ceiling the client hits in one year and then keeps going, and invoices are the table that grows forever. Also "without requiring changes to the business logic" is not measurable; tie the volume to the performance targets instead. | The system must meet the NFR-PERF targets with 500 customers, 10,000 invoices, and 25,000 line items stored. |
| NFR-SCAL-002 | Support at least 1000 payment records while maintaining the defined performance targets | Capacity | ✅ yes | This one is written correctly: a volume tied to an existing performance target. Note it sits oddly next to NFR-SCAL-001 (200 invoices but 1,000 payments); with installments that is defensible, just make the two numbers consistent on purpose rather than by accident. | The system must meet the NFR-PERF targets with 50,000 payment records stored. |
| NFR-USA-001 | An administrator shall be able to create a customer and create an invoice very smoothly | Usability | ❌ no | **fi 3na mshkle bi ttbi2 hon.** "Very smoothly" is a feeling. Picture the acceptance meeting: the tester creates an invoice, turns to you, and asks whether that was smooth. Nobody can answer, so the requirement gets ticked off out of politeness and means nothing. Usability is measured in time, clicks, and error rate. | The system must allow an administrator to create a customer and issue an invoice to them in under 3 minutes and no more than 12 clicks, verified with two people who have not used the system before. |
| NFR-USA-002 | (missing) | | | Skipped ID, same note as the FRs. | |
| NFR-USA-003 | Display validation errors next to the relevant input fields with a clear description of the required correction | Usability | ✅ yes | Location and content, both observable. A tester submits a bad form and looks. | Keep as is. |
| NFR-MNT-001 | Maintain automated tests covering at least 70% of backend business-logic code | Maintainability | ✅ yes | A number and a scope. Worth adding which paths must be covered regardless of the percentage, because 70% coverage that skips the money maths is 70% of nothing. | The system must maintain at least 70% automated test coverage of backend business-logic code, including full coverage of invoice total, tax, discount, and balance calculations. |
| NFR-COMP-001 | Operate correctly on Google Chrome and Microsoft Edge | Compatibility | ⚠️ close | No versions, and here is the thing worth knowing: Chrome and Edge both run on Chromium, so testing both is close to testing one twice. If the client uses Safari on an iPhone or Firefox on a laptop, this requirement never catches it. | The system must function correctly on the latest two major versions of Chrome, Edge, Firefox, and Safari. |
| NFR-COMP-002 | Provide a responsive interface usable on desktop, tablet, and mobile screen sizes | Compatibility | ⚠️ close | Three words that mean different widths to different people. Pin it to pixels and the test is "resize the window and look". | The system must render all pages without horizontal scrolling and with all controls reachable at viewport widths of 375px, 768px, and 1440px. |
| NFR-ACC-001 | All interactive controls shall have accessible names that clearly describe their purpose | Accessibility | ⚠️ close | Good that this bucket exists at all; most drafts have nothing here. To make it verifiable, point at the standard and the tool, so "accessible name" stops being your opinion. | The system must meet WCAG 2.1 Level AA for name, role, and value on all interactive controls, verified with an automated accessibility scan reporting zero violations of that rule. |
| NFR-ACC-002 | Form validation errors shall be presented in a way that can be identified by users | Accessibility | ❌ no | "Can be identified by users" is circular: every visible error can be identified by someone. What you mean, and it is the right thing to mean, is that a screen reader announces it. Say that. | The system must associate each validation message with its input programmatically, so that a screen reader announces the error when focus moves to the field. |

**Coverage by bucket:** Performance ✅, Security ✅, Reliability ✅, Capacity ✅,
Usability ✅, and you added Maintainability, Compatibility, and Accessibility on top.
Eight buckets for a student draft is genuinely above the level I usually see, so the
work left here is sharpening, not adding. Two exceptions worth writing from scratch:

Your Security bucket has authentication but no **authorization**. Every FR in this
document says "the administrator", which means you have quietly assumed a single-user
system and never written it down. If a second person (an accountant, an assistant) ever
logs in, nothing in these 16 NFRs stops them from deleting a contract. Either state the
assumption ("the system supports exactly one administrator account in v1") or write the
access-control requirement.

There is also no Security NFR about the data itself. You are storing customer names,
addresses, phone numbers, and their full payment history. Encryption in transit is one
line and it belongs here.

---

## What's missing

1. Which business is this, and what is its one goal? Thirteen pages and the client
   is never named. Every requirement in a real spec is judged against the client's
   goal, and a reader who has not met you cannot do that here. One paragraph at the top:
   the business, the pain they have today, and the one thing this system must improve.
   Everything below it then has something to be measured against.

2. How does the invoice actually reach the customer? This is the big one. Walk your
   own document: FR-026 creates an invoice, FR-031 totals it, FR-037 exports a PDF,
   FR-052 and FR-053 tell the administrator it is due. At no point does anything leave
   the building. Your goal is Generate More Money, and the mechanism for that is
   getting paid faster, which means the customer has to receive the invoice and receive
   the reminders. Right now you have automated the *watching* and left the *chasing* to
   the owner, who was already doing it by hand for free. Write the send FR and turn
   FR-052 and FR-053 around to face the customer. If you only fix one thing from this
   whole document, fix this.

3. What is a contract for? Seven requirements create, edit, archive, date, and
   expire a contract, and not one requirement anywhere uses one. No invoice is generated
   from a contract, no contract value is compared against what has been billed. So
   either the module is seven requirements of dead weight, or it is hiding the feature
   you have not written yet: recurring billing. If the client has customers on monthly
   retainers, then "the system must generate an invoice automatically on the contract's
   billing date" is one of the most valuable requirements you could write, and it is
   the one that would most directly serve your goal. Ask the client which it is.

4. Where do the numbers on an invoice come from? FR-031 totals line items that no
   requirement creates. FR-032 and FR-033 apply tax and discount without saying in which
   order. FR-040 splits an invoice into installments without requiring them to sum to
   the total. FR-048 subtracts payments without stopping an overpayment. Each of these
   is a place where the arithmetic can silently produce a wrong number on a document
   your client sends to a paying customer. Money maths needs requirements written to the
   same precision you gave FR-003.

5. Who else touches this system? Every FR says "the administrator", singular. Is
   that a real constraint from the client, or an assumption you drifted into? If a
   second person ever logs in, none of your requirements says what they can and cannot
   do. Write the assumption down either way, because the ones nobody writes down are
   the ones that surprise the team later.

Gaps 1, 2, and 4 are things to fix in the document before you touch a schema. Gaps 3
and 5 are questions to take to the client, because each one changes your tables.

---

## Versioning: shrink it to an MVP

Anchored to the one goal: **Generate More Money**, which for an invoicing system means
one thing, money that is owed arrives sooner and none of it gets forgotten.

| Feature (from your FRs) | Must (v1) | Should (v1.1) | Could (v2) | Won't (now) |
| --- | :---: | :---: | :---: | :---: |
| Admin login, logout, session timeout (FR-001, FR-002, FR-004, FR-005) | ✅ | | | |
| Create and edit a customer with contact details (FR-012, FR-013) | ✅ | | | |
| Create an invoice with line items, dates, and a customer (FR-026 rewritten) | ✅ | | | |
| Issue an invoice: lock it, assign its number, set the issue date (**missing, add it**) | ✅ | | | |
| Calculate subtotal, discount, tax, total in a defined order (FR-031, FR-032, FR-033) | ✅ | | | |
| Generate the invoice PDF (FR-037) | ✅ | | | |
| Send the invoice to the customer by email (**missing, add it**) | ✅ | | | |
| Record a payment against an invoice, including partial (FR-046, FR-047) | ✅ | | | |
| Remaining balance and automatic paid status (FR-048, FR-049) | ✅ | | | |
| Automatic reminders to the **customer** before and after the due date (FR-052, FR-053 turned around) | ✅ | | | |
| Dashboard: outstanding total and the overdue list (FR-007, FR-009) | ✅ | | | |
| Guards: no editing issued or paid invoices, cancel unpaid only (FR-028, FR-029, FR-030) | | ✅ | | |
| Reminder schedule config and reminder history (FR-051, FR-054, FR-055) | | ✅ | | |
| Business info and invoice numbering settings (FR-066, FR-067) | | ✅ | | |
| Tax rate setting (FR-068) | | ✅ | | |
| Search invoices by number and customer, filter by status (FR-062, FR-063, FR-064) | | ✅ | | |
| Customer search and their invoice list (FR-016, FR-018) | | ✅ | | |
| Payment history per invoice (FR-050) | | ✅ | | |
| Login lockout after failed attempts (FR-003) | | ✅ | | |
| Import the client's existing customer list from CSV, once (FR-083, FR-084) | | ✅ | | |
| Recurring invoices generated from a contract (**see gap 3**) | | ✅ | | |
| Archive customers and the unpaid-invoice guard (FR-014, FR-015) | | | ✅ | |
| Installments (FR-040 to FR-045) | | | ✅ | |
| Contracts as records: create, edit, archive, expiry alerts (FR-019 to FR-025) | | | ✅ | |
| Rest of the dashboard tiles (FR-006, FR-008, FR-010, FR-011) | | | ✅ | |
| Reports module and date-range filtering (FR-056 to FR-060) | | | ✅ | |
| Filter customers by status, filter invoices by date (FR-017, FR-065) | | | ✅ | |
| Reminder interval config as a separate screen (FR-069) | | | | ✅ |
| CSV import and export for invoices and payments (FR-075 to FR-082) | | | | ✅ |
| Customer CSV export and report export (FR-061, FR-085) | | | | ✅ |
| Online card payment, customer portal, multi-user roles | | | | ✅ |

**Read on scope:** eleven Must-haves, and I know the guidance says three to five. I am
not going to pretend an invoicing system fits in five, because the money loop has a
fixed number of steps: make the invoice, send it, chase it, record what came in, show
what is still owed. Cut any one of those and the product does not work. What I want you
to see is that two of your eleven Must-haves are requirements you have not written yet
(issue and send), while five entire modules moved to Could or Won't. That is the actual
shape of the problem. You wrote depth in the places that were easy to enumerate,
settings, reports, search, CSV, and left the spine thin.

The clearest example is Module 12. Nine requirements, roughly one eighth of your
document, for reading and writing spreadsheets. CSV import is a migration task the
client does once and never again, and it is the hardest thing on your list to build
correctly, because imported rows have to satisfy every rule in Module 5 without going
through the screens that enforce them. Nine requirements of high difficulty and near
zero contribution to getting paid faster. That is what over-scoping looks like from the
inside: it never feels like padding while you are writing it.

Installments is the row I am least sure about, so treat it as parked rather than cut.
Six requirements, and it doubles the complexity of your money model, because now every
payment has to be allocated to a specific installment and every reminder has to fire per
installment instead of per invoice. That is worth building if the client actually sells
in installments as their normal way of doing business. If it is an occasional favour to
two customers, it is v2. Ask them, then move the row.

**Downstream cost:** the Must-have list gives you six tables (users, customers,
invoices, invoice_items, payments, reminders) and roughly 15 endpoints. That is a schema
you can design in one sitting and an API you can finish. All 74 FRs give you eleven or
twelve tables (add contracts, installments, settings, reports, csv_import_jobs) and
comfortably 50 endpoints, which at your pace is a semester you spend on plumbing and no
working product at the end. You will do roughly the same amount of work either way. What
changes is how much of it the client ever gets to use.

Notice also what the cut buys you in the schema. Dropping installments for v1 removes a
whole table and, more importantly, removes the payment allocation logic, which is the
single trickiest piece of code in this entire project. You can add it in v2 without
restructuring anything, because a payment already belongs to an invoice. Features that
slot in later without moving your existing tables are exactly the ones that are safe to
defer. Test every deferral against that question when you design the schema.

---

## Next step

Fix these five in the document, in this order: name the client and the goal at the top,
write FR-026 and the issue action properly with line items, turn FR-052 and FR-053
around to face the customer and add the send FR, define your invoice status list once
so FR-017, FR-043, and FR-064 can point at it, and put numbers on NFR-REL-001,
NFR-USA-001, and NFR-ACC-002. Then take the contract question and the installments
question to the client, since both decide tables.

What I want you to take from this round is where your good work went. FR-003, FR-015,
FR-029, FR-049, FR-055: those are careful, specific requirements that someone could
build and test tomorrow, and they show you understand what a requirement is supposed to
do. Then FR-026, the one at the centre of the whole system, is four words. You clearly
know how to write a good requirement, so the gap is not skill. What happened is that the
easy modules got the attention and the hard one got postponed, which is the most normal
thing in the world and also the exact habit that decides whether a project ships. Spend
your revision time on the spine.
