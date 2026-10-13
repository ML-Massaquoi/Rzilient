# FIA IT Asset & Inventory Management System

## Complete Product Requirements & AI Coding Agent Specification

**Version:** 1.0  
**Status:** Build Specification  
**Scope:** Freetown International Airport â€” IT Department only  
**Primary Goal:** Track IT assets, custody, condition, location, maintenance, inventory, and complete history.

---

# 1. PRODUCT VISION

Build a clean, modern, professional **IT Asset & Inventory Management System** for the IT Department.

This is not a generic enterprise asset management platform and is not intended to manage the entire airport.

The system exists to answer five questions immediately:

1. **What IT equipment do we have?**
2. **Who currently has each asset?**
3. **Where is it?**
4. **What condition is it in?**
5. **What has happened to it throughout its life?**

The application must feel like a polished modern SaaS product rather than a traditional CRUD/admin dashboard.

The UI is a major priority.

The system should be:

- Clean
- Modern
- Fast
- Professional
- Responsive
- Intuitive
- Minimal but information-rich
- Easy for non-technical IT staff to operate
- Excellent on desktop
- Fully usable on tablets and phones
- Consistent throughout every screen

---

# 2. IMPORTANT SCOPE BOUNDARY

This application is specifically for the **IT Department**.

It should focus on:

- Laptops
- Desktops
- Monitors
- Printers
- Phones
- Tablets
- Network equipment
- Servers
- UPS devices
- Projectors
- Accessories
- IT tools
- Cables
- Adapters
- Chargers
- Other IT equipment

Do not turn the first version into a full airport-wide enterprise procurement/ERP platform.

Avoid unnecessary complexity.

The architecture should be clean enough to expand later, but Version 1 should remain focused on IT asset accountability.

---

# 3. RECOMMENDED TECHNOLOGY STACK

## Frontend + Application

- Next.js
- TypeScript
- App Router
- React
- Server Components where appropriate
- Server Actions where appropriate
- Route Handlers where appropriate

## Database

- PostgreSQL

## ORM

- Prisma

## UI

- Tailwind CSS
- shadcn/ui
- Lucide React icons
- Motion/Framer Motion for purposeful animations

## Validation

- Zod

## Charts

- Recharts

## QR

- QR generation library
- Browser camera QR scanning library

## Authentication

Use a secure Next.js-compatible authentication approach.

Passwords must never be stored in plaintext.

---

# 4. ARCHITECTURE

Keep the architecture simple.

Do NOT introduce:

- Microservices
- Spring Boot
- Kafka
- Kubernetes
- Redis without a real requirement
- Unnecessary infrastructure

The preferred architecture is:

