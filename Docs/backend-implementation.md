# Backend V1 implementation

The authoritative inputs are `Docs/invoice-management-system-api-v1-final.yaml`
and `src/prisma/schema.prisma`. Both were read completely before implementation.
The backend directories were empty; the generated Prisma 6.19.3 client
is under `src/app/generated/prisma`. The seed is not an application singleton.

## Architecture and implementation order

1. Shared Prisma singleton, transaction support, domain errors, Zod validation,
   lossless JSON formatting, and JWT/bcrypt/session authentication.
2. Customers and contracts: business-scoped access, filters, pagination,
   archive/unarchive rules, and preserved history.
3. Invoices and payments: Decimal calculations, derived overdue data, immutable
   issued financial content, atomic numbering and payment transitions.
4. Settings, templates, delivery/reminder/notification history, PDF and email.
5. Dashboard and reports, followed by contract coverage and integration checks.

Route files live in `src/app/api/v1`, HTTP helpers in `src/app/api/_lib`,
business logic in `src/services`, data access in `src/repository`, and shared
Zod input schemas/application types in `src/types`. Services have no HTTP
dependencies; routes do not query Prisma. Frontend files are unchanged.

### Classes, interfaces, and dependency injection

Domain operations now live on service instances, such as `CustomerService`,
`InvoiceService`, and `PaymentService`. The core customer/invoice/payment service
contracts are in `src/types/services.ts`. Repository contracts are in
`src/types/repositories.ts`; each `Prisma*Repository` class implements its
corresponding interface. These contracts reuse the current Prisma model and
input types; they do not claim to be independent of Prisma's type system.

Constructors receive dependencies through interfaces. For example,
`CustomerService` receives `ICustomerRepository` and `IUnitOfWork`. Its archive
operation uses `unitOfWork.run(...)`; the callback receives repositories bound
to one transaction. `PrismaUnitOfWork` preserves serializable isolation and
conflict retries. Services cannot accidentally create a new database connection
inside that callback through a repository factory.

`src/services/container.ts` wires the concrete implementations and exports
`services`. A route calls `services.customers.createCustomer(actor, body)`.
Repository database access and SMTP setup remain lazy. Instances store
dependencies, while request-specific identity and data stay in method arguments.
`IEmailSender`, `IInvoicePdfRenderer`, and `ISchedulerLock` make external
dependencies replaceable. `createServices({ email, pdf })` supports test providers.

Next.js route exports remain functions as required by the framework. Decimal
calculations, date helpers, validation, and DTO mapping remain pure functions.
There is no generic CRUD superclass: each class expresses its domain's operations.

## Resolved contract conflicts

| Operation/model | Original OpenAPI expectation | Prisma definition | Approved resolution |
| --- | --- | --- | --- |
| POST /customers / Customer | `type` is optional, no default | `customerType` is required, no default | API default is `individual`. |
| GET /customers/{customerId}/invoices / Invoice | All customer invoices; summary requires non-null number/date | Draft number/date are null | Permit null number/date in CustomerInvoiceSummary. |
| GET /dashboard / Invoice | Overdue rule includes drafts, but dashboard invoice numbers are non-null | Draft invoiceNumber is null | Permit null dashboard numbers, preserving the stated overdue rule. |
| Financial writes / Invoice, InvoiceItem, Payment, Contract, SystemSetting | Numeric input has no scale/upper bounds; no calculation rounding policy | Money and quantity are Decimal(12,2), tax is Decimal(5,2) | Two-decimal inputs with storage bounds; half-up to two decimals at line, discount, and tax stages. |
| PUT /settings/business / Business | logoUrl is an unrestricted string | logoUrl is VarChar(500) | Add maxLength 500 to the API. |

Additional contract ambiguity: PATCH /invoices/{invoiceId} documents both 409
and 422 for `INVOICE_NOT_EDITABLE`. The user selected **422**, which is implemented
and verified by integration tests. The existing documented 409 alternative was
not removed without a separate instruction to edit that response list.

The user explicitly approved the listed OpenAPI clarifications during this task.
Those YAML edits have been applied. Prisma models, enums, and migrations are
unchanged. No identified API/Prisma conflict remains blocked.

## Existing environment observations

- Zod is now a direct project dependency.
- The seed contains placeholder password/refresh hashes, not usable credentials.
  It also deletes business rows before customers; it must not be run as a check.
- The existing PostgreSQL adapter is version 7 while Prisma is version 6. The
  application can use the generated Prisma 6 classic engine without that adapter.
- The compiler is TypeScript 5.9; the invalid `ignoreDeprecations: 6.0` entry was
  removed so the type checker can run.

## Coverage and validation

For the OOP refactor, TypeScript passes and ESLint reports no errors (one warning
in the separately edited `src/config/index.ts`). The unit/contract/service suite
passes 14 tests. The new
service tests cover outstanding balances, business isolation, and use of the
transaction's repository rather than the service's nontransactional repository.
The PostgreSQL integration suite was updated to inject email/PDF providers through
constructors, but could not be rerun because Docker Desktop's engine was unavailable.
The production build and HTTP smoke checks were not rerun for this refactor.
The results below describe the original implementation's verification.

