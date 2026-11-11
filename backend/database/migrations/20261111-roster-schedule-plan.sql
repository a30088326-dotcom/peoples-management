-- Add the planner document to the existing roster table. Run once for a MySQL database.
-- Existing legacy rosters retain NULL. DynamoDB uses the same attribute without DDL.
ALTER TABLE attendance_roster_groups ADD COLUMN schedulePlan JSON NULL;
