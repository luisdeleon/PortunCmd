# Scope Visual Reference - All Scopes Explained

This document provides clear visual explanations of **ALL 4 scope types** in the PortunCmd system.

## 🎯 Quick Overview: The 4 Scopes

```
┌─────────────────────────────────────────────────────────────┐
│                    PORTUNCMD SCOPES                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣  GLOBAL SCOPE      → Entire System (Super Admin)      │
│  2️⃣  DEALER SCOPE      → Dealer's Communities (Dealer)     │
│  3️⃣  COMMUNITY SCOPE   → Specific Communities (Admin/Guard)│
│  4️⃣  PROPERTY SCOPE    → Specific Properties (Resident)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ GLOBAL SCOPE

### Who Uses It
- **Super Admin** role only

### Access Level
**UNLIMITED** - Can access everything in the entire system

### Visual Representation

```
┌──────────────────────────────────────────────────────────────┐
│                    👑 SUPER ADMIN                            │
│                   (GLOBAL SCOPE)                             │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ Can access EVERYTHING ↓
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌───────▼────────┐
│  Community A   │   │  Community B    │   │  Community C   │
│  🏢 Sunset     │   │  🏢 Ocean View  │   │  🏢 Mountain   │
│    Gardens     │   │                 │   │    Estates     │
└───────┬────────┘   └────────┬────────┘   └───────┬────────┘
        │                     │                     │
    ┌───┴───┐             ┌───┴───┐             ┌───┴───┐
    │       │             │       │             │       │
  🏠Apt  🏠Apt         🏠Apt  🏠Apt         🏠Apt  🏠Apt
   101    102           201    202           301    302
    │       │             │       │             │       │
  👤John 👤Mary        👤Bob  👤Sue         👤Tom  👤Ann

✅ Can view/edit ALL communities
✅ Can view/edit ALL properties
✅ Can view/edit ALL users
✅ Can configure system settings
✅ Can create/delete communities
✅ Can assign ALL roles
```

### Database Structure

```sql
-- profile_role record for Super Admin
{
  profile_id: 'super-admin-uuid',
  role_id: 'super-admin-role-id',
  scope_type: 'global',           ← Key field
  scope_dealer_id: NULL,          ← Not used
  scope_community_ids: NULL,      ← Not used
  scope_property_ids: NULL        ← Not used
}

-- No relationship tables needed
-- RLS policies check: scope_type = 'global' → grant all access
```

### SQL Example

```sql
-- Assign global scope
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type
) VALUES (
  'super-admin-uuid',
  (SELECT id FROM role WHERE role_name = 'Super Admin'),
  'global'  -- That's it! No other fields needed
);
```

### What They See

```
Dashboard:
  ├── All Communities: [Sunset Gardens, Ocean View, Mountain Estates, ...]
  ├── All Properties: [Apt 101, Apt 102, Apt 201, Apt 202, ...]
  ├── All Users: [John, Mary, Bob, Sue, Tom, Ann, ...]
  ├── System Settings ✅
  └── Full Access ✅
```

---

## 2️⃣ DEALER SCOPE

### Who Uses It
- **Dealer** role

### Access Level
**Multiple Communities** they manage + their administrators

### Visual Representation

```
┌──────────────────────────────────────────────────────────────┐
│                    🏪 DEALER                                 │
│            ABC Properties (DEALER SCOPE)                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ Can access their portfolio ↓
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
┌───────▼────────┐   ┌────────────────┐   ┌────────▼────────┐
│  Community A   │   │  Community B   │   │  Community C    │
│  🏢 Sunset     │   │  🏢 Ocean View │   │ 🏢 Mountain     │
│    Gardens     │   │                │   │   Estates       │
│                │   │                │   │                 │
│  👨‍💼 Jane      │   │  👨‍💼 Bob       │   │ ❌ NOT OWNED   │
│  (Admin)       │   │  (Admin)       │   │                 │
└───────┬────────┘   └────────┬───────┘   └─────────────────┘
        │                     │
    ✅ Can access        ✅ Can access      ❌ No access
       via Admin            via Admin          (other dealer)