All **47 operations across 36 paths** are implemented. There are no unimplemented
OpenAPI endpoints or intentional code TODOs. See [the endpoint coverage table](backend-coverage.md)
for route, validation, service, and repository mappings.

- TypeScript: passed, including generated Next.js route types.
- ESLint: passed.
- Unit/contract suite: 11 tests passed. Includes exact JSON int64/Decimal values,
  financial rounding/overflow, overdue rules, schemas, JWT checks, error redaction,
  and an independent comparison of every route against the OpenAPI document.
- PostgreSQL integration suite: 10 workflow groups plus the enclosing test passed.
  Every JSON response exercised is validated against its actual OpenAPI response
  schema. Successful HTTP responses are covered for 46 operations. Invoice sending
  additionally covers successful/failed service execution with a stub email
  transport; its HTTP rejection path is covered. No real email was sent.
- Integration cases include five-attempt lockout, refresh/inactivity/logout,
  business isolation, concurrent payments rejecting overpayment, concurrent
  issuance producing unique numbers, history retention, settings, PDF bytes,
  reports, and repeated reminder runs without duplicate messages.
- Prisma validation and applying the unchanged schema to an isolated PostgreSQL
  18 test database: passed. The existing seed and application database were not used.
- Production build: passed; all API routes are dynamic Node.js route handlers.
  The subsequent live HTTP smoke test failed at login with a Prisma initialization
  error. Inspection found that the pre-existing generated client still referenced
  the old root-level `app/generated/prisma` location. `npm run prisma:generate`
  regenerated it at the unchanged schema's `src/app/generated/prisma` location.
  The user declined the follow-up rebuild, so production HTTP verification after
  that regeneration remains pending; do not treat the production smoke as passed.
- Dependency audit: three high-severity findings remain in the pre-existing
  `prisma -> @prisma/config -> deepmerge-ts` chain (one underlying advisory,
  GHSA-ggr8-5vv4-36mx). npm proposes a Prisma downgrade. No unrelated downgrade or
  unverified override was applied.

## Runtime configuration

Use the existing `.env` mechanism. Do not commit secrets.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection used by the generated Prisma 6 client. |
| `AUTH_JWT_SECRET` | Required random signing secret with at least 32 bytes. |
| `APP_ORIGIN` | Optional canonical browser origin, such as `https://invoices.example.com`, for authentication-origin checks behind a proxy. |
| `SMTP_HOST`, `SMTP_FROM` | Required to send invoice, reminder, or administrator email. |
| `SMTP_PORT` | Defaults to 587. |
| `SMTP_SECURE` | Set `true` for implicit TLS, usually port 465; otherwise STARTTLS is required. |
| `SMTP_USER`, `SMTP_PASSWORD` | SMTP authentication where required. |
| `SIGNIFICANTLY_OVERDUE_DAYS` | Required positive integer threshold when running the internal processor. No threshold is invented from the API. |
| `CONTRACT_EXPIRING_SOON_DAYS` | Required positive integer threshold when running the internal processor. |
| `PDF_FONT_PATH` | Optional deployed TTF/OTF font supporting your invoice languages. Default PDFKit Helvetica is suitable for Western Latin text. |
| `PDF_ASSET_ORIGINS` | Comma-separated trusted HTTPS origins for remote logos. Redirects are rejected. Local logos may reference files under `public/`; traversal/symlink escapes are rejected. |

After installation, run `npm run prisma:generate` with `DATABASE_URL` configured.
The initially present generated client contained stale pre-`src` paths; generation
is required before building on a fresh checkout.
Use your existing migration workflow for the application database. Provision a
real bcrypt password hash for the existing administrator, and ensure its business
exists; `hashed_password_123` in the example seed is not a login password/hash.
There is no registration endpoint in V1, so none was added.

Start the app using `npm run dev`, or `npm run build` followed by `npm start`.
The base path is `/api/v1`. Login returns a 15-minute JWT and sets the
`invoice_refresh` Secure/HttpOnly/SameSite=Strict cookie at `/api/v1/auth`.
Use HTTPS in deployment. Sessions expire after 30 days and after 30 minutes of
inactivity; protected requests and refreshes update activity. Logout also prevents
further use of access tokens tied to the revoked session.

Schedule `npm run reminders:process` externally, for example every few minutes.
This is a CLI worker, not a public endpoint. Configure SMTP and both notification
thresholds first. Reads of reminder/settings/history endpoints never send email.
The worker uses one PostgreSQL session advisory lock to prevent overlapping runs.
This is the only raw SQL and exists because Prisma has no advisory-lock operation.

