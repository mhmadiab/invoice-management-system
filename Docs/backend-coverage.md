# V1 endpoint implementation coverage

All paths below are relative to `/api/v1`. All 47 operations are implemented in 36 route files.
Validation schemas are under `src/types`, services under `src/services`, and repositories under `src/repository`.
Every protected operation also uses `services/auth.ts` and `repository/auth.ts`.

| OpenAPI endpoint | Route file | Zod validation | Service | Repository | Status |
| --- | --- | --- | --- | --- | --- |
| `POST /customers` | [route.ts](../src/app/api/v1/customers/route.ts) | `createCustomerSchema` | `customers.createCustomer` | `customers.ts` | Implemented |
| `GET /customers` | [route.ts](../src/app/api/v1/customers/route.ts) | `customerQuerySchema` | `customers.listCustomers` | `customers.ts` | Implemented |
| `GET /customers/{customerId}` | [route.ts](../src/app/api/v1/customers/[customerId]/route.ts) | `customerParamsSchema` | `customers.getCustomer` | `customers.ts` | Implemented |
| `PATCH /customers/{customerId}` | [route.ts](../src/app/api/v1/customers/[customerId]/route.ts) | `customerParamsSchema`, `updateCustomerSchema` | `customers.updateCustomer` | `customers.ts` | Implemented |
| `POST /customers/{customerId}/archive` | [route.ts](../src/app/api/v1/customers/[customerId]/archive/route.ts) | `customerParamsSchema` | `customers.setCustomerArchived` | `customers.ts` | Implemented |
| `POST /customers/{customerId}/unarchive` | [route.ts](../src/app/api/v1/customers/[customerId]/unarchive/route.ts) | `customerParamsSchema` | `customers.setCustomerArchived` | `customers.ts` | Implemented |
| `GET /customers/{customerId}/invoices` | [route.ts](../src/app/api/v1/customers/[customerId]/invoices/route.ts) | `customerParamsSchema`, `paginationSchema` | `invoices.customerInvoices` | `invoices.ts`, `customers.ts` | Implemented |
| `GET /customers/{customerId}/contracts` | [route.ts](../src/app/api/v1/customers/[customerId]/contracts/route.ts) | `customerParamsSchema`, `customerContractQuerySchema` | `contracts.listContracts` | `contracts.ts`, `customers.ts` | Implemented |
| `POST /contracts` | [route.ts](../src/app/api/v1/contracts/route.ts) | `createContractSchema` | `contracts.createContract` | `contracts.ts`, `customers.ts` | Implemented |
| `GET /contracts` | [route.ts](../src/app/api/v1/contracts/route.ts) | `contractQuerySchema` | `contracts.listContracts` | `contracts.ts` | Implemented |
| `GET /contracts/{contractId}` | [route.ts](../src/app/api/v1/contracts/[contractId]/route.ts) | `contractParamsSchema` | `contracts.getContract` | `contracts.ts` | Implemented |
| `PATCH /contracts/{contractId}` | [route.ts](../src/app/api/v1/contracts/[contractId]/route.ts) | `contractParamsSchema`, `updateContractSchema` | `contracts.updateContract` | `contracts.ts` | Implemented |
| `POST /contracts/{contractId}/archive` | [route.ts](../src/app/api/v1/contracts/[contractId]/archive/route.ts) | `contractParamsSchema` | `contracts.setContractArchived` | `contracts.ts` | Implemented |
| `POST /contracts/{contractId}/unarchive` | [route.ts](../src/app/api/v1/contracts/[contractId]/unarchive/route.ts) | `contractParamsSchema` | `contracts.setContractArchived` | `contracts.ts` | Implemented |
| `POST /invoices` | [route.ts](../src/app/api/v1/invoices/route.ts) | `createInvoiceSchema` | `invoices.createInvoice` | `invoices.ts`, `customers.ts`, `contracts.ts`, `settings.ts` | Implemented |
| `GET /invoices` | [route.ts](../src/app/api/v1/invoices/route.ts) | `invoiceQuerySchema` | `invoices.listInvoices` | `invoices.ts` | Implemented |
| `GET /invoices/{invoiceId}` | [route.ts](../src/app/api/v1/invoices/[invoiceId]/route.ts) | `invoiceParamsSchema` | `invoices.getInvoice` | `invoices.ts` | Implemented |
| `PATCH /invoices/{invoiceId}` | [route.ts](../src/app/api/v1/invoices/[invoiceId]/route.ts) | `invoiceParamsSchema`, `updateInvoiceSchema` | `invoices.updateInvoice` | `invoices.ts` | Implemented |
| `POST /invoices/{invoiceId}/issue` | [route.ts](../src/app/api/v1/invoices/[invoiceId]/issue/route.ts) | `invoiceParamsSchema` | `invoices.issueInvoice` | `invoices.ts`, `settings.ts`, `notifications.ts` | Implemented |
| `POST /invoices/{invoiceId}/cancel` | [route.ts](../src/app/api/v1/invoices/[invoiceId]/cancel/route.ts) | `invoiceParamsSchema` | `invoices.cancelInvoice` | `invoices.ts` | Implemented |
| `POST /invoices/{invoiceId}/void` | [route.ts](../src/app/api/v1/invoices/[invoiceId]/void/route.ts) | `invoiceParamsSchema` | `invoices.voidInvoice` | `invoices.ts` | Implemented |
| `POST /invoices/{invoiceId}/send` | [route.ts](../src/app/api/v1/invoices/[invoiceId]/send/route.ts) | `invoiceParamsSchema` | `deliveries.sendInvoice` | `deliveries.ts`, `invoices.ts`, `settings.ts` | Implemented |
| `GET /invoices/{invoiceId}/deliveries` | [route.ts](../src/app/api/v1/invoices/[invoiceId]/deliveries/route.ts) | `invoiceParamsSchema` | `deliveries.invoiceDeliveries` | `deliveries.ts`, `invoices.ts` | Implemented |
| `POST /invoices/{invoiceId}/payments` | [route.ts](../src/app/api/v1/invoices/[invoiceId]/payments/route.ts) | `invoiceParamsSchema`, `createPaymentSchema` | `payments.createPayment` | `payments.ts`, `invoices.ts`, `settings.ts`, `notifications.ts` | Implemented |
| `GET /invoices/{invoiceId}/payments` | [route.ts](../src/app/api/v1/invoices/[invoiceId]/payments/route.ts) | `invoiceParamsSchema`, `paginationSchema` | `payments.invoicePayments` | `invoices.ts` | Implemented |
| `GET /invoices/{invoiceId}/reminders` | [route.ts](../src/app/api/v1/invoices/[invoiceId]/reminders/route.ts) | `invoiceParamsSchema`, `reminderQuerySchema` | `history.invoiceReminders` | `reminders.ts`, `invoices.ts` | Implemented |
| `GET /payments` | [route.ts](../src/app/api/v1/payments/route.ts) | `paymentQuerySchema` | `payments.listPayments` | `payments.ts` | Implemented |
| `GET /dashboard` | [route.ts](../src/app/api/v1/dashboard/route.ts) | No input body/parameters | `dashboard.dashboard` | `reports.ts` | Implemented |
| `GET /reports/financial-summary` | [route.ts](../src/app/api/v1/reports/financial-summary/route.ts) | `reportPeriodSchema` | `reports.financialSummary` | `reports.ts` | Implemented |
| `GET /reports/customer-balances` | [route.ts](../src/app/api/v1/reports/customer-balances/route.ts) | `paginationSchema` | `reports.customerBalances` | `reports.ts` | Implemented |
| `GET /reports/payments` | [route.ts](../src/app/api/v1/reports/payments/route.ts) | `paymentReportQuerySchema` | `reports.paymentReport` | `reports.ts` | Implemented |
| `GET /settings/business` | [route.ts](../src/app/api/v1/settings/business/route.ts) | No input body/parameters | `settings.getBusinessSettings` | `settings.ts` | Implemented |
| `PUT /settings/business` | [route.ts](../src/app/api/v1/settings/business/route.ts) | `businessSettingsSchema` | `settings.updateBusinessSettings` | `settings.ts` | Implemented |
| `GET /settings/invoice` | [route.ts](../src/app/api/v1/settings/invoice/route.ts) | No input body/parameters | `settings.getInvoiceSettings` | `settings.ts` | Implemented |
| `PUT /settings/invoice` | [route.ts](../src/app/api/v1/settings/invoice/route.ts) | `invoiceSettingsSchema` | `settings.updateInvoiceSettings` | `settings.ts`, `invoices.ts` | Implemented |
| `GET /settings/reminders` | [route.ts](../src/app/api/v1/settings/reminders/route.ts) | No input body/parameters | `settings.getReminderSettings` | `settings.ts` | Implemented |
| `PUT /settings/reminders` | [route.ts](../src/app/api/v1/settings/reminders/route.ts) | `reminderSettingsSchema` | `settings.updateReminderSettings` | `settings.ts` | Implemented |
| `GET /settings/notifications` | [route.ts](../src/app/api/v1/settings/notifications/route.ts) | No input body/parameters | `settings.getNotificationSettings` | `settings.ts` | Implemented |
| `PUT /settings/notifications` | [route.ts](../src/app/api/v1/settings/notifications/route.ts) | `notificationSettingsSchema` | `settings.updateNotificationSettings` | `settings.ts` | Implemented |
| `GET /settings/email-templates` | [route.ts](../src/app/api/v1/settings/email-templates/route.ts) | No input body/parameters | `settings.listEmailTemplates` | `settings.ts` | Implemented |
| `PUT /settings/email-templates/{templateType}` | [route.ts](../src/app/api/v1/settings/email-templates/[templateType]/route.ts) | `templateParamsSchema`, `emailTemplateSchema` | `settings.updateEmailTemplate` | `settings.ts` | Implemented |
| `GET /notifications` | [route.ts](../src/app/api/v1/notifications/route.ts) | `notificationQuerySchema` | `history.listNotifications` | `notifications.ts` | Implemented |
| `GET /notifications/{notificationId}` | [route.ts](../src/app/api/v1/notifications/[notificationId]/route.ts) | `notificationParamsSchema` | `history.getNotification` | `notifications.ts` | Implemented |
| `POST /auth/login` | [route.ts](../src/app/api/v1/auth/login/route.ts) | `loginSchema` | `auth.login` | `auth.ts` | Implemented |
| `POST /auth/refresh` | [route.ts](../src/app/api/v1/auth/refresh/route.ts) | Cookie syntax and session validation; no JSON body | `auth.refresh` | `auth.ts` | Implemented |
| `POST /auth/logout` | [route.ts](../src/app/api/v1/auth/logout/route.ts) | Bearer/session validation; no JSON body | `auth.logout` | `auth.ts` | Implemented |
| `GET /invoices/{invoiceId}/pdf` | [route.ts](../src/app/api/v1/invoices/[invoiceId]/pdf/route.ts) | `invoiceParamsSchema` | `invoice-pdf.invoicePdf` | `invoices.ts` | Implemented |

There are no unimplemented endpoints or intentional code TODOs. Contract conflicts were resolved with the user's explicit approval. See [implementation notes](backend-implementation.md) for the decisions, assumptions, setup, tests, and operational limitations.