```

### Scope Hierarchy

```
Dealer: ABC Properties
  │
  ├─── Manages Community A (via Administrator Jane)
  │     └─── Community A contains:
  │           ├── Apt 101, 102, 103...
  │           └── Residents: John, Mary, Bob...
  │
  ├─── Manages Community B (via Administrator Bob)
  │     └─── Community B contains:
  │           ├── Apt 201, 202, 203...
  │           └── Residents: Sue, Tom, Ann...
  │
  └─── ❌ Does NOT manage Community C (different dealer)
```

### Database Structure

```sql
-- Step 1: profile_role record for Dealer
{
  profile_id: 'dealer-uuid',
  role_id: 'dealer-role-id',
  scope_type: 'dealer',            ← Key field
  scope_dealer_id: 'dealer-uuid',  ← Self-reference!
  scope_community_ids: NULL,       ← Not directly stored (see below)
  scope_property_ids: NULL         ← Not used
}

-- Step 2: dealer_administrators table (defines which communities)
{
  dealer_id: 'dealer-uuid',
  administrator_id: 'jane-uuid',
  assigned_community_ids: ['sunset-gardens', 'ocean-view']  ← Communities!
}
{
  dealer_id: 'dealer-uuid',
  administrator_id: 'bob-uuid',
  assigned_community_ids: ['mountain-estates']
}

-- Communities are derived from dealer_administrators table
-- RLS policies check: "Is this community in ANY of dealer's administrator assignments?"
```

### SQL Example

```sql
-- Complete dealer setup
BEGIN;

-- Step 1: Assign Dealer role
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_dealer_id
) VALUES (
  'dealer-uuid',
  (SELECT id FROM role WHERE role_name = 'Dealer'),
  'dealer',
  'dealer-uuid'  -- Self-reference
);

-- Step 2: Create administrators under this dealer
INSERT INTO dealer_administrators (
  dealer_id,
  administrator_id,
  assigned_community_ids
) VALUES
  ('dealer-uuid', 'jane-uuid', ARRAY['sunset-gardens', 'ocean-view']),
  ('dealer-uuid', 'bob-uuid', ARRAY['mountain-estates']);

COMMIT;

-- Now dealer can access Sunset Gardens, Ocean View, and Mountain Estates
```

### What They See

```
Dashboard:
  ├── My Communities: [Sunset Gardens, Ocean View, Mountain Estates]
  │     (via their administrators)
  │
  ├── My Administrators: [Jane (2 communities), Bob (1 community)]
  │
  ├── Properties in my communities: [All properties in those 3 communities]
  │
  ├── Residents in my communities: [All residents in those 3 communities]
  │
  ├── ❌ Community D (owned by different dealer) - No access
  │
  └── ❌ System Settings - No access
```

### Access Pattern

```
Query: "Show me all communities"

RLS Policy checks:
  ┌─ Is user Super Admin (global)? → No
  ├─ Is user Dealer? → Yes
  │   └─ Get communities from dealer_administrators
  │       WHERE dealer_id = current_user
  │       → Returns: [sunset-gardens, ocean-view, mountain-estates]
  └─ Filter communities WHERE id IN (those 3)

Result: User sees only their 3 communities ✅
```

---

## 3️⃣ COMMUNITY SCOPE

### Who Uses It
- **Administrator** role (full management)
- **Guard** role (view + gate control)

### Access Level
**Specific communities** only (can be 1 or multiple)

### Visual Representation

#### Administrator with Single Community

```
┌──────────────────────────────────────────────────────────────┐
│              👨‍💼 ADMINISTRATOR: Jane                          │
│          (COMMUNITY SCOPE: [sunset-gardens])                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ Can manage this community ↓
                              │
                    ┌─────────▼──────────┐
                    │   🏢 Sunset        │
                    │     Gardens        │
                    └─────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    ┌───▼───┐             ┌───▼───┐            ┌───▼───┐
    │ 🏠 Apt│             │ 🏠 Apt│            │ 🏠 Apt│
    │  101  │             │  102  │            │  103  │
    └───┬───┘             └───┬───┘            └───┬───┘
        │                     │                     │
      👤John                👤Mary                 👤Bob
        │                     │                     │
    ✅ Can manage         ✅ Can manage          ✅ Can manage