Run checks with `npm run typecheck`, `npm run lint`, `npm test`, and
`npm run prisma:validate`. For integration tests, set `DATABASE_URL` to a separate
database named **invoice_api_test**, apply the schema there, and run
`npm run test:integration`. The test refuses any other database name. It creates
isolated business fixtures and does not delete existing records.

## Explicit implementation choices and practical limits

- Dates, overdue boundaries, report periods, and monthly totals use UTC calendar
  days; there is no business-timezone field in the authoritative schema.
- All financial calculations use Decimal. BigInt IDs remain JSON integer tokens,
  and decimals remain JSON number tokens. Clients handling IDs above JavaScript's
  safe-integer limit must use a lossless JSON parser.
- Contract references use `CTR-<UUID>` because the contract requires server-generated
  unique references without defining a sequence. Invoice numbers use
  `<prefix>-<sequence>`, or just the sequence if no prefix is configured.
- A missing SystemSetting is initialized using the business currency and schema
  defaults, with overdue reminder days `[3, 14, 30]` from the API. Existing seed
  JSON shaped as `{ "days": [...] }` is also read correctly.
- Archived customers/contracts are excluded from new business selections. Draft
  line-item arrays are replaceable; issued invoice content and historical payments
  are preserved. No business-resource delete endpoint exists.
- Outstanding balances include issued/partially-paid invoices with positive
  balances. Overdue uses the exact stated rule, including overdue drafts.
  Dashboard due-soon covers issued/partially-paid invoices due in 0–7 days.
- Financial report invoiced totals and status counts use the selected invoice
  issue-date range (drafts use creation date). Collections use paymentDate.
  Outstanding/overdue figures are current snapshots across the business, not a
  reconstruction of historical balances at the period end.
- Recent activity has at most 20 entries. Invoice issuance activity uses issueDate
  at UTC midnight: the schema has no independent timestamp for every issuance.
- Lists use deterministic ID/date ordering. Derived balance filters and reports
  currently load matching business records before calculating and paginating.
  This preserves correct totals but should be optimized for very large datasets.
- Only status `issued` is sendable, following the endpoint wording literally.
  Every eligible send attempt is recorded before PDF/email work. Failures are
  retained with a sanitized reason and return the documented generic 500 response.
- Reminder schedules begin on/after issuance and the current processing day;
  previously queued reminders can catch up after a worker outage. Past reminders
  are not backfilled in bulk on a worker's first run. Failed attempts are retained
  and not automatically retried. Cancellation, voiding, and payment completion
  cancel pending reminders atomically.
- SMTP acceptance followed by a crash before the database update can leave a
  pending attempt. Exactly-once delivery across SMTP and PostgreSQL is not possible
  with the current schema/provider contract; inspect such attempts before replay.
  Already in-flight email cannot be recalled by a concurrent cancellation.
- Administrator notification thresholds must be configured. Archived contracts
  are skipped, and eligible processing can resume on unarchive. Pending events
  that are no longer eligible are retained and skipped, preserving history.
- Supported template placeholders: `businessName`, `customerName`, `customerEmail`,
  `invoiceNumber`, `issueDate`, `dueDate`, `total`, `paidAmount`, `remainingBalance`,
  `paymentAmount`, `contractTitle`, `expirationDate`, `notificationType`.
  Legacy seed aliases `business_name`, `customer_name`, `invoice_number`, and
  `remaining_balance` are accepted. Unsupported placeholders are rejected;
  placeholders irrelevant to the current event render as empty text.
- Production SMTP connectivity and deployment scheduling require your environment;
  they were not exercised against a real mail provider during this implementation.

Implementation references checked alongside the installed Next.js documentation:
[lossless-json](https://github.com/josdejong/lossless-json) and
[jose](https://github.com/panva/jose).

## Suggested review order

Start with [the endpoint coverage table](backend-coverage.md), and compare one
operation with its OpenAPI definition. POST `/api/v1/customers` is a small example:

1. `src/app/api/v1/customers/route.ts`: selects the request schema and service.
2. `src/app/api/_lib/http.ts`: authentication, parsing, error mapping, and JSON.
3. `src/types/customers.ts`: reusable Zod request schemas and inferred types.
4. `src/types/services.ts` and `src/types/repositories.ts`: service and persistence interfaces.
5. `src/services/customers.ts`: `CustomerService`, business rules, and response mapping.
6. `src/repository/customers.ts`: `PrismaCustomerRepository` and business-scoped queries.
7. `src/services/container.ts`: constructor injection and concrete implementation wiring.
8. `src/prisma/client.ts`: the shared generated Prisma client instance.

Then follow `issueInvoice` and `createPayment` in the invoice/payment services,
with `services/financial.ts` and `repository/transaction.ts` beside them. These
show the lifecycle rules, Decimal arithmetic, and atomic writes. Finally, review
`tests/api.integration.test.ts` for complete request/response workflows, and
`tests/contract-helper.ts` for validation against the actual OpenAPI schemas.
`tests/services.test.ts` demonstrates testing `CustomerService` with interface
implementations, including archive balance checks and transaction-scoped access.
