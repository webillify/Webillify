Suggested V1 capacity target

Public launchக்கு முன்னாடி இந்த capacity target set பண்ணு:

100 organizations
1,000 active user accounts
200 concurrent logged-in sessions
50 simultaneous invoice postings
100,000 invoices per month
99.5% pilot-hours availability

இது first proper SaaS milestoneக்கு reasonable.

ஆனால் pilotக்கு much smaller target போதும்:

3 businesses
5 branches
10–20 users
3–6 simultaneous cashiers
10,000–20,000 total test transactions

Pilot plan அதற்காகவே 2–3 businesses மட்டும் recommend செய்கிறது.

Server recommendation for pilot

Pilot startக்கு:

Application server:
4 vCPU
8 GB RAM
100–160 GB SSD

Database:
PostgreSQL
Daily backup
Point-in-time recovery where possible

Redis:
512 MB–1 GB

Storage:
S3-compatible storage for PDFs and attachments

Monitoring:
CPU
RAM
Disk
API latency
Database connections
Failed postings
Queue failures
Backup age

2 vCPU / 4 GB RAM server development மற்றும் demoக்கு okay. ஆனால் live POS pilotக்கு database, API, PDF generation, backup, monitoring எல்லாம் same serverல் இருந்தால் tight ஆகிடும்.

Pilotக்கு minimum 4 vCPU + 8 GB RAM recommend பண்ணுவேன்.

Final recommendation

ஆம், இப்போ build start பண்ணு.

ஆனால் first code should not be POS UI.

First code:

1. Repository and environments
2. Authentication
3. Organization/company/branch tenancy
4. Roles and permissions
5. Subscription entitlements
6. Audit logs
7. Database migrations
8. Automated tenant-isolation tests

அதற்குப் பிறகு catalogue → inventory → POS → purchases → reports.