┌──────────────────────────────────────────────────────────────┐
│   🏢 Ocean View (Different Community)                        │
│   ❌ NO ACCESS - Not in scope                                │
└──────────────────────────────────────────────────────────────┘
```

#### Administrator with Multiple Communities

```
┌──────────────────────────────────────────────────────────────┐
│              👨‍💼 ADMINISTRATOR: Sarah                         │
│   (COMMUNITY SCOPE: [sunset-gardens, ocean-view])            │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
┌───────▼────────┐                         ┌────────▼────────┐
│  🏢 Sunset     │                         │  🏢 Ocean View  │
│    Gardens     │                         │                 │
└───────┬────────┘                         └────────┬────────┘
        │                                           │
    ✅ Can manage                              ✅ Can manage
    All properties                             All properties
    All residents                              All residents

┌──────────────────────────────────────────────────────────────┐
│   🏢 Mountain Estates (Different Community)                  │
│   ❌ NO ACCESS - Not in scope                                │
└──────────────────────────────────────────────────────────────┘
```

#### Guard with Community Scope

```
┌──────────────────────────────────────────────────────────────┐
│                💂 GUARD: Mike                                │
│          (COMMUNITY SCOPE: [sunset-gardens])                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ Can monitor this community ↓
                              │
                    ┌─────────▼──────────┐
                    │   🏢 Sunset        │
                    │     Gardens        │
                    └─────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    Properties            Residents              Gates
        │                     │                     │
    👀 View only          👀 View only          🎛️ Control
    (Read-only)           (Read-only)          (Can open/close)
        │                     │                     │
    ❌ Can't create       ❌ Can't create       ✅ Can control
    ❌ Can't edit         ❌ Can't edit            automation
    ❌ Can't delete       ❌ Can't delete

    👁️ Visitors                                🚨 Alerts
        │                                           │
    ✅ Can view                                 ✅ Can view
    ✅ Can update status                        ✅ Can respond
    (Check in/out)
```

### Database Structure

```sql
-- Administrator with single community
{
  profile_id: 'admin-uuid',
  role_id: 'admin-role-id',
  scope_type: 'community',              ← Key field
  scope_dealer_id: NULL,
  scope_community_ids: ['sunset-gardens'],  ← Array with 1 community
  scope_property_ids: NULL
}

-- Link to community
community_manager {
  profile_id: 'admin-uuid',
  community_id: 'sunset-gardens',
  property_id: NULL  -- NULL = manages entire community
}

-- Administrator with multiple communities
{
  profile_id: 'admin2-uuid',
  role_id: 'admin-role-id',
  scope_type: 'community',
  scope_dealer_id: NULL,
  scope_community_ids: ['sunset-gardens', 'ocean-view', 'mountain-estates'],  ← Multiple!
  scope_property_ids: NULL
}

-- Link to each community
community_manager records:
  { profile_id: 'admin2-uuid', community_id: 'sunset-gardens', property_id: NULL }
  { profile_id: 'admin2-uuid', community_id: 'ocean-view', property_id: NULL }
  { profile_id: 'admin2-uuid', community_id: 'mountain-estates', property_id: NULL }
```

### SQL Examples

#### Single Community Administrator

```sql
BEGIN;

-- Step 1: Assign Administrator role
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_community_ids
) VALUES (
  'admin-uuid',
  (SELECT id FROM role WHERE role_name = 'Administrator'),
  'community',
  ARRAY['sunset-gardens']  -- Single community in array
);

-- Step 2: Link to community
INSERT INTO community_manager (
  profile_id,
  community_id,
  property_id
) VALUES (
  'admin-uuid',
  'sunset-gardens',
  NULL
);

COMMIT;
```

#### Multiple Community Administrator

```sql
BEGIN;

-- Step 1: Assign Administrator role with multiple communities
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_community_ids
) VALUES (
  'admin-uuid',
  (SELECT id FROM role WHERE role_name = 'Administrator'),
  'community',
  ARRAY['sunset-gardens', 'ocean-view', 'mountain-estates']  -- Multiple!
);