```text
                    BROWSER
                       |
                       v
              NEXT.JS + TYPESCRIPT
                       |
          +------------+-------------+
          |                          |
      UI / React              Server Logic
          |                          |
          |                 Server Actions
          |                 Route Handlers
          |                 Auth
          |                 Validation
          |                 Business Rules
          |                          |
          +------------+-------------+
                       |
                     Prisma
                       |
                       v
                  PostgreSQL









5. DESIGN PHILOSOPHY

The system should take visual inspiration from modern products such as:

Linear
Vercel
Notion
modern SaaS admin applications
premium IT management tools

Do not copy any product.

Create an original FIA IT identity.

Visual principles
Lots of breathing room
Strong typography hierarchy
Subtle borders
Soft shadows used sparingly
Rounded cards, but not excessive
Clear status indicators
Consistent spacing
Consistent iconography
Excellent empty states
Excellent loading states
Excellent error states
Smooth transitions
Minimal visual noise

Avoid:

Cluttered dashboards
Excessive gradients
Excessive animations
Giant colorful cards
Tiny unreadable text
Too many badges
Dense old-style tables everywhere
Random colors
Inconsistent buttons
Generic template-looking UI
6. COLOR SYSTEM

Default theme should be professional and restrained.

Recommended:

Primary: deep/modern blue
Background: white / very light neutral
Text: dark slate
Borders: subtle gray
Success: green
Warning: amber/orange
Danger: red
Info: blue

Support dark mode.

Dark mode should use deep charcoal/slate rather than pure black.

Status colors must be consistent throughout the application.

Example:

Available        Green
Checked Out      Blue
Maintenance      Orange
Damaged          Red
Missing          Red
Retired          Gray

Never use color alone to communicate critical information; combine color with text/icon.

7. RESPONSIVE DESIGN

The application must work well on:

Desktop
Laptop
Tablet
Mobile phone

Desktop should have a sidebar navigation.

Mobile should use:

compact header
bottom navigation or mobile drawer
large touch targets
camera QR scanning
mobile-friendly forms

Tables should transform into cards or horizontally scroll intelligently on small screens.

8. MAIN NAVIGATION

Recommended navigation:

Dashboard

Assets
  All Assets
  Devices
  Accessories
  Maintenance

People
  Employees
  Departments

Operations
  Check Out
  Returns
  Transfers
  QR Scanner

Inventory
  Stock
  Stock Transactions

Reports

Activity

Settings

Navigation must be permission-aware.

9. AUTHENTICATION

Users must authenticate before accessing the system.

Support:

Login
Logout
Password reset
Session management
Role-based permissions

Roles:

ADMIN

Full access.

Can:

Manage assets
Manage employees/settings where permitted
Assign assets
Return assets
Transfer assets
Manage inventory
Manage maintenance
Manage users
View all reports
View complete activity
Archive records
IT_STAFF

Operational access.

Can:

View assets
Search assets
Assign assets
Return assets
Transfer assets
Record maintenance
Scan QR codes
View employee directory
View history

Restricted from system administration.

VIEWER

Read-only.

Can:

View dashboard
Search assets
View asset profiles
View permitted reports/history

Cannot modify records.

10. EMPLOYEE DIRECTORY â€” CORE REQUIREMENT

The airport already has employee information.

The system must use this existing employee data as the master employee directory.

IT staff must NOT manually type an employee's name every time an asset is assigned.

When assigning an asset:

Search employee
       |
       +-- Name
       +-- FIA Number
       +-- Employee ID
       +-- Department
       |
       v
Select employee
       |
       v
Employee information automatically appears
       |
       v
Assign asset

Example:

Search:
FIA-LOC0597

Result:

Moses Lamin Massaquoi
FIA-LOC0597
IT Department
Software Developer

Selecting the employee automatically populates the assignment.

The system must store a reference to the employee's unique database ID.

Do NOT store only a free-text employee name in assignments.

11. EMPLOYEE DATA

Employee records may contain:

Internal database ID
FIA number
Employee ID
First name
Middle name
Last name
Full name
Department
Unit/section
Position/title
Email
Phone where appropriate
Employment status
Location where appropriate

Only store fields that are actually available and appropriate.

Do not invent employee information.

12. EMPLOYEE IMPORT

Support importing the airport's employee directory from Excel/CSV.

Import workflow:

Upload File
     |
     v
Read & Validate
     |
     v
Detect duplicates
     |
     v
Show preview
     |
     v
Review changes
     |
     v
Confirm import

Show:

New employees
Updated employees
Duplicate records
Invalid rows
Missing required identifiers

Never silently create duplicates.

Where possible, match employees using a stable unique identifier such as FIA number or employee ID.

13. EMPLOYEE PROFILE

Employee profile should show:

Moses Lamin Massaquoi
FIA-LOC0597
IT Department
Software Developer

CURRENT ASSETS

Dell Latitude 5420
FIA-IT-0042
Good

Dell Monitor
FIA-IT-0091
Good

ASSIGNMENT HISTORY

Previous assets and dates

Actions:

Assign Asset
View Assignment History

The profile should answer:

What equipment does this employee currently have?

immediately.

14. ASSET MANAGEMENT

Assets are individually identifiable equipment.

Examples:

Laptop
Desktop
Monitor
Printer
Server
Switch
Router
Access Point
UPS
Phone
Tablet
Projector

Each serialized asset should have:

Internal ID
Asset tag
Serial number
Category
Brand
Model
Description
Status
Condition
Location
Current custodian
Purchase date
Purchase cost if available
Supplier if available
Warranty information if available
Operating system where relevant
Specifications where relevant
QR code
Photo
Notes
Created date
Updated date
15. ASSET VS STOCK ITEM

This distinction is mandatory.

Serialized Asset

One physical item has its own identity.

Example:

Dell Latitude 5420
Asset Tag: FIA-IT-0042
Serial: ABC123
Quantity-Based Inventory Item

Multiple identical items are tracked by quantity.

Example:

Cat6 Ethernet Cable
SKU: CAB-CAT6
Quantity: 120

Do NOT create 120 individual asset records for ordinary bulk consumables.

16. ASSET STATUSES

Recommended statuses:

AVAILABLE
CHECKED_OUT
MAINTENANCE
DAMAGED
MISSING
RETIRED
DISPOSED

Status transitions must be controlled by business rules.

Example:

AVAILABLE -> CHECKED_OUT
CHECKED_OUT -> AVAILABLE
CHECKED_OUT -> MAINTENANCE
MAINTENANCE -> AVAILABLE
AVAILABLE -> RETIRED

Do not allow nonsensical transitions.

17. CONDITION TRACKING

Recommended conditions:

NEW
EXCELLENT
GOOD
FAIR
DAMAGED
MALFUNCTIONING

Condition should be recorded:

At registration
At assignment/check-out
At return
During maintenance
During inspections

Condition changes must appear in history.

18. ASSET REGISTRATION

Provide a fast asset creation flow.

Required/important fields:

Asset category
Asset tag
Serial number where applicable
Brand
Model
Condition
Location
Purchase information where available

After creation:

Generate QR code automatically.
Create initial history event.
Make the asset available unless another state is explicitly selected.
19. ASSET DETAIL PAGE

The asset detail page is one of the most important screens.

It should feel premium and informative.

Header:

Dell Latitude 5420
FIA-IT-0042
â— Checked Out

[ Return ] [ Maintenance ] [ Transfer ] [ More ]

Sections/tabs:

Overview
History
Maintenance
Documents

Overview:

Asset information
Current custodian
Current location
Condition
Warranty
Technical details
QR code

History:

A visual timeline.

Maintenance:

Maintenance records.

Documents:

Invoices, photos, service reports, warranty documents, etc., where applicable.

20. CHECK-OUT WORKFLOW

This is one of the core workflows.

User selects:

Check Out Asset

Step 1:

Select/search asset.

Step 2:

Select employee.

Search by:

Name
FIA number
Employee ID
Department

Step 3:

Show selected employee.

Step 4:

Enter:

Expected return date (optional)
Condition
Accessories
Notes

Step 5:

Confirmation screen.

Step 6:

Transaction is committed atomically.

The system must:

Update asset status to CHECKED_OUT.
Create assignment record.
Create transaction history record.
Record current employee.
Record condition at checkout.
Record expected return date if provided.
Record the user who performed the action.
Preserve previous history.
21. RETURN WORKFLOW

Return must be fast.

Select or scan asset.

Display:

Dell Latitude 5420
FIA-IT-0042

Currently assigned to:
John Kamara

Require return condition:

Excellent
Good
Fair
Damaged
Malfunctioning

Allow:

Damage notes
Missing accessory selection
Photos/attachments where appropriate
General notes

After confirmation:

Close active assignment
Set return timestamp
Update condition
Update asset status
Create transaction
Record user performing return

If damaged/malfunctioning:

The system may recommend or automatically transition the asset to MAINTENANCE based on configuration.

22. ACCESSORIES AT CHECK-OUT

Allow accessories to be attached to an assignment.

Examples:

Charger
Mouse
Keyboard
Laptop bag
HDMI adapter
Docking station

The assignment should show:

DEVICE
Dell Latitude 5420

ACCESSORIES
âœ“ Charger
âœ“ Mouse
âœ“ Laptop Bag

At return:

âœ“ Charger returned
âœ“ Mouse returned
âš  Laptop bag missing

Missing accessories should be recorded in the return history.

23. TRANSFER WORKFLOW

Allow an asset to move from one employee to another.

Example:

Current:
John Kamara

Transfer to:
Moses Massaquoi

The system should record:

Previous employee
New employee
Date/time
Performed by
Condition
Reason
Notes

Never overwrite historical custody.

24. LOCATION MANAGEMENT

Support simple hierarchical locations.

Example:

IT Department
  â”œâ”€â”€ Main IT Office
  â”œâ”€â”€ Server Room
  â”œâ”€â”€ Storage Room
  â””â”€â”€ Workshop

Locations should be reusable.

An asset can have:

Current location
Previous locations in history
25. QR CODES

Every serialized asset should receive a unique QR code.

QR should identify the asset using a stable identifier.

Do not encode sensitive employee information in the QR code.

Example:

FIA-IT-0042

QR features:

Generate QR
Display QR
Download/print QR
Scan QR
Open asset from QR
Batch label printing where practical
26. QR SCANNER

Provide a dedicated scanner screen.

Scan Asset

[ Camera View ]

Point camera at the asset QR code.

OR

[ Enter Asset Tag ]

After scan:

FIA-IT-0042

Dell Latitude 5420
â— Available

[ Check Out ]
[ Maintenance ]
[ View Details ]

The scanner must work well on mobile.

27. MAINTENANCE

Maintenance should be focused and practical.

Each maintenance record should contain:

Asset
Maintenance type
Date
Technician
Issue
Diagnosis
Action taken
Parts replaced
Cost if available
Downtime
Status
Notes
Attachments where needed

Maintenance types:

PREVENTIVE
CORRECTIVE
INSPECTION
CALIBRATION
WARRANTY
OTHER

Statuses:

OPEN
IN_PROGRESS
COMPLETED
CANCELLED
28. MAINTENANCE HISTORY

Each asset must show its maintenance history.

Example:

20 Jan 2026

Battery replacement

Issue:
Battery degradation

Action:
Battery replaced

Technician:
Moses

Cost:
$85

Status:
Completed

Maintenance events must remain part of the asset history.

29. INVENTORY / STOCK

For quantity-based IT items, provide:

Item name
SKU
Category
Unit
Quantity
Minimum stock
Reorder level
Location
Notes

Examples:

Cat6 Cable       120
HDMI Cable        27
RJ45 Connector   500
USB Mouse         31
Keyboard          18
30. STOCK TRANSACTIONS

Track:

Stock received
Stock issued
Stock adjustment
Stock damaged
Stock lost
Stock returned

Every quantity change must create a transaction.

Never silently modify stock quantities without a transaction record.

31. LOW STOCK ALERTS

If quantity falls below configured minimum:

Show:

LOW STOCK

Cat6 Ethernet Cable
Current: 12
Minimum: 20

Dashboard should show a count of low-stock items.

32. OVERDUE ASSETS

If an asset has an expected return date and it passes:

Mark it:

OVERDUE

Do not change the underlying custody incorrectly.

The employee should remain the current custodian until the asset is actually returned.

Dashboard should show overdue assets.

33. SEARCH

Global search should be fast.

Search by:

Asset tag
Serial number
Device name
Brand
Model
Employee name
FIA number
Department
SKU

Search results should be visually clear.

34. FILTERING

Assets should be filterable by:

Category
Status
Condition
Department
Employee
Location
Brand
Model
Warranty status
Date added

Filters should be combinable.

Example:

Category: Laptop
Status: Checked Out
Department: IT
Condition: Good
35. TABLE UX

Tables should support:

Sorting
Filtering
Pagination
Column visibility where useful
Row actions
Quick search
Responsive behavior

Avoid overwhelming users with too many columns.

Default columns should show the information most useful for the current screen.

36. REPORTS

Provide useful reports rather than dozens of meaningless reports.

Recommended:

Asset Inventory Report
Asset tag
Device
Serial
Status
Condition
Current custodian
Location
Current Custody Report

Shows every employee and their assigned assets.

Maintenance Report

Shows maintenance activity and costs.

Missing/Damaged Report

Shows assets requiring attention.

Stock Report

Shows quantities and low-stock items.

Asset History Report

Exports transaction history.

37. EXPORTS

Support:

CSV
Excel-compatible export
PDF where practical

Exports should respect active filters.

Example:

If user filters:

Department = IT
Status = Checked Out

the exported report should contain only those results.

38. AUDIT / ACTIVITY LOG

Create an application-level audit trail.

Record important actions such as:

Asset created
Asset edited
Asset checked out
Asset returned
Asset transferred
Asset marked damaged
Asset marked missing
Maintenance created
Stock adjusted
Employee import performed
User/permission changes

Record:

Who
What
When
Target record
Action
Relevant before/after values where appropriate

Audit records should not be casually editable.

39. IMMUTABLE ASSET HISTORY

This is a core architectural requirement.

The system must never rewrite historical events to make history appear different.

If a mistake occurs:

Do not edit the old transaction.

Create a corrective transaction.

Example:

Incorrect assignment
        â†“
Correction transaction
        â†“
New valid state

The original event remains visible where appropriate.

40. SOFT DELETE / ARCHIVING

Do not hard-delete important asset records.

Instead use:

Active
Archived
Retired
Disposed

Historical records must remain available.

An asset that was retired should still be searchable in history.

41. DOCUMENTS & PHOTOS

Allow optional attachments for:

Asset photo
Damage photo
Maintenance report
Warranty document
Purchase document
Other relevant documents

Do not make documents mandatory unless needed.

42. DASHBOARD DESIGN

Dashboard should prioritize operational usefulness.

Recommended layout:

Good morning, Moses

IT Asset Overview

[ Total Assets ] [ Checked Out ] [ Available ] [ Maintenance ]

------------------------------------------------------------

Attention Required

[ Overdue ] [ Damaged ] [ Missing ] [ Low Stock ]

------------------------------------------------------------

Asset Distribution          Recent Activity

Chart                        Timeline/list

------------------------------------------------------------

Recently Added Assets        Upcoming/Attention

...

Do not fill the screen with unnecessary charts.

43. DEVICE PROFILE UX

The device profile is a key screen.

Example structure:

â† Back to Assets

Dell Latitude 5420
FIA-IT-0042
â— Checked Out

[ Return ] [ Transfer ] [ Maintenance ]

------------------------------------------------

CURRENT CUSTODY

John Kamara
IT Department

Assigned:
06 Oct 2026

Expected Return:
15 Oct 2026

------------------------------------------------

DEVICE DETAILS

Serial
ABC123456

Brand
Dell

Model
Latitude 5420

Condition
Good

------------------------------------------------

ACTIVITY

06 Oct 2026
Checked out to John Kamara

20 Jan 2026
Battery replaced

20 Jan 2026
Returned by John Kamara

Use a timeline rather than a plain wall of text.

44. CHECK-OUT UI

The check-out experience should be a focused modal or dedicated workflow.

Do not send the user through many pages unnecessarily.

Recommended:

Assign Asset

1. Asset
2. Employee
3. Condition & Accessories
4. Confirm

Use progressive disclosure.

Show only what is needed.

45. EMPLOYEE SELECTOR UX

This is particularly important.

Search field:

Search name, FIA number, department...

Results should show:

Moses Lamin Massaquoi
FIA-LOC0597
IT Department
Software Developer

Use keyboard-friendly selection.

Show empty state:

No employee found.
Try searching by name or FIA number.

Do not require manual typing of employee identity information.

46. NOTIFICATIONS

Use in-app notifications/toasts for:

Successful assignment
Successful return
Successful transfer
Asset created
Maintenance recorded
Stock updated
Errors
Validation issues

Use clear language.

Example:

âœ“ Asset assigned successfully
Dell Latitude 5420 is now assigned to John Kamara.

Avoid unnecessary popups.

47. LOADING STATES

Every async operation should have an intentional loading state.

Use:

Skeletons
Button loading indicators
Table skeletons
Page-level loading states

Never leave a blank screen while data loads.

48. EMPTY STATES

Every list must have a useful empty state.

Example:

No assets found

There are no assets matching your current filters.

[ Clear Filters ]

For an empty system:

No assets yet

Start by registering your first IT asset.

[ Add Asset ]
49. ERROR HANDLING

Errors must be understandable.

Never expose raw database errors to users.

Bad:

PrismaClientKnownRequestError...

Good:

Unable to assign this asset.

The asset may already be assigned to another employee.
Please refresh and try again.

Log technical errors server-side.

50. VALIDATION

Use Zod or equivalent validation.

Validate:

Required fields
Unique asset tags
Unique serial numbers where applicable
Valid employee identifiers
Valid dates
Valid status transitions
Stock quantities
Assignment state
Return state

Validation must occur server-side even if client-side validation exists.

51. CONCURRENCY / DATA INTEGRITY

Assignment and return operations must be transactional.

Example:

If two IT staff members attempt to assign the same asset simultaneously, only one transaction may succeed.

The database must enforce the correct state.

Never rely solely on UI state.

52. DATABASE MODEL

Recommended starting model:

User
Employee
Department

AssetCategory
Asset
AssetAssignment
AssetTransaction

Location

MaintenanceRecord

InventoryItem
InventoryTransaction

Attachment
AuditLog

Notification

Additional tables may be introduced where they solve a real requirement.

Avoid unnecessary table proliferation.

53. CORE DATABASE RELATIONSHIPS
Department
   |
   +---- Employees
             |
             +---- AssetAssignments
                         |
                         +---- Asset
                                  |
                                  +---- AssetTransactions
                                  |
                                  +---- MaintenanceRecords
                                  |
                                  +---- Attachments

An employee may have many asset assignments.

An asset may have many historical assignments.

Only one active assignment should exist for a serialized asset at a time.

54. ASSET TRANSACTION MODEL

A transaction should contain enough information to reconstruct what happened.

Recommended fields:

id
assetId
action
performedByUserId
employeeId
fromEmployeeId
toEmployeeId
fromLocationId
toLocationId
conditionBefore
conditionAfter
notes
createdAt
metadata

Possible actions:

CREATED
CHECKED_OUT
RETURNED
TRANSFERRED
MAINTENANCE_STARTED
MAINTENANCE_COMPLETED
DAMAGED
MARKED_MISSING
FOUND
RETIRED
DISPOSED
LOCATION_CHANGED
CONDITION_CHANGED

Do not store arbitrary free text as the only representation of important state changes.

55. ACTIVE ASSIGNMENT RULE

For a serialized asset:

At most one active assignment.

An assignment becomes inactive when returned or transferred.

Historical assignments remain permanently accessible.

56. ASSET TAGS

Use a consistent asset tag convention.

Example:

FIA-IT-00001
FIA-IT-00002
FIA-IT-00003

The exact numbering strategy may be configurable.

Asset tags must be unique.

Do not use the database primary key as the human-facing asset tag.

57. SERIAL NUMBERS

Serial numbers should be unique when supplied by the manufacturer.

However, some assets may not have serial numbers.

Do not block asset creation solely because a serial number is unavailable unless the category requires one.

Asset tag remains the system's internal human-facing identifier.

58. SECURITY

Implement:

Secure authentication
Password hashing
Authorization
Server-side permission checks
Input validation
CSRF-safe patterns where relevant
Secure cookies/session handling
Environment variables for secrets
No secrets in Git
No database credentials in client code

Users must only be able to perform actions permitted by their role.

59. PRIVACY

Employee information should only be shown where required for IT operations.

Do not display unnecessary personal information throughout the application.

The employee directory should expose only fields appropriate to the system.

60. PERFORMANCE

The application should feel fast.

Use:

Server-side querying
Pagination
Indexed search fields
Debounced search
Efficient database queries
Selective loading
Optimistic UI only where safe

Do not load thousands of records into the browser unnecessarily.

Important indexes should include:

asset tag
serial number
employee FIA number
employee name/search fields
department
status
assignment active state
transaction asset ID
transaction created date
61. SEARCH EXPERIENCE

Global search should feel instant.

Search results should be grouped where helpful:

Assets
Employees
Inventory

Example:

Search: FIA-IT-0042

ASSET
Dell Latitude 5420
FIA-IT-0042

CURRENT CUSTODIAN
John Kamara

[ Open Asset ]
62. REPORTING AND DATA EXPORT

Reports must use actual database data.

No dummy statistics.

Exports must contain the same filtered data shown to the user.

Dates and timestamps should use the system's configured timezone.

63. TIMEZONE

Configure the application for the organization's operational timezone.

Default:

Africa/Freetown

Store timestamps consistently in the database.

Display them in the configured local timezone.

64. SEED / DEMO DATA

During development, seed data may be used for testing.

However:

Production must never display fake or fabricated operational data.

All production dashboard numbers, employees, assets, assignments, history, and reports must come from PostgreSQL.

65. IMPORTING EXISTING ASSETS

The system should support importing existing IT assets from CSV/Excel.

Import should include:

Preview
Validation
Duplicate detection
Error reporting
Confirmation
Import summary

Example:

Assets found: 812

New: 765
Already existing: 41
Needs review: 6

Never silently overwrite important asset information.

66. SETTINGS

Settings should be intentionally limited.

Possible settings:

Organization/system name
Asset tag prefix
Timezone
Status configuration where safe
Condition options
Notification preferences
Default return period
QR label settings

Do not create unnecessary configuration.

67. ACTIVITY CENTER

Provide a dedicated activity screen.

Filters:

User
Action
Asset
Employee
Date range

Example:

06 Oct 2026 09:42
Moses
Checked out
Dell Latitude 5420
FIA-IT-0042
Assigned to John Kamara
68. MODERN UI COMPONENTS

Use a consistent component system.

Required reusable components:

Button
IconButton
Input
SearchInput
Select
Combobox
DatePicker
Dialog
Drawer
Sheet
Dropdown
Tooltip
Badge
Card
DataTable
Timeline
Tabs
Alert
Toast
Skeleton
EmptyState
ConfirmDialog
Command/Search palette

Do not build every component from scratch.

Use shadcn/ui patterns and customize them to the application's identity.

69. MOTION / ANIMATION

Animations should improve perceived quality, not distract.

Use subtle:

Page transitions
Dialog transitions
Card hover states
List appearance
Status changes
Loading transitions
Sidebar transitions

Avoid:

excessive bouncing
flashy effects
slow animations
animations that interfere with productivity
70. ACCESSIBILITY

Support:

Keyboard navigation
Visible focus states
Proper labels
Semantic HTML
Screen-reader-friendly controls
Adequate contrast
Accessible dialogs
Accessible tables
Touch-friendly controls
71. MOBILE-FIRST QR OPERATIONS

The QR scanner is a major mobile workflow.

A technician should be able to:

Open system
    â†“
Scan QR
    â†“
See asset
    â†“
Return / Assign / Maintenance
    â†“
Complete operation

with minimal typing.

72. MAIN USER FLOWS
Flow A â€” Register Asset
Assets
â†’ Add Asset
â†’ Enter details
â†’ Save
â†’ Generate QR
â†’ Asset becomes Available
â†’ Creation event recorded
Flow B â€” Assign Asset
Scan/Search asset
â†’ Check Out
â†’ Search employee
â†’ Select employee
â†’ Set condition
â†’ Add accessories
â†’ Confirm
â†’ Assignment + transaction created
Flow C â€” Return Asset
Scan/Search asset
â†’ Return
â†’ Show current employee
â†’ Record condition
â†’ Record missing/damaged accessories
â†’ Notes
â†’ Confirm
â†’ Assignment closed
â†’ Asset status updated
â†’ Transaction created
Flow D â€” Transfer
Open asset
â†’ Transfer
â†’ Select new employee
â†’ Confirm
â†’ Previous assignment closed
â†’ New assignment created
â†’ Transaction recorded
Flow E â€” Maintenance
Open asset
â†’ Maintenance
â†’ Create record
â†’ Asset becomes Maintenance
â†’ Work performed
â†’ Complete maintenance
â†’ Record action
â†’ Asset becomes Available or appropriate status
â†’ History updated
73. DASHBOARD OPERATIONAL PRIORITIES

Dashboard should prioritize:

What needs attention?
What is currently checked out?
What is available?
What is under maintenance?
What recently happened?

Do not prioritize decorative charts over operational information.

74. RECOMMENDED DASHBOARD WIDGETS
Asset Summary
Total
Available
Checked Out
Maintenance
Damaged
Missing
Attention Required
Overdue
Damaged
Missing
Low Stock
Recent Activity

Latest transactions.

Asset Distribution

By category.

Custody Overview

Employees with most/current assigned assets where useful.

Maintenance Overview

Open/in-progress maintenance.

75. PROFESSIONAL UX DETAILS

Every action should provide feedback.

Example:

âœ“ Device assigned
FIA-IT-0042 is now assigned to John Kamara.

Confirmation dialogs should clearly state what will happen.

Example:

Return Dell Latitude 5420?

This will end the current assignment to John Kamara
and make the asset available.

[Cancel] [Confirm Return]

Destructive actions should require confirmation.

76. NO DUMMY DATA PRINCIPLE

The finished production system must not rely on fake data.

If there are zero assets:

Show zero.

If there are no maintenance records:

Show an empty state.

If there are 12 employees:

Show 12 employees.

Never fabricate dashboard statistics to make the interface look populated.

77. DEVELOPMENT PHASES
Phase 1 â€” Foundation
Next.js setup
TypeScript
Tailwind
shadcn/ui
Prisma
PostgreSQL
Authentication
Database schema
Base layout
Theme
Phase 2 â€” Employee Directory
Employee schema
Employee import
Employee search
Employee profile
Department support
Phase 3 â€” Assets
Asset categories
Asset creation
Asset list
Asset detail
QR generation
Asset statuses
Conditions
Phase 4 â€” Custody
Check-out
Return
Transfer
Employee assignment
Assignment history
Phase 5 â€” Maintenance
Maintenance records
Maintenance status
Maintenance history
Condition changes
Phase 6 â€” Inventory
Quantity-based stock
Stock transactions
Low stock
Phase 7 â€” Reporting
Dashboard
Reports
Export
Activity center
Phase 8 â€” Polish
Responsive design
Mobile QR workflow
Loading states
Empty states
Error states
Accessibility
Animation
Performance
Security review
78. TESTING REQUIREMENTS

Test critical workflows.

Asset tests
Create asset
Duplicate asset tag rejected
Duplicate serial rejected where applicable
Edit asset
Archive asset
Assignment tests
Assign available asset
Prevent assigning already checked-out asset
Employee selection works
Assignment history created
Return tests
Return active assignment
Condition captured
History created
Asset status updated
Transfer tests
Previous assignment closes
New assignment created
History preserved
Maintenance tests
Asset moves into maintenance
Maintenance completion updates state
History preserved
Employee tests
Import
Duplicate detection
Search by FIA number
Search by name
Assignment references employee ID
Security tests
Viewer cannot modify
IT staff cannot perform admin-only actions
Unauthorized API/server actions rejected
79. IMPORTANT BUSINESS RULES
An asset cannot have two active custodians.
An asset cannot be checked out while in maintenance.
An asset marked retired cannot be checked out.
Historical transactions must not be silently edited.
Employee assignments must reference employee IDs, not names.
Asset tags must be unique.
Serial numbers should be unique where provided.
Returning an asset must close its active assignment.
Transfers must preserve custody history.
Stock changes must create stock transactions.
Production data must come from PostgreSQL.
Permissions must be enforced server-side.
Important records should be archived rather than hard-deleted.
Assignment and return operations must be atomic database transactions.
Overdue status must never falsely imply that an asset has been returned.
QR codes must identify assets using stable identifiers.
No sensitive employee information should be encoded in QR codes.
No raw database errors should be shown to users.
80. QUALITY BAR

The finished application should feel like a product that an IT department could confidently use every day.

It must NOT feel like:

A school project
A generic CRUD template
A Bootstrap admin dashboard
A collection of unrelated pages

It should feel cohesive.

Every screen must share:

Typography
Spacing
Colors
Icons
Interaction patterns
Status language
Navigation behavior
Feedback patterns
81. FINAL UI EXPECTATION

The UI is not secondary.

The system should have:

Premium-looking dashboard
Clean sidebar
Modern tables
Beautiful device cards
Excellent employee selector
Smooth check-out flow
Excellent return flow
Visual asset timeline
QR scanning experience
Responsive mobile interface
Light/dark mode
Clear status indicators
Subtle animations
Excellent empty/loading/error states

Prioritize usability over decoration.

The user should be able to understand an asset's status within seconds.

82. FINAL PRODUCT STRUCTURE

The final system should roughly contain:

LOGIN
â”‚
â”œâ”€â”€ DASHBOARD
â”‚
â”œâ”€â”€ ASSETS
â”‚   â”œâ”€â”€ All Assets
â”‚   â”œâ”€â”€ Devices
â”‚   â”œâ”€â”€ Accessories
â”‚   â”œâ”€â”€ Asset Detail
â”‚   â””â”€â”€ Maintenance
â”‚
â”œâ”€â”€ PEOPLE
â”‚   â”œâ”€â”€ Employees
â”‚   â”œâ”€â”€ Employee Detail
â”‚   â””â”€â”€ Departments
â”‚
â”œâ”€â”€ OPERATIONS
â”‚   â”œâ”€â”€ Check Out
â”‚   â”œâ”€â”€ Returns
â”‚   â”œâ”€â”€ Transfers
â”‚   â””â”€â”€ QR Scanner
â”‚
â”œâ”€â”€ INVENTORY
â”‚   â”œâ”€â”€ Stock
â”‚   â””â”€â”€ Transactions
â”‚
â”œâ”€â”€ REPORTS
â”‚
â”œâ”€â”€ ACTIVITY
â”‚
â””â”€â”€ SETTINGS
83. AGENT IMPLEMENTATION RULE

The coding agent must not blindly generate the entire application as disconnected pages.

Build the system as a coherent product.

Before implementing each module:

Understand the database relationships.
Implement server-side validation.
Implement business rules.
Implement database transactions.
Implement the UI.
Connect UI to real data.
Test the workflow.
Handle loading, empty, success, and error states.
Check responsive behavior.
Check permissions.

Do not mark a feature complete merely because its page exists.

A feature is complete only when its full workflow works with real PostgreSQL data.

84. NO SHORTCUTS

Do not:

Hardcode dashboard values.
Use fake employees in production.
Use fake assets in production.
Store employee names instead of IDs.
Expose PostgreSQL to the browser.
Skip server-side validation.
Allow duplicate asset tags.
Allow duplicate active assignments.
Delete history.
Fake QR scanning.
Build non-functional buttons.
Leave placeholder pages presented as finished features.

If a feature is not implemented yet, clearly label it as unfinished during development.

85. DEFINITION OF DONE

The system is considered ready for real IT department use when an IT staff member can:

Log in.
Search the airport employee directory.
Search or scan an asset.
See the asset's current status.
See who currently has it.
Check it out to an employee.
Record its condition.
Record accessories.
Set an expected return date.
Return the asset.
Record return condition.
Record damage or missing accessories.
Transfer the asset to another employee.
View the complete asset history.
Record maintenance.
Search/filter assets.
View an employee's current assets.
Manage quantity-based IT inventory.
See overdue and attention-required assets.
Generate useful reports.
Export filtered data.
Scan a QR code from a phone.
Perform all permitted actions according to role.

Most importantly:

Every important operational action must leave a reliable history trail.

86. FINAL PRODUCT PRINCIPLE

Build a system that is:

Simple in architecture.
Powerful in accountability.
Modern in appearance.
Fast in daily use.
Reliable in its history.

The goal is not to build the biggest inventory system.

The goal is to build the best practical IT asset tracking system for the IT Department.

The experience should feel:

Clean. Modern. Fast. Professional. Reliable.

And when an IT staff member asks:

"Who has this laptop?"

or:

"What equipment does John have?"

or:

"What happened to this device?"

or:

"How many laptops do we have available?"

the answer should be available in seconds.
