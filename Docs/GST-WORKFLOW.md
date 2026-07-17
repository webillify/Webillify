# GST workflow

Status: Functional design only. A GST practitioner or chartered accountant must validate invoice fields, tax treatment, document retention, and current statutory thresholds before production or marketing the product as compliant.

## Tax profile

Each company stores legal name, trade name, GSTIN, registration state/code, registered address, taxpayer type, financial year, and invoice series. GSTIN format may be validated syntactically, but external registration verification is not assumed in V1.

Products store HSN/SAC, goods/service classification, default GST rate, cess if supported, and tax-inclusive/exclusive price behavior. Posted lines snapshot these values.

## Tax decision sequence

1. Identify the selling company GST registration and supply branch.
2. Determine customer registration status and capture GSTIN when applicable.
3. Determine place of supply using an explicit user-visible rule appropriate to the transaction.
4. Compare supplier state with place of supply:
   - Same state: apply CGST and SGST/UTGST in equal components.
   - Different state: apply IGST.
5. Apply the effective product/service rate and any approved exemption or zero-rate reason.
6. Calculate line taxable value, tax components, invoice total, and round-off.
7. Display tax decision inputs for review before posting.

The system must not infer place of supply solely from a customer's optional address when rules require additional context.

## Tax invoice minimum dataset

- Seller legal/trade name, address, GSTIN
- Unique invoice number and date
- Buyer name/address/GSTIN when required or supplied
- Place of supply and state code where relevant
- Item description, HSN/SAC, quantity, unit, rate, discount, taxable value
- GST rate and CGST/SGST/IGST/cess amounts as applicable
- Total invoice value and round-off
- Reverse-charge indicator when supported
- Authorised-signatory or declaration area as approved

Required fields and threshold-dependent rules must be configurable only after professional validation.

## Credit and debit notes

- A return or post-sale value correction creates a linked credit/debit note; it does not rewrite the original invoice.
- The note records original invoice reference, reason, affected lines, taxable value, and tax components.
- Return quantity cannot exceed eligible original quantity.
- Reporting includes notes in the correct period based on the approved policy.

## Purchases and input tax

- Supplier GSTIN, invoice number/date, place/state, line HSN/SAC, tax components, and eligibility are captured.
- Duplicate supplier-invoice reference is warned or blocked within a company/supplier scope.
- Input-tax credit eligibility is a reviewed field, not automatically assumed.
- GSTR reconciliation/import is Later.

## Reporting and retention

V1 provides sales and purchase tax summaries grouped by rate and component, plus invoice-level CSV export. It does not file returns. Posted tax snapshots and generated invoice documents are retained according to a professionally approved retention policy.

## Later scope

- E-invoice IRN/QR integration
- E-way bill integration
- Composition-taxpayer workflow
- GST return preparation/filing and portal reconciliation
- Automated statutory-rule updates

These require current legal review, integration testing, failure handling, and customer eligibility checks.