-- Step 2: Link to each community (bulk insert)
INSERT INTO community_manager (profile_id, community_id, property_id)
SELECT
  'admin-uuid',
  unnest(ARRAY['sunset-gardens', 'ocean-view', 'mountain-estates']),
  NULL;

COMMIT;
```

#### Guard

```sql
BEGIN;

INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_community_ids
) VALUES (
  'guard-uuid',
  (SELECT id FROM role WHERE role_name = 'Guard'),
  'community',
  ARRAY['sunset-gardens']
);

INSERT INTO community_manager (profile_id, community_id, property_id)
VALUES ('guard-uuid', 'sunset-gardens', NULL);

COMMIT;
```

### What They See

#### Administrator Dashboard

```
Dashboard:
  ├── My Communities: [Sunset Gardens] (or multiple if assigned)
  │
  ├── Properties in Sunset Gardens: [Apt 101, 102, 103, ...]
  │     └── ✅ Can create new properties
  │     └── ✅ Can edit property details
  │     └── ✅ Can delete properties
  │
  ├── Residents in Sunset Gardens: [John, Mary, Bob, ...]
  │     └── ✅ Can add new residents
  │     └── ✅ Can edit resident info
  │     └── ✅ Can remove residents
  │
  ├── Visitors in Sunset Gardens: [All visitor records]
  │     └── ✅ Can view all
  │     └── ✅ Can approve/deny
  │
  ├── Automation: [Gates, devices in Sunset Gardens]
  │     └── ✅ Can configure
  │     └── ✅ Can control
  │
  └── ❌ Ocean View, Mountain Estates - No access (different communities)
```

#### Guard Dashboard

```
Dashboard:
  ├── My Community: [Sunset Gardens]
  │
  ├── Properties: [View only - Apt 101, 102, 103, ...]
  │     └── 👀 View details
  │     └── ❌ Cannot create/edit/delete
  │
  ├── Residents: [View only - John, Mary, Bob, ...]
  │     └── 👀 View contact info
  │     └── ❌ Cannot create/edit/delete
  │
  ├── Visitors: [Can view and manage]
  │     └── ✅ View visitor passes
  │     └── ✅ Check in/out visitors
  │     └── ✅ Update visitor status
  │
  ├── Gate Control: [Active controls]
  │     └── ✅ Open/close gates
  │     └── ✅ View access logs
  │
  └── ❌ Other communities - No access
```

### Access Pattern

```
Query: "Show me all properties"

RLS Policy checks:
  ┌─ Is user Super Admin (global)? → No
  ├─ Is user Administrator/Guard? → Yes
  │   └─ Get their scope_community_ids
  │       → Returns: ['sunset-gardens']
  │   └─ Filter properties WHERE community_id IN ('sunset-gardens')
  └─ Return only properties in Sunset Gardens

Result: User sees only properties in their assigned community/communities ✅
```

---

## 4️⃣ PROPERTY SCOPE

### Who Uses It
- **Resident** role

### Access Level
**Specific properties** only (usually 1, can be multiple if they own multiple units)

### Visual Representation

#### Resident with Single Property

```
┌──────────────────────────────────────────────────────────────┐
│                🏠 RESIDENT: John                             │
│            (PROPERTY SCOPE: [apt-101])                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ Can access only their property ↓
                              │
                    ┌─────────▼──────────┐
                    │   🏠 Apartment 101 │
                    │   Sunset Gardens   │
                    └────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    🎫 Visitors           📋 Property            🏘️ Community
        │                  Details                  Info
        │                     │                     │
    ✅ Create passes      👀 View details       👀 View name,
    ✅ View history       ✅ Edit notes            address
    ✅ Manage guests      ❌ Can't edit           (context only)
                             core info

