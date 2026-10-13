-- Append-only guards: history is immutable in Rzilient.
-- Corrections are made by inserting corrective events, never by rewriting rows.

-- Function: block any UPDATE or DELETE on append-only tables
CREATE OR REPLACE FUNCTION rzilient_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only: rows cannot be updated or deleted', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- Function: block hard deletes on records that must be archived, never removed
CREATE OR REPLACE FUNCTION rzilient_no_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % does not allow hard deletes: archive records instead', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asset_transaction_append_only
  BEFORE UPDATE OR DELETE ON "AssetTransaction"
  FOR EACH ROW EXECUTE FUNCTION rzilient_append_only();

CREATE TRIGGER trg_inventory_transaction_append_only
  BEFORE UPDATE OR DELETE ON "InventoryTransaction"
  FOR EACH ROW EXECUTE FUNCTION rzilient_append_only();

CREATE TRIGGER trg_audit_log_append_only
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION rzilient_append_only();

CREATE TRIGGER trg_asset_no_delete
  BEFORE DELETE ON "Asset"
  FOR EACH ROW EXECUTE FUNCTION rzilient_no_delete();

CREATE TRIGGER trg_asset_assignment_no_delete
  BEFORE DELETE ON "AssetAssignment"
  FOR EACH ROW EXECUTE FUNCTION rzilient_no_delete();