┌──────────────────────────────────────────────────────────────┐
│   Other Properties in Community                              │
│   🏠 Apt 102, 103, 104... ❌ NO ACCESS                       │
└──────────────────────────────────────────────────────────────┘
```

#### Resident with Multiple Properties

```
┌──────────────────────────────────────────────────────────────┐
│                🏠 RESIDENT: Mary                             │
│         (PROPERTY SCOPE: [apt-101, apt-201])                 │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
┌───────▼────────┐                         ┌────────▼────────┐
│ 🏠 Apartment   │                         │ 🏠 Apartment    │
│     101        │                         │     201         │
└───────┬────────┘                         └────────┬────────┘
        │                                           │
    ✅ Full access                              ✅ Full access
    Create visitors                             Create visitors
    View details                                View details

┌──────────────────────────────────────────────────────────────┐
│   🏠 Apt 102, 103, 202... ❌ NO ACCESS                       │
│   (Other residents' properties)                              │
└──────────────────────────────────────────────────────────────┘
```

#### Co-Ownership Scenario

```
┌──────────────────────────────────────────────────────────────┐
│                🏠 Apartment 101                              │
│            (Multiple Owners/Residents)                       │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌───────▼────────┐
│ Resident:      │   │ Resident:       │   │ Resident:      │
│ John           │   │ Jane (spouse)   │   │ Bob (tenant)   │
│ (Owner)        │   │ (Co-owner)      │   │ (Renter)       │
└────────────────┘   └─────────────────┘   └────────────────┘
        │                     │                     │
All have scope_property_ids = ['apt-101']
All can create visitors for Apt 101
All see same property data
```

### Database Structure

```sql
-- Resident with single property
{
  profile_id: 'resident-uuid',
  role_id: 'resident-role-id',
  scope_type: 'property',          ← Key field
  scope_dealer_id: NULL,
  scope_community_ids: NULL,
  scope_property_ids: ['apt-101']  ← Single property in array
}

-- Link to property
property_owner {
  profile_id: 'resident-uuid',
  property_id: 'apt-101',
  community_id: 'sunset-gardens'
}

-- Resident with multiple properties
{
  profile_id: 'resident2-uuid',
  role_id: 'resident-role-id',
  scope_type: 'property',
  scope_dealer_id: NULL,
  scope_community_ids: NULL,
  scope_property_ids: ['apt-101', 'apt-201', 'parking-space-12']  ← Multiple!
}

-- Link to each property
property_owner records:
  { profile_id: 'resident2-uuid', property_id: 'apt-101', community_id: 'sunset-gardens' }
  { profile_id: 'resident2-uuid', property_id: 'apt-201', community_id: 'sunset-gardens' }
  { profile_id: 'resident2-uuid', property_id: 'parking-space-12', community_id: 'sunset-gardens' }
```

### SQL Examples

#### Single Property Resident

```sql
BEGIN;

-- Step 1: Assign Resident role
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_property_ids
) VALUES (
  'resident-uuid',
  (SELECT id FROM role WHERE role_name = 'Resident'),
  'property',
  ARRAY['apt-101']  -- Single property
);

-- Step 2: Link to property
INSERT INTO property_owner (
  profile_id,
  property_id,
  community_id
) VALUES (
  'resident-uuid',
  'apt-101',
  'sunset-gardens'
);

-- Step 3: Set defaults (optional but recommended)
UPDATE profile
SET
  def_community_id = 'sunset-gardens',
  def_property_id = 'apt-101'
WHERE id = 'resident-uuid';

COMMIT;
```

#### Multiple Property Resident

```sql
BEGIN;

-- Step 1: Assign Resident role with multiple properties
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_property_ids
) VALUES (
  'resident-uuid',
  (SELECT id FROM role WHERE role_name = 'Resident'),
  'property',
  ARRAY['apt-101', 'apt-201', 'parking-12']  -- Multiple properties
);

-- Step 2: Link to each property
INSERT INTO property_owner (profile_id, property_id, community_id)
VALUES
  ('resident-uuid', 'apt-101', 'sunset-gardens'),
  ('resident-uuid', 'apt-201', 'sunset-gardens'),
  ('resident-uuid', 'parking-12', 'sunset-gardens');

-- Step 3: Set primary property as default
UPDATE profile
SET
  def_community_id = 'sunset-gardens',
  def_property_id = 'apt-101'  -- Primary residence
WHERE id = 'resident-uuid';

COMMIT;
```

### What They See

#### Single Property Resident Dashboard

```
Dashboard:
  ├── My Property: Apartment 101
  │     └── 🏠 View address, details
  │     └── 👀 View community info (Sunset Gardens)
  │     └── ❌ Cannot edit property details
  │
  ├── My Visitors: [All visitor passes for Apt 101]
  │     └── ✅ Create new visitor pass
  │     └── ✅ Generate QR code
  │     └── ✅ View visitor history
  │     └── ✅ Cancel/edit passes
  │
  ├── Visitor Logs: [Entry/exit history for Apt 101]
  │     └── 👀 View who visited
  │     └── 👀 View timestamps
  │
  ├── Community Announcements: [Read-only]
  │     └── 👀 View messages from admin
  │
  └── ❌ Other properties (102, 103...) - No access
  └── ❌ Other residents - No access
  └── ❌ Community management - No access
```

#### Multiple Property Resident Dashboard

```
Dashboard:
  ├── My Properties: [3 properties]
  │     ├── 🏠 Apartment 101 (primary)
  │     ├── 🏠 Apartment 201
  │     └── 🅿️ Parking Space 12
  │
  ├── Visitors for Apt 101: [...]
  │     └── ✅ Create/manage
  │
  ├── Visitors for Apt 201: [...]
  │     └── ✅ Create/manage
  │
  ├── Parking access for Space 12: [...]
  │     └── ✅ Manage vehicle access
  │
  └── ❌ Other properties - No access
```

### Access Pattern

```
Query: "Show me all visitor records"

RLS Policy checks:
  ┌─ Is user Super Admin (global)? → No
  ├─ Is user Resident? → Yes
  │   └─ Get their scope_property_ids
  │       → Returns: ['apt-101']
  │   └─ Filter visitor_records WHERE property_id IN ('apt-101')
  │       OR host_uid = current_user (they created it)
  └─ Return only visitors for their property

Result: User sees only visitors for Apt 101 ✅
```

### Resident Limitations

```
✅ CAN DO:
  ├── View their own property details
  ├── Create visitor passes for their property
  ├── View visitor history for their property
  ├── Receive community announcements
  └── View community contact info (context)

❌ CANNOT DO:
  ├── View other properties
  ├── View other residents' info
  ├── Create/edit/delete properties
  ├── Manage other residents
  ├── Access community management functions
  ├── Configure automation
  └── View system-wide reports
```

---

## 🔄 Scope Hierarchy & Inheritance

### The Scope Pyramid

```
                    👑
                 GLOBAL
              (Everything)
                    │
        ┌───────────┴───────────┐
        │                       │
      🏪 DEALER              (Inherits)
    (Their Portfolio)           │
        │                       │
        └───────────┬───────────┘
                    │
              🏢 COMMUNITY
           (Specific Communities)
                    │
        ┌───────────┴───────────┐
        │                       │
   (Inherits)              (Inherits)
        │                       │
        └───────────┬───────────┘
                    │
              🏠 PROPERTY
          (Specific Properties)
                    │
                (Narrowest)
```

### Access Cascade

```
If you have GLOBAL scope:
  └─ You can access everything at ALL lower levels
      ├─ All dealer operations
      ├─ All community operations
      └─ All property operations

If you have DEALER scope:
  └─ You can access your communities and their properties
      ├─ Your communities only
      └─ Properties in your communities only
      ❌ NOT other dealers' communities

If you have COMMUNITY scope:
  └─ You can access assigned communities and their properties
      ├─ Assigned communities only
      └─ Properties in those communities only
      ❌ NOT other communities

If you have PROPERTY scope:
  └─ You can access ONLY your specific properties
      ├─ Your properties only
      └─ Community info (context only)
      ❌ NOT other properties
      ❌ NOT community management
```

---

## 📊 Scope Comparison Table

| Feature | Global | Dealer | Community | Property |
|---------|--------|--------|-----------|----------|
| **Database Field** | `scope_type = 'global'` | `scope_dealer_id` | `scope_community_ids[]` | `scope_property_ids[]` |
| **Relationship Table** | None | `dealer_administrators` | `community_manager` | `property_owner` |
| **Can See Communities** | All | Their portfolio | Assigned only | Context only |
| **Can See Properties** | All | In their communities | In assigned communities | Their own only |
| **Can See All Residents** | Yes | In their communities | In assigned communities | No |
| **Can Manage Communities** | Yes | Via admins | Assigned only | No |
| **Can Create Properties** | Yes | Via admins | In assigned communities | No |
| **Can Create Residents** | Yes | Via admins | In assigned communities | No |
| **Can Create Visitors** | Yes | Yes | In assigned communities | For own properties |
| **Can Configure System** | Yes | No | No | No |
| **Typical Use Case** | System owner | Property management company | Community admin/guard | Property owner/tenant |

---

## 🎯 Scope Quick Reference

### When to Use Each Scope

```
Use GLOBAL when:
  └─ User needs unrestricted system access (system owner/tech admin)

Use DEALER when:
  └─ User manages multiple communities (property management company)

Use COMMUNITY when:
  └─ User manages specific community/communities (on-site admin or guard)

Use PROPERTY when:
  └─ User owns/rents specific property/properties (resident)
```

### Scope Assignment Checklist

```
Assigning GLOBAL scope:
  ☐ Create profile_role with scope_type = 'global'
  ☐ No relationship table needed
  ☐ No scope_*_ids needed
  ☐ Done!

Assigning DEALER scope:
  ☐ Create profile_role with scope_type = 'dealer'
  ☐ Set scope_dealer_id = user's own UUID
  ☐ Create dealer_administrators records linking to their admins
  ☐ Set assigned_community_ids in dealer_administrators
  ☐ Done!

Assigning COMMUNITY scope:
  ☐ Create profile_role with scope_type = 'community'
  ☐ Set scope_community_ids = array of community IDs
  ☐ Create community_manager record(s)
  ☐ Link to each community
  ☐ Done!

Assigning PROPERTY scope:
  ☐ Create profile_role with scope_type = 'property'
  ☐ Set scope_property_ids = array of property IDs
  ☐ Create property_owner record(s)
  ☐ Link to each property
  ☐ Set def_property_id in profile (recommended)
  ☐ Done!
```

---

## 🔍 Scope Troubleshooting

### Problem: User can't see expected data

```
Diagnosis Steps:
  1. Check scope_type is correct
     └─ SELECT scope_type FROM profile_role WHERE profile_id = 'user-uuid'

  2. Check scope fields are populated
     └─ Global: No fields needed
     └─ Dealer: scope_dealer_id should = user's UUID
     └─ Community: scope_community_ids should be array with IDs
     └─ Property: scope_property_ids should be array with IDs

  3. Check relationship tables
     └─ Dealer: dealer_administrators should exist
     └─ Community: community_manager should exist
     └─ Property: property_owner should exist

  4. Check RLS policies
     └─ Verify policies exist for this table
     └─ Verify policies check scope correctly
```

### Problem: Scope too broad

```
Solution:
  1. Review scope_*_ids arrays
  2. Remove unnecessary community/property IDs
  3. Update relationship tables to match
  4. Consider splitting into multiple users if needed
```

### Problem: Scope too narrow

```
Solution:
  1. Add additional IDs to scope_*_ids arrays
  2. Create corresponding relationship records
  3. Verify user can now access expected data
```

---

## 📚 Complete Scope Documentation

For more details, see:
- **[Scope System Guide](./SCOPE_SYSTEM_GUIDE.md)** - Complete technical reference
- **[Community-User-Property Guide](./COMMUNITY_USER_PROPERTY_GUIDE.md)** - How entities relate
- **[Data Model Workflows](./DATA_MODEL_WORKFLOWS.md)** - Practical SQL examples
- **[RBAC Guide](./RBAC_GUIDE.md)** - Role-based permissions

---

**You now understand ALL 4 scopes in the PortunCmd system!** 🎉

| Scope | Who | Access |
|-------|-----|--------|
| 1️⃣ Global | Super Admin | Everything |
| 2️⃣ Dealer | Dealer | Their communities |
| 3️⃣ Community | Admin/Guard | Specific communities |
| 4️⃣ Property | Resident | Their properties |
